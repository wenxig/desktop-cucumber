import { app, BrowserWindow, protocol, net, screen, globalShortcut } from "electron"
import { join } from "path"
import { electronApp, optimizer, platform } from "@electron-toolkit/utils"
import icon from "../../resources/iconWhite.png?asset"
import url from "url"
import { InjectFunction, SharedValue, TrayMenu, useProtocolProxy, WindowHelper } from "./helper"
import { windowManager, type Window } from 'node-window-manager'
import { ModuleManger } from "./moduleManager"
import { WindowManager } from "./windowManager"
Error.prototype.toJSON = function () {
  return this.stack ?? this.message
}
const applyProxy = useProtocolProxy([
  ['atom', request => {
    const filePath = decodeURIComponent(request.url.slice("atom://".length))
    console.log("[atom request]", filePath)
    return net.fetch(url.pathToFileURL(filePath).toString())
  }]
])

console.log('[versions report]')
for (const name in process.versions) {
  if (Object.prototype.hasOwnProperty.call(process.versions, name)) {
    const version = process.versions[name]
    console.log(name, ':', version)
  }
}
console.log('[versions report end]')

console.log('[ModuleManger.modulesDirPath]', ModuleManger.modulesDirPath)

const createLive2dWindow = () => {
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
      spellcheck: false,
    },
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    enableLargerThanScreen: true,
    roundedCorners: false,
    movable: false,
    resizable: false,
    maximizable: false,
  })
  WindowHelper.useCommonSetting(win)
  win.setIgnoreMouseEvents(true, { forward: true })
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setAlwaysOnTop(true, 'screen-saver', Number.MAX_VALUE)
  WindowHelper.useOpen(win)
  return win
}

const createInitWindow = () => {
  new SharedValue('platform', platform)
  const win = new BrowserWindow({
    title: __APP_NAME__,
    center: true,
    icon,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false,
      spellcheck: false
    },
    autoHideMenuBar: true,
    closable: false
  })
  WindowHelper.useCommonSetting(win)
  WindowHelper.useOpen(win, '/init')
  return win
}

app.whenReady().then(async () => {
  applyProxy()
  electronApp.setAppUserModelId("com.wenxig.desktop-cucumber")
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  app.dock?.hide()

  const displayBounds = screen.getPrimaryDisplay().bounds
  const isEditMode = new SharedValue('isEditMode', false)
  new TrayMenu([{
    label: 'DevTool', type: 'normal', click: () => {
      WindowManager.each(v => v.webContents.openDevTools())
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
      WindowManager.windows.get('live2d')?.setIgnoreMouseEvents(false)
      WindowManager.windows.get('live2d')?.setFocusable(true)
      WindowManager.windows.get('live2d')?.focus()
    } else {
      WindowManager.windows.get('live2d')?.setFocusable(false)
      WindowManager.windows.get('live2d')?.setIgnoreMouseEvents(true, { forward: true })
    }
  })


  const isFullScreen = new SharedValue('isFullScreen', false)
  if (platform.isWindows) {
    const checkWindow = (w: Window) => {
      const windowBounds = w.getBounds()
      if (!w.isWindow() || !w.isVisible() || w.path.startsWith('C:\\Windows') || !windowBounds.height || !w.getTitle()) return false
      if (windowBounds.x != 0 || windowBounds.height < displayBounds.height) return false
      if (w.id != windowManager.getActiveWindow().id) return false
      if (w.processId == process.pid || w.processId == process.ppid) return false
      console.log('fullscreen report', displayBounds, 'with', windowBounds)
      console.log('                   ', w.path, '|', w.id, '|', w.processId, w.getTitle())
      return true
    }
    isFullScreen.watch(() => {
      WindowManager.doSync('setBounds', displayBounds)
    })
    setInterval(() => windowManager.emit('window-activated', windowManager.getActiveWindow()), 5000)
    windowManager.addListener('window-activated', win => {
      isFullScreen.value = checkWindow(win)
    })
  }
  new InjectFunction('triggerTaskBarHideStatue', () => windowManager.emit('window-activated', windowManager.getActiveWindow()))

  const isTouchMode = new SharedValue('isTouchMode', false)
  globalShortcut.register('shift+alt+e', () => {
    if (isEditMode.value) return
    isTouchMode.value = !isTouchMode.value
    console.log('globalShortcut -> change isTouchMode', isTouchMode.value)
  })
  isTouchMode.watch((isTouchMode) => {
    isEditMode.value = false
    if (isTouchMode) {
      WindowManager.windows.get('live2d')?.setIgnoreMouseEvents(false)
      WindowManager.windows.get('live2d')?.setFocusable(true)
      WindowManager.windows.get('live2d')?.focus()
    } else {
      WindowManager.windows.get('live2d')?.setFocusable(false)
      WindowManager.windows.get('live2d')?.setIgnoreMouseEvents(true, { forward: true })
    }
  })

  WindowManager.add('init', createInitWindow())
  await ModuleManger.init()
})
app.on("window-all-closed", () => {
  if (!platform.isMacOS) {
    app.quit()
  }
})
app.on('before-quit', () => {
  process.exit(0)
})
