import { contextBridge, ipcRenderer } from "electron"
import { Inject } from "./type"
const sendMessage = <T extends keyof Inject["api"]>(name: T, ...arg: Parameters<Inject["api"][T]>) => ipcRenderer.invoke(name, ...arg) as ReturnType<Inject["api"][T]>
// Custom APIs for renderer
const api: Inject["api"] = {
  fs_ls(dirPath) {
    return sendMessage('fs_ls', dirPath)
  },
  fs_read(path) {
    return sendMessage('fs_read', path)
  },
  fs_remove(oldPath) {
    return sendMessage('fs_remove', oldPath)
  },
  fs_rename(oldPath, newPath) {
    return sendMessage('fs_rename', oldPath, newPath)
  },
  compressImage(imgPath) {
    return sendMessage('compressImage', imgPath)
  },
  downloadFile(imgUrl, toFilePath) {
    return sendMessage('downloadFile', imgUrl, toFilePath)
  },
}


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
