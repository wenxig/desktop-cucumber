import { app, shell, BrowserWindow, protocol, net, screen } from "electron"
import { join } from "path"
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
import icon from "../../resources/icon.png?asset"
import url from "url"
import { handleMessage } from "./helper"
protocol.registerSchemesAsPrivileged([
  {
    scheme: "atom",
    privileges: {
      supportFetchAPI: true,
    },
  },
])

function createWindow(): void {
  const displays = screen.getAllDisplays()
  displays.forEach(d => {
    const win = new BrowserWindow({
      x: d.bounds.x,
      y: d.bounds.y,
      width: d.bounds.width,
      height: d.bounds.height,
      show: false,
      autoHideMenuBar: true,
      ...(process.platform === "linux" ? { icon } : {}),
      webPreferences: {
        preload: join(__dirname, "../preload/index.mjs"),
        sandbox: false,
      },
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      hasShadow: false,
      enableLargerThanScreen: true,
    })
    win.setIgnoreMouseEvents(true, { forward: true })  // 点击穿透同时转发鼠标移动事件 :contentReference[oaicite:1]{index=1}

    // 🧩 全屏与多桌面覆盖
    win.setIgnoreMouseEvents(true, { forward: true })
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    win.setAlwaysOnTop(true, 'screen-saver');
    
    win.on("ready-to-show", () => {
      win.show()
    })

    win.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: "deny" }
    })

    if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
      win.loadURL(process.env["ELECTRON_RENDERER_URL"])
    } else {
      win.loadFile(join(__dirname, "../renderer/index.html"))
    }
  })
}

app.whenReady().then(() => {
  protocol.handle("atom", (request) => {
    const filePath = decodeURIComponent(request.url.slice("atom://".length))
    console.log("[atom request]", filePath)
    return net.fetch(url.pathToFileURL(filePath).toString())
  })

  electronApp.setAppUserModelId("com.electron")

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  if (process.platform === 'darwin') {
    app.dock.hide()  // 隐藏 Dock 图标 :contentReference[oaicite:4]{index=4}
  }
  createWindow()

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
  handleMessage({
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})