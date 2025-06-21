import { get, isFunction, toPairs } from "lodash-es"
import { Inject, On } from "../preload/type"
import { ipcMain, type BrowserWindow, type IpcMainEvent, type WebContents } from "electron"
import mitt from "mitt"
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
  constructor(private _value: T, public readonly name: string, private window: ElectronWindowManager) {
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
      console.log(`sharedValue send`, `"_sync_value_${this.name}_watch_"`, this._value)
    })
    this.mitt.emit('watch', this._value)
  }
  private mitt = mitt<{
    watch: T
  }>()
  public watch(fn: (v: T) => void) {
    this.mitt.on('watch', fn)
    return () => this.mitt.off('watch', fn)
  }
}

export class ElectronWindowManager {
  public windows = new Set<BrowserWindow>()
  public add(win: BrowserWindow) {
    this.windows.add(win)
    win.once('closed', () => {
      this.windows.delete(win)
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
    for (const win of this.windows) {
      fn(win)
    }
  }
  public each(f: (v: BrowserWindow) => void) {
    for (const win of this.windows) {
      f(win)
    }
  }
  public alertMessage<T extends keyof On['event']>(event: T, ...args: On['event'][T]) {
    this.each(win => alertMessage(win.webContents, event, ...args))
  }
}