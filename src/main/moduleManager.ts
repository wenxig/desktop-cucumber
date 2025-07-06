import fs from "fs/promises"
import path from 'path'
import { FsHelper, tryRun } from "./helper"
import type { DefineConfig } from "../preload/type"
import Git, { type GitHttpRequest, type GitHttpResponse } from 'isomorphic-git'
import { defaultsDeep, isArray, isString, remove, spread, uniqBy } from "lodash-es"
import { dialog, net } from "electron"
import { InjectFunction, SharedValue, } from "./ipc"
const coreModuleUrl = 'https://github.com/wenxig/desktop-cucumber_core'
const modulesErrors = new SharedValue('modulesErrors', [])
const showErrorBox = (displayName: string, error: Error) => {
  modulesErrors.set(v => {
    v.push([displayName, error.toJSON()])
    return v
  })
  return dialog.showErrorBox(displayName, error.stack ?? error.message)
}
const http = {
  request: async (p: GitHttpRequest): Promise<GitHttpResponse> => {
    const result = Promise.withResolvers<GitHttpResponse>()
    const request = net.request({
      headers: p.headers,
      method: p.method,
      url: p.url,
    })
    if (p.body) for await (const chunk of p.body) request.write(Buffer.from(chunk))
    if (p.signal) {
      const signal = p.signal as AbortSignal
      signal.onabort = () => {
        request.abort()
      }
    }
    const chunks = new Array<Buffer<ArrayBufferLike>>()
    request.on('response', (response) => {
      const lengthHeader = response.headers['content-length']
      const totalBytes = lengthHeader
        ? parseInt(lengthHeader[0], 10)
        : 0

      let receivedBytes = 0
      response.on('data', (chunk) => {
        chunks.push(chunk)
        receivedBytes += chunk.length
        p.onProgress?.({
          total: totalBytes,
          loaded: receivedBytes,
          phase: 'download'
        })
      })
      response.on('end', () => {
        const finalBuffer = Buffer.concat(chunks)
        const headers: Record<string, string> = {}
        for (const header in response.headers) {
          if (Object.prototype.hasOwnProperty.call(response.headers, header)) {
            const value = response.headers[header]
            headers[header] = isArray(value) ? value.join('') : value
          }
        }
        result.resolve({
          url: p.url,
          headers,
          statusCode: response.statusCode,
          statusMessage: response.statusMessage,
          method: p.method,
          body: (async function* () {
            return new Uint8Array(finalBuffer)
          })()
        })
      })
      response.on('error', () => {
        const headers: Record<string, string> = {}
        for (const header in response.headers) {
          if (Object.prototype.hasOwnProperty.call(response.headers, header)) {
            const value = response.headers[header]
            headers[header] = isArray(value) ? value.join('') : value
          }
        }
        result.reject({
          url: p.url,
          headers,
          statusCode: response.statusCode,
          statusMessage: response.statusMessage,
          method: p.method,
        })
      })
    })
    request.end()
    return result.promise
  }
}
class InstallIns {
  private checkModule(content: DefineConfig.PackageJson | false, { url }: DefineConfig.ModuleOrigin): content is DefineConfig.PackageJson {
    console.log('InstallBy.checkModule', 'checking!', content, url)
    const err = new Error(`Install fail (${url} is not a module)`, { cause: `${url} is not a module` })
    if (content == false) {
      showErrorBox('人格生成错误-源不是人格数据', err)
      return false
    }
    if (this.ModuleManager.modules.value.module.find(v => v.namespace == content.desktopCucumber.module.namespace)) {
      const err = new Error(`Install fail (${content.desktopCucumber.module.namespace} is already existed)`, { cause: `${url} is not a module` })
      showErrorBox('人格生成错误-人格已存在', err)
      console.log('InstallBy.checkModule', 'check error!')
      return false
    }
    console.log('InstallBy.checkModule', 'check done!')
    return true
  }
  private async addModule(content: DefineConfig.PackageJson, aimPath: string, origin: DefineConfig.ModuleOrigin) {
    await fs.writeFile(path.join(aimPath, 'origin.txt'), JSON.stringify(origin))
    this.ModuleManager.modules.set(v => {
      v.module.push(this.ModuleManager.createModule(content, aimPath, origin, content.desktopCucumber.module.namespace != 'core'))
      v.module = uniqBy(v.module, v => v.namespace)
      return v
    })
    return true
  }

  public async github(url: string, saveDir: string, fork: string) {
    const content = await this.ModuleManager.info(url, 'github')
    const origin: DefineConfig.ModuleOrigin = {
      from: 'github',
      url
    }
    if (!this.checkModule(content, origin)) return false
    const aimPath = path.join(this.ModuleManager.modulesDirPath, saveDir)
    await Git.clone({
      fs,
      http,
      url,
      dir: aimPath,
      ref: fork
    })
    return this.addModule(content, aimPath, origin)
  }

