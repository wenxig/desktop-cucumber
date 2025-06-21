import { isFunction } from "lodash-es"
import { MessageReactive, MessageOptions } from "naive-ui"
import { type MaybeRefOrGetter, type VNodeChild, computed, isRef, watch } from "vue"
import { delay } from "./delay"

export const createLoadingMessage = (text: MaybeRefOrGetter<string> = '加载中', api = window.$message) => {
  const data = computed(() => isRef(text) ? text.value : isFunction(text) ? text() : text)
  let loading = api.loading(data.value, {
    duration: 0,
  })
  const stop = watch(data, text => {
    loading.content = text
  })
  let isDestroy = false
  async function bind<T extends Promise<any>>(promise?: T, throwError?: false, successText?: string, failText?: string): Promise<Awaited<T>>
  async function bind<T extends Promise<any>>(promise?: T, throwError?: true, successText?: string, failText?: string): Promise<Awaited<T> | undefined>
  async function bind<T extends Promise<any>>(promise?: T, throwError = true, successText?: string, failText?: string): Promise<Awaited<T> | undefined> {
    try {
      const res = await promise
      ctx.success(successText)
      return res
    } catch (error) {
      ctx.fail(failText)
      if (throwError)
        throw error
      return <any>undefined
    }
  }
  const ctx = {
    bind,
    async success(text = "成功！", delayTime = 500) {
      stop()
      if (isDestroy || !loading) return
      isDestroy = true
      loading.type = 'success'
      loading.content = text
      await delay(delayTime)
      loading.destroy()
    },
    async fail(text = "失败！", delayTime = 500) {
      stop()
      if (isDestroy || !loading) return
      isDestroy = true
      loading.type = 'error'
      loading.content = text
      await delay(delayTime)
      loading.destroy()
    },
    async info(text: string, delayTime = 500) {
      stop()
      if (isDestroy || !loading) return
      isDestroy = true
      loading.type = 'info'
      loading.content = text
      await delay(delayTime)
      loading.destroy()
    },
    destroy() {
      stop()
      if (isDestroy || !loading) return
      isDestroy = true
      loading.destroy()
    },
    [Symbol.dispose]() {
      this.destroy()
    },
    instance: loading
  }
  return ctx
}

export type RawMessage = [content: string | (() => VNodeChild), config?: MessageOptions]
export const createMessageStore = <T extends string>(messages: [T, RawMessage][], api = window.$message) => {
  const msgs = {} as Record<T, MessageReactive>
  const showSome = (messages: [T, RawMessage][]) => {
    for (const [key, [content, config]] of messages) {
      const _config: MessageOptions = {
        type: 'info',
        ...(config ?? {}),
        duration: 0,
      }
      msgs[key] = api.create(content, _config)
    }
  }
  return {
    showAll() {
      showSome(messages)
    },
    closeAll() {
      for (const key in msgs) {
        if (!Object.prototype.hasOwnProperty.call(msgs, key)) continue
        const msg = msgs[key]
        msg.destroy()
      }
    },
    showSome(keys: T[]) {
      showSome(messages.filter(row => keys.includes(row[0])))
    },
    closeSome(keys: T[]) {
      for (const key in msgs) {
        if (!Object.prototype.hasOwnProperty.call(msgs, key)) continue
        if (!keys.includes(key)) continue
        const msg = msgs[key]
        msg.destroy()
      }
    }
  }
}