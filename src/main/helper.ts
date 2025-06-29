import type { On, InjectFunctionResult, InjectFunctionType, SharedValueType } from "@preload/type"
import { ipcMain, type IpcMainEvent, type IpcMainInvokeEvent, type WebContents } from "electron"
import mitt from "mitt"
import { platform } from "@electron-toolkit/utils"
import icon from "../../resources/iconWhite.png?asset"
import macTrayIcon from "../../resources/iconTemplate@2x.png?asset"
import { Menu, Tray } from "electron/main"
import { WindowManager } from "./windowManager"
import fs from "fs/promises"
import type { AnyFn } from "@vueuse/core"
export const alertMessage = <T extends keyof On['event']>(win: WebContents, event: T, ...args: On['event'][T]) => win.send(event, ...args)



export class RefValue<T> {
  constructor(protected _value: T) { }
  get value() {
    return this._value
  }
  set value(v) {
    if (this._value == v) return
    this._value = v
    this.update()
  }
  public update() {
    this.mitt.emit('watch', this._value)
  }
  public async set(f: (v: T) => T | Promise<T>) {
    this.value = await f(this._value)
    this.update()
  }
  protected mitt = mitt<{
    watch: T
  }>()
  public watch(fn: (v: T) => void) {
    this.mitt.on('watch', fn)
    return () => this.mitt.off('watch', fn)
  }
}

const sharedValueLocal = mitt<{
  changed: [name: string, value: SharedValue<any>]
}>()
export class SharedValue<T extends keyof SharedValueType, VT extends SharedValueType[T] = SharedValueType[T]> extends RefValue<VT> {
  public destroy: () => void
  constructor(public readonly name: T, _value: SharedValueType[T]) {
    super(<VT>_value)
    const handleValueChange = (_e: any, value: VT) => {
      if (this._value == value) return
      this._value = value
      this.mitt.emit('watch', this._value)
    }
    const channel = `_sync_value_${name}_`
    ipcMain.handle(channel, handleValueChange)

    const handleValueBoot = (e: IpcMainEvent) => e.returnValue = this._value
    const bootChannel = `${channel}boot_`
    ipcMain.addListener(bootChannel, handleValueBoot)


    const handleLocalSync = ([name, value]: [name: string, value: SharedValue<any>]) => {
      if (name != this.name || value == this) return
      this._value = value.value
      this.mitt.emit('watch', value.value)
    }
    sharedValueLocal.on('changed', handleLocalSync)

    this.destroy = () => {
      ipcMain.removeHandler(channel)
      ipcMain.removeListener(bootChannel, handleValueBoot)
      this.mitt.all.clear()
      sharedValueLocal.off('changed', handleLocalSync)
    }
  }
  public override update() {
    this.mitt.emit('watch', this._value)
    sharedValueLocal.emit('changed', [this.name, this])
    WindowManager.each(win => {
      win.webContents.send(`_sync_value_${this.name}_watch_`, this._value)
    })
  }
}
export class TrayMenu {
  public menu: RefValue<(Electron.MenuItemConstructorOptions | Electron.MenuItem)[]>
  public tray: Tray
  constructor(menu: Array<(Electron.MenuItemConstructorOptions) | (Electron.MenuItem)>) {
    this.menu = new RefValue(menu)
    this.tray = new Tray(platform.isMacOS ? macTrayIcon : icon)
    this.reload()
    this.tray.setToolTip(__APP_NAME__)
    this.tray.addListener('click', () => {
      this.tray.popUpContextMenu()
    })
    this.menu.watch(() => this.reload())
  }
  public reload() {
    const contextMenu = Menu.buildFromTemplate(this.menu.value)
    this.tray.setContextMenu(contextMenu)
  }
}

export namespace FsHelper {
  export const isExists = async (path: string) => {
    try {
      await fs.access(path, fs.constants.W_OK | fs.constants.R_OK)
    } catch {
      return false
    }
    return true
  }
  export const readJsonFile = async <T extends object>(path: string, encoding: BufferEncoding = 'utf-8'): Promise<T> => JSON.parse((await fs.readFile(path)).toString(encoding))
}

export class InjectFunction<T extends keyof InjectFunctionType, FT extends AnyFn = InjectFunctionType[T]> {
  public destroy: () => void
  constructor(public readonly name: T, protected fun: FT) {
    const channel = `_call_function_${name}_`
    const handleCallFunction = async (_e: IpcMainInvokeEvent, p: Parameters<FT>): Promise<InjectFunctionResult<ReturnType<FT>>> => {
      console.log(channel, p)
      try {
        return {
          isError: false,
          result: await fun(...p)
        }
      } catch (error) {
        return {
          isError: true,
          result: error
        }
      }
    }
    ipcMain.handle(channel, handleCallFunction)

    const channelSync = `_call_function_sync_${name}_`
    const handleCallFunctionSync = async (e: IpcMainEvent, p: Parameters<FT>): Promise<InjectFunctionResult<ReturnType<FT>>> => {
      console.log(channelSync, p)
      try {
        return e.returnValue = {
          isError: false,
          result: await fun(...p)
        }
      } catch (error) {
        return e.returnValue = {
          isError: true,
          result: error
        } as const
      }
    }
    ipcMain.addListener(channelSync, handleCallFunctionSync)

    this.destroy = () => {
      ipcMain.removeHandler(channel)
      ipcMain.removeListener(channelSync, handleCallFunctionSync)
    }
  }
  public static from<T extends keyof InjectFunctionType, FT extends InjectFunctionType[T] = InjectFunctionType[T]>(name: T, fun: FT) {
    new InjectFunction(name, fun)
    return fun
  }
}

const unprocessedErrorSymbol = Symbol('unprocessedError')
export const tryRun = <T extends AnyFn>(fn: T, handleError: (err: Error) => ReturnType<T>): ReturnType<T> => {
  try {
    return fn()
  } catch (error) {
    if (!(error instanceof Error)) throw error
    if (error[unprocessedErrorSymbol]) throw error
    try {
      return handleError(error)
    } catch (error) {
      if (!(error instanceof Error)) throw error
      throw error[unprocessedErrorSymbol] = true && error
    }
  }
}