  public async local(filePath: string, saveDir: string) {
    const content = await this.ModuleManager.info(filePath, 'local')
    const origin: DefineConfig.ModuleOrigin = {
      from: 'local',
      url: filePath
    }
    if (!this.checkModule(content, origin)) return false
    const aimPath = path.join(this.ModuleManager.modulesDirPath, saveDir)
    await fs.cp(filePath, aimPath, { recursive: true, force: true })
    return this.addModule(content, aimPath, origin)
  }
  constructor(private ModuleManager: ModuleManager) { }
}

class ModuleManager {
  private installBy: InstallIns
  constructor() {
    this.installBy = new InstallIns(this)
  }
  public modulesDirPath = import.meta.env.DEV ? path.join(__dirname, '../../_temp', 'appModules') : path.join(__dirname, 'appModules')
  public modulesJsonPath = path.join(this.modulesDirPath, 'modules.json')
  public modules = new SharedValue('modules', {
    module: []
  })
  public modulesBooting = new SharedValue('modulesBooting', true)

  public init = () => tryRun(async () => {
    const handleFsError = (err: Error) => {
      showErrorBox('人格初始化错误-海马体电信号弱', err)
      this.modulesBooting.value = err
      throw err
    }
    console.log('[ModuleManager.init] run!')
    this.modulesBooting.value = true
    await tryRun(async () => {
      if (!await FsHelper.isExists(this.modulesDirPath)) await fs.mkdir(this.modulesDirPath)
      process.chdir(this.modulesDirPath)
      if (!await FsHelper.isExists(this.modulesJsonPath)) await fs.writeFile(this.modulesJsonPath, JSON.stringify(this.modules.value))
      else this.modules.value = await FsHelper.readJsonFile(this.modulesJsonPath)
      this.modules.watch(modules => fs.writeFile(this.modulesJsonPath, JSON.stringify(modules)))
      console.log('[ModuleManager.init] dirs created')
    }, handleFsError)

    await this.modules.set(async v => {
      v.module.push(...await this.getUnrecordedModules(handleFsError))
      return v
    })

    const isInstalledCoreModule = !!this.modules.value.module.find(v => v.namespace == 'core')
    console.log('[ModuleManager.init] check core is install', isInstalledCoreModule)
    if (!isInstalledCoreModule) {
      await this.install(coreModuleUrl, 'github')
      console.log('[ModuleManager.init] core installed')
    }
    const uninstalledModules = await this.getUninstallModules(handleFsError)
    console.log('[ModuleManager.init] find uninstalled:', uninstalledModules)
    await Promise.all(uninstalledModules.map(({ origin: { url, from } }) => this.install(url, from)))

    this.modulesBooting.value = false
    console.log('[ModuleManager.init] done')
  }, err => {
    showErrorBox('人格初始化错误-神经突触失活', err)
    this.modulesBooting.value = err
    throw err
  })

  @InjectFunction.inject('ModuleManager.gitLsRemote')
  public gitLsRemote = (url: string) => tryRun(async () => {
    const refs = await Git.listServerRefs({
      http,
      prefix: "refs/heads/",
      url
    })
    return refs.map(r => r.ref.replaceAll("refs/heads/", ''))
  }, err => {
    showErrorBox('神经网络错误-神经突触失活', err)
    throw err
  })

  @InjectFunction.inject('ModuleManager.info')
  public info = (url: string, mode: DefineConfig.ModuleFrom, fork = 'main') => tryRun(async () => {
    switch (mode) {
      case "github":
        console.log('[ModuleManager.info][from github]', `${url}/raw/refs/heads/${fork}/package.json`)
        var content = <DefineConfig.PackageJson>await (await net.fetch(`${url}/raw/refs/heads/${fork}/package.json`, { method: 'GET' })).json()
        console.log('[ModuleManager.info][from github]', 'package.json load done')
        if (!content.desktopCucumber) return false
        return content
      case "local":
        console.log('[ModuleManager.info][from local]', path.join(url, 'package.json'))
        var content = await FsHelper.readJsonFile<DefineConfig.PackageJson>(path.join(url, 'package.json'))
        console.log('[ModuleManager.info][from local]', 'package.json load done')
        if (!content.desktopCucumber) return false
        return content
      default:
        const err = new Error(`Method not matched: ${mode}`, { cause: 'mode is undefined' })
        showErrorBox('神经网络检索错误-触酶未识别', err)
        throw err
    }
  }, async err => {
    showErrorBox('神经网络检索错误-目标神经元失活', err)
    return false as const
  })

