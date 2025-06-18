import { toPairs } from "lodash-es"
import { Inject, On } from "../preload/type"
import { ipcMain, type WebContents } from "electron"
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


