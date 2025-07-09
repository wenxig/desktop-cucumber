import fs from "fs/promises"
import path from 'path'
import type { DefineConfig } from "@preload/type"
import Git, { type GitHttpRequest, type GitHttpResponse } from 'isomorphic-git'
import { defaultsDeep, isArray, isEmpty, isString, remove, spread, uniqBy } from "lodash-es"
import { dialog, net } from "electron"
import { InjectFunction, SharedValue, } from "../helper/ipc"
import type { AnyFn } from "@vueuse/core"
import mitt from "mitt"
import { tryRun } from "@main/helper"
import { FsHelper } from "@main/helper/fs"
import { useAtomStore } from "@main/store/atom"
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
const atomStore = useAtomStore()
export namespace ModuleManager.installBy {
  const checkModule = (content: DefineConfig.PackageJson | false, { url }: DefineConfig.ModuleOrigin): content is DefineConfig.PackageJson => {
    console.log('InstallBy.checkModule', 'checking!', content, url)
    const err = new Error(`Install fail (${url} is not a module)`, { cause: `${url} is not a module` })
    if (content == false) {
      showErrorBox('人格生成错误-源不是人格数据', err)
      return false
    }
    if (modulesRecordFile.value.module.find(v => v.namespace == content.desktopCucumber.module.namespace)) {
      const err = new Error(`Install fail (${content.desktopCucumber.module.namespace} is already existed)`, { cause: `${url} is not a module` })
      showErrorBox('人格生成错误-人格已存在', err)
      console.log('InstallBy.checkModule', 'check error!')
      return false
    }
    console.log('InstallBy.checkModule', 'check done!')
    return true
  }
  const addModule = async (content: DefineConfig.PackageJson, aimPath: string, origin: DefineConfig.ModuleOrigin) => {
    await fs.writeFile(path.join(aimPath, 'origin.txt'), JSON.stringify(origin))
    ModuleManager.modulesRecordFile.set(v => {
      v.module.push(createModule(content, aimPath, origin, content.desktopCucumber.module.namespace != 'core'))
      v.module = uniqBy(v.module, v => v.namespace)
      return v
    })
    return true
  }

  export const github = async (url: string, saveDir: string, fork: string) => {
    const content = await info(url, 'github')
    const origin: DefineConfig.ModuleOrigin = {
      from: 'github',
      url
    }
    if (!checkModule(content, origin)) return false
    const aimPath = path.join(modulesDirPath, saveDir)
    await Git.clone({
      fs,
      http,
      url,
      dir: aimPath,
      ref: fork
    })
    return addModule(content, aimPath, origin)
  }

  export const local = async (filePath: string, saveDir: string) => {
    const content = await info(filePath, 'local')
    const origin: DefineConfig.ModuleOrigin = {
      from: 'local',
      url: filePath
    }
    if (!checkModule(content, origin)) return false
    const aimPath = path.join(modulesDirPath, saveDir)
    await fs.cp(filePath, aimPath, { recursive: true, force: true })
    return addModule(content, aimPath, origin)
  }
}


export namespace ModuleManager {
  export const modulesDirPath = import.meta.env.DEV ? path.join(__dirname, '../../_temp', 'appModules') : path.join(__dirname, 'appModules')
  export const modulesJsonPath = path.join(modulesDirPath, 'modules.json')
  export const modulesRecordFile = new SharedValue('modules', {
    module: []
  })
  export const modulesBooting = new SharedValue('modulesBooting', true)
  export const modelDefines = new SharedValue('modelDefines', [])
  export const init = () => tryRun(async () => {
    const handleFsError = (err: Error) => {
      showErrorBox('人格初始化错误-海马体电信号弱', err)
      ModuleManager.modulesBooting.value = err
      throw err
    }
    console.log('[ModuleManager.init] run!')
    ModuleManager.modulesBooting.value = true
    await tryRun(async () => {
      if (!await FsHelper.isExists(modulesDirPath)) await fs.mkdir(modulesDirPath)
      process.chdir(modulesDirPath)
      if (!await FsHelper.isExists(modulesJsonPath)) await fs.writeFile(modulesJsonPath, JSON.stringify(modulesRecordFile.value))
      else ModuleManager.modulesRecordFile.value = await FsHelper.readJsonFile(modulesJsonPath)
      ModuleManager.modulesRecordFile.watch(modules => fs.writeFile(modulesJsonPath, JSON.stringify(modules)))
      console.log('[ModuleManager.init] dirs created')
    }, handleFsError)

    await ModuleManager.modulesRecordFile.set(async v => {
      v.module.push(...await getUnrecordedModules(handleFsError))
      return v
    })

    const isInstalledCoreModule = !!ModuleManager.modulesRecordFile.value.module.find(v => v.namespace == 'core')
    console.log('[ModuleManager.init] check core is install', isInstalledCoreModule)
    if (!isInstalledCoreModule) {
      await install(coreModuleUrl, 'github')
      console.log('[ModuleManager.init] core installed')
    }
    const uninstalledModules = await getUninstallModules(handleFsError)
    console.log('[ModuleManager.init] find uninstalled:', uninstalledModules)
    await Promise.all(uninstalledModules.map(({ origin: { url, from } }) => install(url, from)))

    ModuleManager.modulesBooting.value = false
    console.log('[ModuleManager.init] done')
  }, err => {
    showErrorBox('人格初始化错误-神经突触失活', err)
    ModuleManager.modulesBooting.value = err
    throw err
  })

