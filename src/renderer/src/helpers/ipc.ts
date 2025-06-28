import { onUnmounted, ref, watch, type Ref } from "vue"
import mitt from 'mitt'
import type { InjectFunctionType, SharedValueType } from "@preload/type"

const sharedValueLocal = mitt<{
  changed: [name: string, value: SharedValue<any>]
}>()
export class SharedValue<T extends keyof SharedValueType, VT = SharedValueType[T]> {
  private _value: VT
  public destroy: () => void
  constructor(public readonly name: T) {
    this._value = window.inject.sharedValue.boot<VT>(name)
    const stopSync = window.inject.sharedValue.watch<VT>(name, value => {
      this.value = value
    })
    const handleLocalSync = ([name, value]: [name: string, value: SharedValue<any>]) => {
      if (name != this.name || value == this) return
      this._value = value.value
      this.mitt.emit('watch', value.value)
    }
    sharedValueLocal.on('changed', handleLocalSync)
    this.destroy = () => {
      try {
        stopSync()
        sharedValueLocal.off('changed', handleLocalSync)
      } catch (error) {
        console.warn(`Shared value was destroyed. (${name})`)
        console.warn(error)
      }
    }
  }
  public toRef() {
    const v = ref(this._value)
    const stopRawWatch = this.watch(val => v.value = val)
    const stopWatch = watch(v, (v, ov) => {
      if (v == ov) return
      this.value = v
    }, { deep: true })
    onUnmounted(() => {
      stopWatch()
      stopRawWatch()
      this.destroy()
    })
    return v as Ref<VT, VT>
  }
  get value() {
    return this._value
  }
  set value(v) {
    if (this._value == v) return
    this._value = v
    this.update()
  }
  public set(f: (v: VT) => VT) {
    this._value = f(this._value)
    this.update()
  }
  private update() {
    this.mitt.emit('watch', this._value)
    sharedValueLocal.emit('changed', [this.name, this])
    window.inject.sharedValue.sync(this.name, this._value)
  }
  private mitt = mitt<{
    watch: VT
  }>()
  public watch(fn: (v: VT) => void) {
    this.mitt.on('watch', fn)
    return () => this.mitt.off('watch', fn)
  }
}


export class InjectFunction<T extends keyof InjectFunctionType, FT extends (...args: any) => any = InjectFunctionType[T]> {
  constructor(public readonly name: T) { }
  public sync(...p: Parameters<FT>): ReturnType<Awaited<FT>> {
    const r = window.inject.injectFunction.sync(this.name, p)
    if (r.isError) throw r.result
    return r.result
  }
  public async call(...p: Parameters<FT>): Promise<ReturnType<FT>> {
    const r = await window.inject.injectFunction.call(this.name, p)
    if (r.isError) throw r.result
    return r.result
  }
  public static from<T extends keyof InjectFunctionType, FT extends (...args: any) => any = InjectFunctionType[T]>(name: T) {
    const injectFunction = new InjectFunction(name)
    return (...p: Parameters<FT>) => injectFunction.call(...p)
  }
  public static fromSync<T extends keyof InjectFunctionType, FT extends (...args: any) => any = InjectFunctionType[T]>(name: T) {
    const injectFunction = new InjectFunction(name)
    return (...p: Parameters<FT>) => injectFunction.sync(...p)
  }
}
