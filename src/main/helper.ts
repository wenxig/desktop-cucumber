import type { On } from "@preload/type"
import { protocol, type Privileges, type WebContents } from "electron"
import { platform } from "@electron-toolkit/utils"
import icon from "../../resources/iconWhite.png?asset"
import macTrayIcon from "../../resources/iconTemplate@2x.png?asset"
import { Menu, Tray } from "electron/main"
import fs from "fs/promises"
import type { AnyFn } from "@vueuse/core"
import { RefValue } from "./ipc"
export const alertMessage = <T extends keyof On['event']>(win: WebContents, event: T, ...args: On['event'][T]) => win.send(event, ...args)



export class TrayMenu {
  public menu: RefValue<(Electron.MenuItemConstructorOptions | Electron.MenuItem)[]>
  public tray: Tray
  constructor(menu: Array<(Electron.MenuItemConstructorOptions) | (Electron.MenuItem)>) {
    this.menu = new RefValue(menu)
    this.tray = new Tray(platform.isMacOS ? macTrayIcon : icon)
    this.reload()
    this.tray.setToolTip(__APP_NAME__)
    this.tray.addListener('click', () => {
      this.tray.popUpContextMenu()
    })
    this.menu.watch(() => this.reload())
  }
  public reload() {
    const contextMenu = Menu.buildFromTemplate(this.menu.value)
    this.tray.setContextMenu(contextMenu)
  }
}

export namespace FsHelper {
  export const isExists = async (path: string) => {
    try {
      await fs.access(path, fs.constants.W_OK | fs.constants.R_OK)
    } catch {
      return false
    }
    return true
  }
  export const readJsonFile = async <T extends object>(path: string, encoding: BufferEncoding = 'utf-8'): Promise<T> => JSON.parse((await fs.readFile(path)).toString(encoding))
}


const unprocessedErrorSymbol = Symbol('unprocessedError')
export const tryRun = <T extends AnyFn>(fn: T, handleError: (err: Error) => ReturnType<T>): ReturnType<T> => {
  try {
    return fn()
  } catch (error) {
    if (!(error instanceof Error)) throw error
    if (error[unprocessedErrorSymbol]) throw error
    try {
      return handleError(error)
    } catch (error) {
      if (!(error instanceof Error)) throw error
      throw error[unprocessedErrorSymbol] = true && error
    }
  }
}

export const useProtocolProxy = (v: [schema: string, handler: (path: string, request: GlobalRequest) => (GlobalResponse) | (Promise<GlobalResponse>), config?: Privileges][]) => {
  protocol.registerSchemesAsPrivileged(v.map(v => ({
    scheme: v[0],
    privileges: {
      supportFetchAPI: true,
      stream: true,
      allowServiceWorkers: true,
      corsEnabled: false,
      standard: true,
      secure: true,
      bypassCSP: true,
      codeCache: false,
      ...(v[2] ?? {})
    },
  })))
  return () => {
    for (const row of v) {
      protocol.handle(row[0], request => row[1](decodeURIComponent(request.url.slice(`${row[0]}://`.length)), request))
    }
  }
}