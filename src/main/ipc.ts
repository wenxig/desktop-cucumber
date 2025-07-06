import { SharedValueType, InjectFunctionType, InjectFunctionResult } from "@preload/type"
import { AnyFn } from "@vueuse/core"
import { ipcMain, IpcMainEvent, IpcMainInvokeEvent } from "electron"
import { isObject, isFunction } from "lodash-es"
import mitt from "mitt"
import { WindowManager } from "./windowManager"

export class RefValue<T> {
  constructor(protected _value: T) { }
  public get value() {
    return this._value
  }
  public set value(v) {
    if (!isObject(v) && !isFunction(v)) if (this._value == v) return
    console.log('[RefValue] setter value', this._value, '->', v)
    this._value = v
    this.update()
  }
  public update() {
    this.mitt.emit('watch', this._value)
  }
  public async set(f: (v: T) => T | Promise<T>) {
    console.log('[RefValue] set() value')
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
      if (!isObject(value) && !isFunction(value)) if (this._value == value) return
      console.log('[SharedValue]', name, 'handleValueChange', value)
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
      console.log('[SharedValue]', name, 'handleLocalSync', value)
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
    console.log('[SharedValue]', this.name, 'update', this._value)
    super.update()
    sharedValueLocal.emit('changed', [this.name, this])
    WindowManager.each(win => {
      win.webContents.send(`_sync_value_${this.name}_watch_`, this._value)
    })
  }
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
  public static inject<K extends keyof InjectFunctionType>(name: K) {
    return <T extends string>(c: Record<T, InjectFunctionType[K]>, key: T) => {
      InjectFunction.from(name, c[key])
    }
  }
}