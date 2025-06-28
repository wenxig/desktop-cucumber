import { onUnmounted, ref, watch, type Ref } from "vue"
import mitt from 'mitt'
import type { SharedValueType } from "@preload/type"

const sharedValueLocal = mitt<{
  changed: [name: string, value: SharedValue<any>]
}>()
export class SharedValue<T extends keyof SharedValueType> {
  private _value: SharedValueType[T]
  public destroy: () => void
  constructor(public readonly name: T) {
    this._value = window.inject.sharedValue.boot<SharedValueType[T]>(name)
    const stopSync = window.inject.sharedValue.watch<SharedValueType[T]>(name, value => {
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
    return v as Ref<SharedValueType[T], SharedValueType[T]>
  }
  get value() {
    return this._value
  }
  set value(v) {
    this._value = v
    this.sync()
  }
  public set(f: (v: SharedValueType[T]) => SharedValueType[T]) {
    this.value = f(this._value)
  }
  private sync() {
    this.mitt.emit('watch', this._value)
    sharedValueLocal.emit('changed', [this.name, this])
    window.inject.sharedValue.sync(this.name, this._value)
  }
  private mitt = mitt<{
    watch: SharedValueType[T]
  }>()
  public watch(fn: (v: SharedValueType[T]) => void) {
    this.mitt.on('watch', fn)
    return () => this.mitt.off('watch', fn)
  }
}