  @InjectFunction.inject('ModuleManager.install')
  public install = (url: string, mode: DefineConfig.ModuleFrom, fork = 'main') => tryRun(async () => {
    const saveDir = url.split(/\\|\//ig).at(-1)!
    switch (mode) {
      case 'github':
        var result = await this.installBy.github(url, saveDir, fork)
        break
      case "local":
        var result = await this.installBy.local(url, saveDir)
        break
      default:
        const err = new Error(`Method not matched: ${mode}`, { cause: 'mode is undefined' })
        showErrorBox('人格生成错误-触酶未识别', err)
        throw err
    }
    console.log('[ModuleManager.install] done', url)
    return result
  }, async err => {
    showErrorBox('人格生成错误-胼胝体交互失败', err)
    throw err
  })
  @InjectFunction.inject('ModuleManager.uninstall')
  public uninstall = (namespace: string) => tryRun(async () => {
    const module = this.modules.value.module.find(v => v.namespace == namespace)
    if (!module) {
      console.warn('Module not find (uninstall):', namespace)
      return false
    }
    await fs.rm(module.localPath, { force: true, recursive: true })
    this.modules.set(v => {
      remove(v.module, { namespace })
      return v
    })
    return true
  }, err => {
    showErrorBox('销毁人格错误-海马体电信号偏移', err)
    throw err
  })
  private getUninstallModules = (handleError: (err: Error) => Promise<DefineConfig.Module[]>) => tryRun(async () => {
    const recordedModules = this.modules.value.module
    const installedModulesDir = await fs.readdir(this.modulesDirPath)
    const installedModules = new Set<string>()
    for (const moduleDirName of installedModulesDir) {
      const basepath = path.join(this.modulesDirPath, moduleDirName)
      if (!(await fs.lstat(basepath)).isDirectory()) continue
      const packageJsonPath = path.join(basepath, 'package.json')
      if (!await FsHelper.isExists(packageJsonPath)) continue
      const content = await FsHelper.readJsonFile<DefineConfig.PackageJson>(packageJsonPath)
      installedModules.add(content.desktopCucumber.module.namespace)
    }
    return recordedModules.filter(v => !installedModules.has(v.namespace))
  }, handleError)
  private getUnrecordedModules = (handleError: (err: Error) => Promise<DefineConfig.Module[]>) => tryRun(async () => {
    const recordedModules = new Set(this.modules.value.module.map(v => v.namespace))
    const installedModulesDir = await fs.readdir(this.modulesDirPath)
    const installedModules = new Array<[p: DefineConfig.PackageJson, localPath: string, origin: DefineConfig.ModuleOrigin]>()
    for (const moduleDirName of installedModulesDir) {
      const basepath = path.join(this.modulesDirPath, moduleDirName)
      if (!(await fs.lstat(basepath)).isDirectory()) continue
      const packageJsonPath = path.join(basepath, 'package.json')
      if (!await FsHelper.isExists(packageJsonPath)) continue
      const content = await FsHelper.readJsonFile<DefineConfig.PackageJson>(packageJsonPath)
      const originPath = path.join(basepath, 'origin.txt')
      if (!await FsHelper.isExists(originPath)) continue
      const origin = await FsHelper.readJsonFile<DefineConfig.ModuleOrigin>(originPath)
      installedModules.push([content, basepath, origin])
    }
    return installedModules.filter(v => !recordedModules.has(v[0].desktopCucumber.module.namespace)).map(spread(this.createModule))
  }, handleError)
  public createModule = (from: DefineConfig.PackageJson, localPath: string, origin: DefineConfig.ModuleOrigin, closeable = true): DefineConfig.Module => ({
    enable: !closeable,
    namespace: from.desktopCucumber.module.namespace,
    origin,
    localPath,
    package: from,
    displayName: from.desktopCucumber.module.displayName,
    closeable
  })

  private modelDefines = new SharedValue('modelDefines', [])
  @InjectFunction.inject('ModuleManager.done')
  public async done() {

  }
  public handleNetProtocol(namespace: string, id: string): Response/*<DefineConfig.ModelAssignedDefine>*/ {
    const createError = (reason: string) => {
      const err = new Error(reason)
      dialog.showErrorBox('神经网络错误-人格活性低', err.stack ?? err.message)
      return new Response(`Model Load Error:\n${reason}`, { status: 400 })
    }
    const modules = this.modules.value.module
    const baseModule = modules.find(v => v.namespace == namespace)
    if (!baseModule) return createError(`baseModule not found (namespace=${namespace})`)
    const models = baseModule.package.desktopCucumber.models
    const baseModel = models.find(v => v.id == id)
    if (!baseModel) return createError(`baseModel not found (namespace=${namespace}, id=${id})`)
    const extendsConfig = (baseModel.extends ?? []).map(v => ModuleManager.toResourceLocation(v))
    const extendsOriginModel = modules.filter(v => extendsConfig.some(e => e.namespace == v.namespace))?.map(v => v.package.desktopCucumber.models.find(v => extendsConfig.some(e => e.id == v.id)))
    let model = baseModel
    for (const source of extendsOriginModel) {
      if (!source) return createError(`source not found`)
      model = defaultsDeep(model, source)
    }
    // patch path
    const modelString = JSON.stringify(model).replace(/"\.\/([^\/]+\/?)*([^\/]+)"/ig, p => `"atom://${path.join(baseModule.localPath, p)}"`)
    return new Response(modelString, {
      status: 200,
      headers: {
        "Content-Type": 'application/json'
      }
    })
  }
  public static toResourceLocation(value: DefineConfig.ResourceLocation_): DefineConfig.ResourceLocation {
    return isString(value) ? {
      namespace: value.split(':')[0],
      id: value.split(':')[1]
    } : value
  }
}
export const moduleManager = new ModuleManager()