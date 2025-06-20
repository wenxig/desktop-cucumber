import { app, shell, BrowserWindow, protocol, net, screen, Tray, Menu, globalShortcut } from "electron"
import { join } from "path"
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
import icon from "../../resources/icon.png?asset"
import iconTemplate from "../../resources/iconTemplate@2x.png?asset"
import url from "url"
import { ElectronWindowManager, handleMessage, SharedValue } from "./helper"
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
app.whenReady().then(() => {
  const displayBounds = screen.getPrimaryDisplay().bounds
  protocol.handle("atom", (request) => {
    const filePath = decodeURIComponent(request.url.slice("atom://".length))
    console.log("[atom request]", filePath)
    return net.fetch(url.pathToFileURL(filePath).toString())
  })
  electronApp.setAppUserModelId("com.wenxig.desktoptop")
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  if (process.platform === 'darwin') {
    app.dock.hide()
  }
  const wins = new ElectronWindowManager()
  const isEditMode = new SharedValue(false, 'isEditMode', wins)
  const tray = new Tray(process.platform === 'darwin' ? iconTemplate : icon)
  const contextMenu = Menu.buildFromTemplate([{
    label: 'DevTool', type: 'normal', click: () => {
      wins.each(v => v.webContents.openDevTools())
    }
  }, {
    label: '编辑', type: 'normal', click: () => {
      isEditMode.value = !isEditMode.value
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
  isEditMode.watch((editMode) => {
    console.log('editMode changed', editMode)
    if (editMode) {
      wins.doSync('setIgnoreMouseEvents', false)
      wins.doSync('setFocusable', true)
      wins.doSync('focus')
    } else {
      wins.doSync('setFocusable', false)
      wins.doSync('setIgnoreMouseEvents', true, { forward: true })
    }
  })


  const isFullScreen = new SharedValue(false, 'isFullScreen', wins)
  if (process.platform == 'win32') {
    const checkWindow = (w: Window) => {
      const windowb = w.getBounds()
      if (!w.isWindow() || !w.isVisible() || w.path.startsWith('C:\\Windows') || !windowb.height || !w.getTitle()) return false
      if (windowb.x != 0 || windowb.height < displayBounds.height) return false
      if (w.id != windowManager.getActiveWindow().id) return false
      if (w.processId == process.pid || w.processId == process.ppid) return false
      console.log('fullscreen report', displayBounds, 'with', windowb)
      console.log('                   ', w.path, '|', w.id, '|', w.processId, w.getTitle())
      return true
    }
    isFullScreen.watch(()=>{
      wins.doSync('setBounds', displayBounds)
    })
    handleMessage({
      tiggerTaskBarHideStatue(){
        windowManager.emit('window-activated', windowManager.getActiveWindow())
      }
    })
    setInterval(() => windowManager.emit('window-activated', windowManager.getActiveWindow()), 5000)
    windowManager.addListener('window-activated', win => {
      isFullScreen.value = checkWindow(win)
    })
  }

  const isTouchMode = new SharedValue(false, 'isTouchMode', wins)
  globalShortcut.register('shift+alt+e', () => {
    isTouchMode.value = !isTouchMode.value
  })
  isTouchMode.watch((isTouchMode) => {
    console.log('touchMode changed', isTouchMode)
    if (isTouchMode) {
      wins.doSync('setIgnoreMouseEvents', false)
      wins.doSync('setFocusable', true)
      wins.doSync('focus')
    } else {
      wins.doSync('setFocusable', false)
      wins.doSync('setIgnoreMouseEvents', true, { forward: true })
    }
  })


  wins.add(createWindow())
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) wins.add(createWindow())
  })
})
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})