  export const gitLsRemote = InjectFunction.from('ModuleManager.gitLsRemote', (url: string) => tryRun(async () => {
    const refs = await Git.listServerRefs({
      http,
      prefix: "refs/heads/",
      url
    })
    return refs.map(r => r.ref.replaceAll("refs/heads/", ''))
  }, err => {
    showErrorBox('神经网络错误-神经突触失活', err)
    throw err
  }))

  export const info = InjectFunction.from('ModuleManager.info', (url: string, mode: DefineConfig.ModuleFrom, fork = 'main') => tryRun(async () => {
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
  }))

  export const install = InjectFunction.from('ModuleManager.install', (url: string, mode: DefineConfig.ModuleFrom, fork = 'main') => tryRun(async () => {
    const saveDir = url.split(/\\|\//ig).at(-1)!
    switch (mode) {
      case 'github':
        var result = await installBy.github(url, saveDir, fork)
        break
      case "local":
        var result = await installBy.local(url, saveDir)
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
  }))
  export const uninstall = InjectFunction.from('ModuleManager.uninstall', (namespace: string) => tryRun(async () => {
    const module = ModuleManager.modulesRecordFile.value.module.find(v => v.namespace == namespace)
    if (!module) {
      console.warn('Module not find (uninstall):', namespace)
      return false
    }
    await fs.rm(module.localPath, { force: true, recursive: true })
    ModuleManager.modulesRecordFile.set(v => {
      remove(v.module, { namespace })
      return v
    })
    return true
  }, err => {
    showErrorBox('销毁人格错误-海马体电信号偏移', err)
    throw err
  }))
  const getUninstallModules = (handleError: (err: Error) => Promise<DefineConfig.Module[]>) => tryRun(async () => {
    const recordedModules = ModuleManager.modulesRecordFile.value.module
    const installedModulesDir = await fs.readdir(modulesDirPath)
    const installedModules = new Set<string>()
    for (const moduleDirName of installedModulesDir) {
      const basepath = path.join(modulesDirPath, moduleDirName)
      if (!(await fs.lstat(basepath)).isDirectory()) continue
      const packageJsonPath = path.join(basepath, 'package.json')
      if (!await FsHelper.isExists(packageJsonPath)) continue
      const content = await FsHelper.readJsonFile<DefineConfig.PackageJson>(packageJsonPath)
      installedModules.add(content.desktopCucumber.module.namespace)
    }
    return recordedModules.filter(v => !installedModules.has(v.namespace))
  }, handleError)
  const getUnrecordedModules = (handleError: (err: Error) => Promise<DefineConfig.Module[]>) => tryRun(async () => {
    const recordedModules = new Set(modulesRecordFile.value.module.map(v => v.namespace))
    const installedModulesDir = await fs.readdir(modulesDirPath)
    const installedModules = new Array<[p: DefineConfig.PackageJson, localPath: string, origin: DefineConfig.ModuleOrigin]>()
    for (const moduleDirName of installedModulesDir) {
      const basepath = path.join(modulesDirPath, moduleDirName)
      if (!(await fs.lstat(basepath)).isDirectory()) continue
      const packageJsonPath = path.join(basepath, 'package.json')
      if (!await FsHelper.isExists(packageJsonPath)) continue
      const content = await FsHelper.readJsonFile<DefineConfig.PackageJson>(packageJsonPath)
      const originPath = path.join(basepath, 'origin.txt')
      if (!await FsHelper.isExists(originPath)) continue
      const origin = await FsHelper.readJsonFile<DefineConfig.ModuleOrigin>(originPath)
      installedModules.push([content, basepath, origin])
    }
    return installedModules.filter(v => !recordedModules.has(v[0].desktopCucumber.module.namespace)).map(spread(createModule))
  }, handleError)
  export const createModule = (from: DefineConfig.PackageJson, localPath: string, origin: DefineConfig.ModuleOrigin, closeable = true): DefineConfig.Module => ({
    enable: !closeable,
    namespace: from.desktopCucumber.module.namespace,
    origin,
    localPath,
    package: from,
    displayName: from.desktopCucumber.module.displayName,
    closeable,
    models: from.desktopCucumber.models ?? [],
  })

  const emitter = mitt<{ done: void }>()
  export const done = InjectFunction.from('ModuleManager.done', async () => {
    console.log('[ModuleManager.done]done running',)
    await ModuleManager.modelDefines.set(v => {
      console.log('[ModuleManager.done] begin loop')
      for (const module of ModuleManager.modulesRecordFile.value.module) {
        console.log('[ModuleManager.done] looping', module.namespace)
        for (const model of module.models) {
          console.log('[ModuleManager.done]deep looping', model.id)
          v.push({
            ...model,
            configUrl: `model://${module.namespace}/${model.id}`
          })
        }
      }
      return v
    })
    console.log('[ModuleManager.done]emit sending')
    emitter.emit('done')
    console.log('[ModuleManager.done]emit sended')
  })
  export const onDone = (fn: AnyFn) => {
    emitter.on('done', () => {
      console.log('[ModuleManager.onDone] triggered')
      fn()
    })
  }
  const parsePath = (model: DefineConfig.DefineModelFile, originPath: string, modelDefine: DefineConfig.ModelDefine): DefineConfig.DefineModelFile => {
    let str = JSON.stringify(model)
    for (const regexp of [
      /"\.\/([^\/]+\/?)*([^\/]+)"/ig,
      /"([^\/"]+\/)+([^\/"]+)\.\w+"/ig,
    ]) {
      str = str.replace(regexp, p => {
        const url = atomStore.create(path.join(originPath, modelDefine.path, '..', p.substring(1, p.length - 1)))
        return `"${url}"`
      })
    }
    return JSON.parse(str)
  }
  const getModel = (resourceLocation_: DefineConfig.ResourceLocation_) => {
    const resourceLocation = ModuleManager.toResourceLocation(resourceLocation_)
    return getModule(resourceLocation)?.models.find(m => m.id == resourceLocation.id)
  }
  const getModelDefine = (resourceLocation_: DefineConfig.ResourceLocation_) => {
    const resourceLocation = ModuleManager.toResourceLocation(resourceLocation_)
    const module = getModule(resourceLocation)
    const model = getModel(resourceLocation)
    if (!module || !model) return
    const p = path.join(module.localPath, model.path)
    return FsHelper.readJsonFile<DefineConfig.DefineModelFile>(p)
  }
  const getModule = (from: DefineConfig.ResourceLocation_ | string) => {
    const resourceLocation = ModuleManager.toResourceLocation(isString(from) ? `${from}:void`/*"[(foo):bar]:void"|"[(foo):void]"*/ : from)
    return ModuleManager.modulesRecordFile.value.module.find(m => m.namespace == (resourceLocation?.namespace ?? from))
  }
  const mergeModel = async (model: DefineConfig.ModelDefine, module: DefineConfig.Module): Promise<DefineConfig.DefineModelFile> => {
    if (!model.extends || isEmpty(model.extends)) {
      const def = await getModelDefine({ id: model.id, namespace: module.namespace })!
      return parsePath(def, module.localPath, model)
    }
    const modelDefines = model.extends.map(e => [getModule(e), getModel(toResourceLocation(e)), e] as const).filter(v => {
      const isExist = !!v[1]
      if (!isExist) {
        console.warn(`Fail to load model from (not found):`, ModuleManager.toResourceLocationString(v[2]), '. When load:', `${module.namespace}:${model.id}`)
        return isExist
      }
      return isExist
    }) as [DefineConfig.Module, DefineConfig.ModelDefine, DefineConfig.ResourceLocation_][]
    const processedModelSets = await Promise.all(modelDefines.map(async m => [m[0], await mergeModel(m[1], m[0]), m[2], m[1]] as const))
    const models = await Promise.all(processedModelSets.map(async ([module, _model, local, model]) => [module, await getModelDefine(local)!, model] as const))
    const processedModelDefines = models.map(v => parsePath(v[1], v[0].namespace, v[2]))
    const modelDefine = await getModelDefine({ namespace: module.namespace, id: model.id })!
    const mergedModelDefine = defaultsDeep(modelDefine, ...processedModelDefines)
    return parsePath(mergedModelDefine, module.localPath, model)
  }
  export const handleNetProtocol = async (namespace: string, id: string): Promise<Response/*<DefineConfig.ModelAssignedDefine>*/> => {
    const createError = (err: Error) => {
      dialog.showErrorBox('神经网络错误-人格活性低', err.stack ?? err.message)
      throw new Response(`Model Load Error:\n${err.stack ?? err.message}`, { status: 400 })
    }
    const module = getModule({ id, namespace })
    const model = getModel({ id, namespace })

    if (!module || !model) return createError(new Error(`module or model not found, when load ${namespace}:${id}`))
    try {
      console.log('[ModuleManager.handleNetProtocol]', module, model, { id, namespace })
      const result = await tryRun(async () => await mergeModel(model, module), createError)
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": 'application/json'
        }
      })
    } catch (error: any) {
      console.error(error)
      return error as Response
    }
  }
  export const toResourceLocation = (value: DefineConfig.ResourceLocation_): DefineConfig.ResourceLocation => {
    return isString(value) ? {
      namespace: value.split(':')[0],
      id: value.split(':')[1]
    } : value
  }
  export const toResourceLocationString = (value: DefineConfig.ResourceLocation_): string => {
    return isString(value) ? value : `${value.namespace}:${value.id}`
  }
}