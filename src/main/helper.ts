import { isFunction, toPairs } from "lodash-es"
import { Inject, On } from "../preload/type"
import { ipcMain, type BrowserWindow, type IpcMainEvent, type WebContents } from "electron"
import mitt from "mitt"
import { platform } from "@electron-toolkit/utils"
import icon from "../../resources/iconWhite.png?asset"
import macTrayIcon from "../../resources/iconTemplate@2x.png?asset"
import { Menu, Tray } from "electron/main"
import { WindowManager } from "./windowManager"
import fs from "fs/promises"
export const handleMessage = (
  list: Partial<{
    [K in keyof Inject['api']]: (...args: Parameters<Inject['api'][K]>) => Awaited<ReturnType<Inject['api'][K]>> | ReturnType<Inject['api'][K]>
  }>
) => {
  const pairs = toPairs(list)
  for (const pair of pairs) {
    ipcMain.handle(pair[0], (_e, ...arg) => (pair[1] as any)(...arg))
  }
}
export const alertMessage = <T extends keyof On['event']>(win: WebContents, event: T, ...args: On['event'][T]) => win.send(event, ...args)

export class SharedValue<T> {
  public destroy: () => void
  constructor(private _value: T, public readonly name: string) {
    const handleValueChange = (_e: any, value: T) => {
      if (this._value == value) return
      this._value = value
      this.mitt.emit('watch', this._value)
    }
    const channel = `_sync_value_${name}_`
    ipcMain.handle(channel, handleValueChange)

    const handleValueBoot = (e: IpcMainEvent) => e.returnValue = this._value
    const bootChannel = `${channel}boot_`
    ipcMain.addListener(bootChannel, handleValueBoot)

    this.destroy = () => {
      ipcMain.removeHandler(channel)
      ipcMain.removeListener(bootChannel, handleValueBoot)
      this.mitt.all.clear()
    }
  }
  get value() {
    return this._value
  }
  set value(v) {
    if (this._value == v) return
    this._value = v
    this.update()
  }
  public set(f: (v: T) => T) {
    this.value = f(this._value)
  }
  public update() {
    WindowManager.each(win => {
      win.webContents.send(`_sync_value_${this.name}_watch_`, this._value)
    })
    this.mitt.emit('watch', this._value)
  }
  private mitt = mitt<{
    watch: T
    boot: undefined
  }>()
  public watch(fn: (v: T) => void) {
    this.mitt.on('watch', fn)
    return () => this.mitt.off('watch', fn)
  }
  public beforeBoot(fn: () => void) {
    this.mitt.on('boot', fn)
    return () => this.mitt.off('boot', fn)
  }
}

export class RefValue<T> {
  constructor(private _value: T) { }
  get value() {
    return this._value
  }
  set value(v) {
    if (this._value == v) return
    this._value = v
    this.mitt.emit('watch', v)
  }
  public update() {
    this.mitt.emit('watch', this._value)
  }
  public set(f: (v: T) => T) {
    this.value = f(this._value)
  }
  private mitt = mitt<{
    watch: T
  }>()
  public watch(fn: (v: T) => void) {
    this.mitt.on('watch', fn)
    return () => this.mitt.off('watch', fn)
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