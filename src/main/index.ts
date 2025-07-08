import { app, net, screen, globalShortcut } from "electron"
import { electronApp, optimizer, platform } from "@electron-toolkit/utils"
import url from "url"
import { TrayMenu, useProtocolProxy } from "./helper"
import { windowManager, type Window } from 'node-window-manager'
import { moduleManager } from "./moduleManager"
import { WindowManager } from "./windowManager"
import { InjectFunction, SharedValue } from './ipc'
Error.prototype.toJSON = function () {
  return this.stack ?? this.message
}

console.log('[versions report]')
for (const name in process.versions) if (Object.prototype.hasOwnProperty.call(process.versions, name)) console.log(name, ':', process.versions[name])
console.log('[versions report end]')

const applyProxy = useProtocolProxy([
  ['atom', filePath => {
    console.log("[atom request]", filePath)
    return net.fetch(url.pathToFileURL(filePath).toString())
  }],

  // model://{namespace}/{id}
  ['model', path => {
    const [namespace, ...id] = path.split('/')
    const response = moduleManager.handleNetProtocol(namespace, id.join('/'))
    return response
  }]
])

console.log('[ModuleManager.modulesDirPath]', moduleManager.modulesDirPath)

const createLive2dWindow = () => {
  const win = WindowManager.create('live2d', {
    ...screen.getPrimaryDisplay().bounds,
    frame: false,
    backgroundColor: '#00000000',
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
  win.setIgnoreMouseEvents(true, { forward: true })
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setAlwaysOnTop(true, 'screen-saver', Number.MAX_VALUE)
  return win
}

const createInitWindow = () => WindowManager.create('init', {
  closable: false
}, '/init')

app.whenReady().then(async () => {
  new SharedValue('platform', platform)
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
    const win = WindowManager.windows.get('live2d')
    if (editMode) {
      win?.setIgnoreMouseEvents(false)
      win?.setFocusable(true)
      win?.focus()
    } else {
      win?.setFocusable(false)
      win?.setIgnoreMouseEvents(true, { forward: true })
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

  const initWin = createInitWindow()
  moduleManager.onDone(() => {
    const live2d = createLive2dWindow()
    live2d.on('show', () => WindowManager.alertMessage('live2d-opened'))
  })
  InjectFunction.from('live2dDone', () => {
    setTimeout(() => {
      initWin.close()
    }, 100)
  })
  await moduleManager.init()
})
app.on("window-all-closed", () => {
  if (!platform.isMacOS) app.quit()
})
app.on('before-quit', () => {
  process.exit(0)
})
