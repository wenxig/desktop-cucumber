import { onUnmounted, ref, triggerRef, watch, type Ref } from "vue"
import mitt from 'mitt'
import type { InjectFunctionType, SharedValueType } from "@preload/type"
import { isFunction, isObject } from "lodash-es"
import { toRaw } from "vue"

const sharedValueLocal = mitt<{
  changed: [name: string, value: SharedValue<any>]
}>()
export class SharedValue<T extends keyof SharedValueType, VT = SharedValueType[T]> {
  private _value: VT
  public destroy: () => void
  constructor(public readonly name: T) {
    this._value = window.inject.sharedValue.boot<VT>(name)
    const stopSync = window.inject.sharedValue.watch<VT>(name, value => {
      console.log('[ShareValue] been sync', this.name, this.value, '->', value)
      this.value = value
    })
    const handleLocalSync = ([name, value]: [name: string, value: SharedValue<any>]) => {
      if (name != this.name || value == this) return
      console.log('[ShareValue] handleLocalSync', this.name, this.value, '->', value.value)
      this._value = value.value
      this.mitt.emit('watch', value.value)
    }
    sharedValueLocal.on('changed', handleLocalSync)
    this.destroy = () => {
      console.log('[ShareValue] destroy', this.name)
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
    let isTrigger = false
    const stopRawWatch = this.watch(val => {
      v.value = val
      isTrigger = true
      triggerRef(v)
      console.log('[ShareValue.toRef]', this.name, 'this.watch triggered:', val)
    })
    const watcher = watch(v, v => {
      if (isTrigger) return isTrigger = false
      console.log('[ShareValue.toRef]', this.name, 'vue.watch triggered:', v)
      this.value = v
    }, { deep: true })
    onUnmounted(() => {
      watcher.stop()
      stopRawWatch()
    })
    return v as Ref<VT, VT>
  }
  get value() {
    return this._value
  }
  set value(v) {
    if (!isObject(v) && !isFunction(v)) if (this._value == v) return
    console.log('[ShareValue] setter value', this.name, v)
    this._value = toRaw(v)
    this.update()
  }
  public set(f: (v: VT) => VT) {
    this._value = f(this._value)
    console.log('[ShareValue] set() value', this.name, this._value)
    this.update()
  }
  private update() {
    console.log('[ShareValue] update', this.name, this._value)
    window.inject.sharedValue.sync(this.name, this._value)
    this.mitt.emit('watch', this._value)
    sharedValueLocal.emit('changed', [this.name, this])
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
    const r = window.inject.injectFunction.sync(this.name, ...p)
    if (r.isError) throw r.result
    return r.result
  }
  public async call(...p: Parameters<FT>): Promise<ReturnType<FT>> {
    const r = await window.inject.injectFunction.call(this.name, ...p)
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
