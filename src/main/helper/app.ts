import { platform } from "@electron-toolkit/utils"
import { RefValue } from "./ipc"
import type { On } from "@preload/type"
import icon from "../../../resources/iconWhite.png?asset"
import macTrayIcon from "../../../resources/iconTemplate@2x.png?asset"
import { WebContents, Tray, Menu, Privileges, protocol } from "electron"

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
      protocol.handle(row[0], request => row[1](request.url.slice(`${row[0]}://`.length), request))
    }
  }
}