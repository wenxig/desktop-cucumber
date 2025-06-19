import { app, shell, BrowserWindow, protocol, net, screen, Tray, Menu, globalShortcut } from "electron"
import { join } from "path"
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
import icon from "../../resources/icon.png?asset"
import iconTemplate from "../../resources/iconTemplate@2x.png?asset"
import url from "url"
import { alertMessage, handleMessage } from "./helper"
import { windowManager, type Window } from 'node-window-manager'
protocol.registerSchemesAsPrivileged([
  {
    scheme: "atom",
    privileges: {
      supportFetchAPI: true,
    },
  },
])

function createWindow() {
  const displayBounds = screen.getPrimaryDisplay().bounds

  const win = new BrowserWindow({
    ...displayBounds,
    show: false,
    title: '黄瓜桌面挂件',
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
    roundedCorners: false,
    movable: false,         // ❌ 禁止移动窗口
    resizable: false,       // ❌ 禁止调整大小
    maximizable: false,     // ❌ 禁止最大化
  })
  win.setIgnoreMouseEvents(true, { forward: true })
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setAlwaysOnTop(true, 'screen-saver', Number.MAX_VALUE)
  win.on("ready-to-show", () => {
    win.show()
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: "deny" }
  })
  win.on('hide', () => {
    win.setOpacity(0)
    win.webContents.send('workspace-changed', 'hide')
  })
  win.on('show', () => {
    win.setOpacity(1)
    win.webContents.send('workspace-changed', 'show')
  })
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"])
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"))
  }
  return win
}
let tray: Tray | undefined
app.whenReady().then(() => {
  const displayBounds = screen.getPrimaryDisplay().bounds
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
    app.dock.hide()
  }
  const win = createWindow()
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
  tray = new Tray(process.platform === 'darwin' ? iconTemplate : icon)
  let editMode = false
  const contextMenu = Menu.buildFromTemplate([{
    label: 'DevTool', type: 'normal', click: () => {
      win.webContents.openDevTools()
    }
  }, {
    label: '编辑', type: 'normal', click: () => {
      editMode = !editMode
      changeEditMode()
      alertMessage(win.webContents, 'edit-mode-changed', editMode)
    }
  }, {
    label: '退出', type: 'normal', click: () => {
      app.quit()
    }
  }])
  tray.setToolTip('黄瓜桌面挂件')
  tray.setContextMenu(contextMenu)
  tray.addListener('click', () => {
    if (tray) tray.popUpContextMenu()
  })
  const changeEditMode = () => {
    console.log('editMode changed', editMode)
    if (editMode) {
      win.setIgnoreMouseEvents(false)
      win.setFocusable(true)
      win.focus()
    } else {
      win.setFocusable(false)
      win.setIgnoreMouseEvents(true, { forward: true })
    }
  }
  handleMessage({
    changeEditMode(to) {
      editMode = to
      changeEditMode()
    },
  })

  if (process.platform == 'win32') {
    const checkWindow = (w: Window) => {
      const windowb = w.getBounds()
      if (!w.isWindow() || !w.isVisible() || w.path.startsWith('C:\\Windows') || !windowb.height || !w.getTitle()) return
      if (windowb.x != 0 || windowb.height < displayBounds.height) return
      if (w.id != windowManager.getActiveWindow().id) return
      if (w.processId == process.pid || w.processId == process.ppid) return
      console.log('fullscreen report', displayBounds, 'with', windowb)
      console.log('                   ', w.path, '|', w.id, '|', w.processId, w.getTitle())
      return true
    }
    const checkAndSend = (w: Window) => {
      if (!checkWindow(w)) {
        win.setBounds(displayBounds)
        alertMessage(win.webContents, 'full-screen-changed', false)
        return
      }
      win.setBounds(displayBounds)
      alertMessage(win.webContents, 'full-screen-changed', true)
    }
    handleMessage({
      tiggerTaskBarHideStatue() {
        windowManager.emit('window-activated', windowManager.getActiveWindow())
      },
    })
    setInterval(() => windowManager.emit('window-activated', windowManager.getActiveWindow()), 10000)
    windowManager.addListener('window-activated', checkAndSend)
  }

  let isTouchMode = false
  globalShortcut.register('shift+alt+e', () => {
    isTouchMode = !isTouchMode
    changeTouchMode()
    alertMessage(win.webContents, 'touch-mode-changed', isTouchMode)
  })
  handleMessage({
    changeTouchMode(to) {
      isTouchMode = to
      changeTouchMode()
    },
  })
  const changeTouchMode = () => {
    console.log('touchMode changed', isTouchMode)
    if (isTouchMode) {
      win.setIgnoreMouseEvents(false)
      win.setFocusable(true)
      win.focus()
    } else {
      win.setFocusable(false)
      win.setIgnoreMouseEvents(true, { forward: true })
    }
  }
})
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})
