import { onUnmounted, ref, watch, type Ref } from "vue"
import mitt from 'mitt'
export class SharedValue<T> {
  private _value: T
  public destroy: () => void
  constructor(public readonly name: string) {
    this._value = window.inject.sharedValue.boot<T>(name)
    const stopSync = window.inject.sharedValue.watch<T>(name, value => {
      this.value = value
    })
    this.destroy = () => {
      try {
        stopSync()
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
      this._value = v
      window.inject.sharedValue.sync(this.name, this._value)
      this.mitt.emit('watch', this._value)
    }, { deep: true })
    onUnmounted(() => {
      stopWatch()
      stopRawWatch()
      this.destroy()
    })
    return v as Ref<T, T>
  }
  get value() {
    return this._value
  }
  set value(v) {
    this._value = v
    this.sync()
  }
  public set(f: (v: T) => T) {
    this.value = f(this._value)
  }
  private sync() {
    window.inject.sharedValue.sync(this.name, this._value)
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