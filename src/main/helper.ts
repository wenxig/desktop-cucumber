import { toPairs } from "lodash-es"
import { Inject } from "../preload/type"
import { ipcMain } from "electron"
export const handleMessage = (
  list: {
    [K in keyof Inject['api']]: (...args: Parameters<Inject['api'][K]>) => Awaited<ReturnType<Inject['api'][K]>> | ReturnType<Inject['api'][K]>
  }
) => {
  const pairs = toPairs(list)
  for (const pair of pairs) {
    ipcMain.handle(pair[0], (_e, ...arg) => (pair[1] as any)(...arg))
  }
}