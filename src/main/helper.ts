import { isFunction, toPairs } from "lodash-es"
import { Inject, On } from "../preload/type"
import { ipcMain, type BrowserWindow, type IpcMainEvent, type WebContents } from "electron"
import mitt from "mitt"
import { platform } from "@electron-toolkit/utils"
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
  constructor(private _value: T, public readonly name: string, private window: WindowManager) {
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
    this.sync()
  }
  public set(f: (v: T) => T) {
    this.value = f(this._value)
  }
  private sync() {
    this.window.each(win => {
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

export class WindowManager {
  public windows = new Map<string, BrowserWindow>()
  public add(key: string, win: BrowserWindow) {
    this.windows.set(key, win)
    win.once('closed', () => {
      this.windows.delete(key)
    })
  }
  public doSync<
    K extends keyof BrowserWindow
  >(
    key: K,
    ...args: BrowserWindow[K] extends (...args: infer A) => any ? A : never
  ) {
    const fn = (win: BrowserWindow) => {
      const method = win[key]
      if (isFunction(method)) {
        (method as (...args: any[]) => any).apply(win, args)
      }
    }
    for (const win of this.windows.values()) {
      fn(win)
    }
  }
  public each(f: (v: BrowserWindow) => void) {
    for (const win of this.windows.values()) {
      f(win)
    }
  }
  public alertMessage<T extends keyof On['event']>(event: T, ...args: On['event'][T]) {
    this.each(win => alertMessage(win.webContents, event, ...args))
  }
}


import icon from "../../resources/iconWhite.png?asset"
import macTrayIcon from "../../resources/iconTemplate@2x.png?asset"
import { Menu, Tray } from "electron/main"
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