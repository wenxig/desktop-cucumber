import { contextBridge, ipcRenderer } from "electron"
import { Inject } from "./type"
const sendMessage = <T extends keyof Inject["api"]>(name: T, ...arg: Parameters<Inject["api"][T]>) => ipcRenderer.invoke(name, ...arg) as ReturnType<Inject["api"][T]>
// Custom APIs for renderer
const api: Inject["api"] = {
  changeEditMode(to) {
    return sendMessage('changeEditMode', to)
  },
}

const event: Inject['event'] = (e, cb) => {
  const handle = (_: any, ...agrs: Parameters<typeof cb>) => cb(...agrs)
  ipcRenderer.on(e, handle)
  return () => ipcRenderer.off(e, handle)
}
const inject: Inject = {
  api,
  event
}
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("inject", inject)
  } catch (error) {
    console.error(error)
  }
} else {
  //@ts-ignore
  window.inject = inject
}
