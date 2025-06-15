import { contextBridge, ipcRenderer } from "electron"
import { Inject } from "./type"
const sendMessage = <T extends keyof Inject["api"]>(name: T, ...arg: Parameters<Inject["api"][T]>) => ipcRenderer.invoke(name, ...arg) as ReturnType<Inject["api"][T]>
// Custom APIs for renderer
const api: Inject["api"] = {
  
}
ipcRenderer.on

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("api", api)
  } catch (error) {
    console.error(error)
  }
} else {
  //@ts-ignore
  window.api = api
}
