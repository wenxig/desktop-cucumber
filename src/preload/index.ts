import { contextBridge, ipcRenderer } from "electron"
import { Inject } from "./type"


const event: Inject['event'] = (e, cb) => {
  const handle = (_: any, ...agrs: Parameters<typeof cb>) => cb(...agrs)
  ipcRenderer.on(e, handle)
  return () => ipcRenderer.off(e, handle)
}




const inject: Inject = {
  api: (p, ...args) => {
    ipcRenderer.invoke(p, ...args)
  },
  sharedValue: {
    boot(name) {
      return ipcRenderer.sendSync(`_sync_value_${name}_boot_`)
    },
    sync(name, v) {
      return ipcRenderer.invoke(`_sync_value_${name}_`, v)
    },
    watch(name, cb) {
      const c = `_sync_value_${name}_watch_`
      console.log('sharedValue watch r', `_sync_value_${name}_watch_`)
      const handle = (_e: any, v: Parameters<typeof cb>[0]) => {
        console.log('sharedValue watch onValue', `_sync_value_${name}_watch_`, v)
        return cb(v)
      }
      ipcRenderer.on(c, handle)
      return () => ipcRenderer.off(c, handle)
    },
  },
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
