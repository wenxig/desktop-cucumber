import { app, shell, BrowserWindow, protocol, net, screen, globalShortcut } from "electron"
import { join } from "path"
import { electronApp, optimizer, is, platform } from "@electron-toolkit/utils"
import icon from "../../resources/iconWhite.png?asset"
import url from "url"
import { WindowManager, handleMessage, SharedValue, TrayMenu } from "./helper"
import { windowManager, type Window } from 'node-window-manager'
import { MoudleManger } from "./moudleManager"
protocol.registerSchemesAsPrivileged([
  {
    scheme: "atom",
    privileges: {
      supportFetchAPI: true,
    },
  },
])

console.log('[versions report]')
for (const name in process.versions) {
  if (Object.prototype.hasOwnProperty.call(process.versions, name)) {
    const version = process.versions[name]
    console.log(name, ':', version)
  }
}
console.log('[versions report end]')

console.log('[MoudleManger.moudlesDirPath]', MoudleManger.moudlesDirPath)

function createLive2dWindow() {
  const displayBounds = screen.getPrimaryDisplay().bounds
  const win = new BrowserWindow({
    ...displayBounds,
    show: false,
    title: __APP_NAME__,
    autoHideMenuBar: true,
    icon,
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
    // movable: false,         // ❌ 禁止移动窗口
    resizable: false,       // ❌ 禁止调整大小
    maximizable: false,     // ❌ 禁止最大化
  })
  win.setIgnoreMouseEvents(true, { forward: true })
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setAlwaysOnTop(true, 'screen-saver', Number.MAX_VALUE)
  win.on("ready-to-show", () => {
    win.show()
    win.setBounds(displayBounds)
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


function createInitWindow() {
  const win = new BrowserWindow({
    title: __APP_NAME__,
    center: true,
    icon,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false,
    },
    autoHideMenuBar: true
  })
  win.on("ready-to-show", () => {
    win.show()
  })
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: "deny" }
  })
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/init`)
  } else {
    win.loadFile(`${join(__dirname, "../renderer/index.html")}/init`)
  }
  return win
}

app.whenReady().then(async () => {
  const displayBounds = screen.getPrimaryDisplay().bounds
  protocol.handle("atom", (request) => {
    const filePath = decodeURIComponent(request.url.slice("atom://".length))
    console.log("[atom request]", filePath)
    return net.fetch(url.pathToFileURL(filePath).toString())
  })
  electronApp.setAppUserModelId("com.wenxig.desktoptoy")
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  app.dock?.hide()
  const wins = new WindowManager()
  await MoudleManger.init(wins)

  const isEditMode = new SharedValue(false, 'isEditMode', wins)
  new TrayMenu([{
    label: 'DevTool', type: 'normal', click: () => {
      wins.each(v => v.webContents.openDevTools())
    }
  }, {
    label: '编辑', type: 'normal', click: () => {
      if (isTouchMode.value) return
      isEditMode.value = !isEditMode.value
    }
  }, {
    label: '退出', type: 'normal', click: () => {
      app.quit()
    }
  }])
  isEditMode.watch((editMode) => {
    isTouchMode.value = false
    if (editMode) {
      wins.windows.get('live2d')?.setIgnoreMouseEvents(false)
      wins.windows.get('live2d')?.setFocusable(true)
      wins.windows.get('live2d')?.focus()
    } else {
      wins.windows.get('live2d')?.setFocusable(false)
      wins.windows.get('live2d')?.setIgnoreMouseEvents(true, { forward: true })
    }
  })


  const isFullScreen = new SharedValue(false, 'isFullScreen', wins)
  if (platform.isWindows) {
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
    isFullScreen.watch(() => {
      wins.doSync('setBounds', displayBounds)
    })
    setInterval(() => windowManager.emit('window-activated', windowManager.getActiveWindow()), 5000)
    windowManager.addListener('window-activated', win => {
      isFullScreen.value = checkWindow(win)
    })
  }
  handleMessage({
    tiggerTaskBarHideStatue() {
      windowManager.emit('window-activated', windowManager.getActiveWindow())
    }
  })

  const isTouchMode = new SharedValue(false, 'isTouchMode', wins)
  globalShortcut.register('shift+alt+e', () => {
    if (isEditMode.value) return
    isTouchMode.value = !isTouchMode.value
    console.log('globalShortcut -> change isTouchMode', isTouchMode.value)
  })
  isTouchMode.watch((isTouchMode) => {
    isEditMode.value = false
    if (isTouchMode) {
      wins.windows.get('live2d')?.setIgnoreMouseEvents(false)
      wins.windows.get('live2d')?.setFocusable(true)
      wins.windows.get('live2d')?.focus()
    } else {
      wins.windows.get('live2d')?.setFocusable(false)
      wins.windows.get('live2d')?.setIgnoreMouseEvents(true, { forward: true })
    }
  })
  handleMessage({
    moudleDone() {
      wins.windows.get('init')?.close()
      wins.add('live2d', createLive2dWindow())
    }
  })
  wins.add('init', createInitWindow())
})
app.on("window-all-closed", () => {
  if (!platform.isMacOS) {
    app.quit()
  }
})
