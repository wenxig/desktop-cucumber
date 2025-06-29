import type { BrowserWindow } from "electron"
import { isFunction } from "lodash-es"
import type { On } from "../preload/type"
import type { AnyFn } from "@vueuse/core"

export namespace WindowManager {
  export const windows = new Map<string, BrowserWindow>()
  export const add = (key: string, win: BrowserWindow) => {
    windows.set(key, win)
    win.once('closed', () => {
      try {
        windows.delete(key)
      } catch { }
    })
    win.once('close', () => {
      try {
        windows.delete(key)
      } catch { }
    })
  }
  export const doSync = <
    K extends keyof BrowserWindow
  >(
    key: K, ...args: BrowserWindow[K] extends AnyFn ? Parameters<BrowserWindow[K]> : never
  ) => {
    const fn = (win: BrowserWindow) => {
      const method = win[key]
      if (isFunction(method)) (method).apply(win, args)
    }
    for (const win of windows.values()) {
      fn(win)
    }
  }
  export const each = (f: (v: BrowserWindow) => void) => {
    for (const win of windows.values()) {
      f(win)
    }
  }
  export const alertMessage = <T extends keyof On['event']>(event: T, ...args: On['event'][T]) => {
    // @ts-ignore
    each(win => alertMessage(win.webContents, event, ...args))
  }
}