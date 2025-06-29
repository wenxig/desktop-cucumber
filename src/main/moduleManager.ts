import fs from "fs/promises"
import path from 'path'
import { FsHelper, InjectFunction, SharedValue, tryRun } from "./helper"
import type { DefineConfig } from "../preload/type"
import Git, { type GitHttpRequest, type GitHttpResponse } from 'isomorphic-git'
import GitHttp from 'isomorphic-git/http/node/index.js'
import { isArray, isEmpty, remove, spread, uniqBy } from "lodash-es"
import { dialog, net } from "electron"
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
export namespace ModuleManger.installBy {
  const checkModule = (content: DefineConfig.PackageJson | false, { url }: DefineConfig.ModuleOrigin): content is DefineConfig.PackageJson => {
    const err = new Error(`Install fail (${url} is not a module)`, { cause: `${url} is not a module` })
    if (content == false) {
      showErrorBox('人格生成错误-源不是人格数据', err)
      return false
    }
    if (modules.value.module.find(v => v.namespace == content.desktopCucumber.module.namespace)) {
      const err = new Error(`Install fail (${content.desktopCucumber.module.namespace} is already existed)`, { cause: `${url} is not a module` })
      showErrorBox('人格生成错误-人格已存在', err)
      return false
    }
    return true
  }
  const addModule = async (content: DefineConfig.PackageJson, aimPath: string, origin: DefineConfig.ModuleOrigin) => {
    await fs.writeFile(path.join(aimPath, 'origin.txt'), JSON.stringify(origin))
    modules.set(v => {
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
    await fs.cp(filePath, aimPath, { recursive: true })
    return addModule(content, aimPath, origin)
  }
}
export namespace ModuleManger {
  export const modulesDirPath = import.meta.env.DEV ? path.join(__dirname, '../../_temp', 'appModules') : path.join(__dirname, 'appModules')
  export const modulesJsonPath = path.join(modulesDirPath, 'modules.json')
  export const modules = new SharedValue('modules', {
    module: []
  })
  export const modulesBooting = new SharedValue('modulesBooting', true)

  export const init = () => tryRun(async () => {
    const handleFsError = (err: Error) => {
      showErrorBox('人格初始化错误-海马体电信号弱', err)
      modulesBooting.value = err
      throw err
    }
    console.log('[ModuleManager.init] run!')
    modulesBooting.value = true
    await tryRun(async () => {
      if (!await FsHelper.isExists(modulesDirPath)) await fs.mkdir(modulesDirPath)
      process.chdir(modulesDirPath)
      if (!await FsHelper.isExists(modulesJsonPath)) await fs.writeFile(modulesJsonPath, JSON.stringify(modules.value))
      else modules.value = await FsHelper.readJsonFile(modulesJsonPath)
      modules.watch(modules => fs.writeFile(modulesJsonPath, JSON.stringify(modules)))
      console.log('[ModuleManager.init] dirs created')
    }, handleFsError)

    await modules.set(async v => {
      v.module.push(...await getUnrecordedModules(handleFsError))
      return v
    })
    console.log('[ModuleManager.init] check core is install', isEmpty(modules.value.module))
    if (isEmpty(modules.value.module)) await install(coreModuleUrl, 'github')
    console.log('[ModuleManager.init] core installed')
    const uninstalledModules = await getUninstallModules(handleFsError)
    console.log('[ModuleManager.init] find uninstalled:', uninstalledModules)
    await Promise.all(uninstalledModules.map(({ origin: { url, from } }) => install(url, from)))

    modulesBooting.value = false
    console.log('[ModuleManager.init] done')
  }, err => {
    showErrorBox('人格初始化错误-神经突触失活', err)
    modulesBooting.value = err
    throw err
  })

  export const gitLsRemote = InjectFunction.from('ModuleManger.gitLsRemote', url => tryRun(async () => {
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
        console.log('[ModuleManger.info][from github]', `${url}/raw/refs/heads/${fork}/package.json`)
        var content = <DefineConfig.PackageJson>await (await net.fetch(`${url}/raw/refs/heads/${fork}/package.json`, { method: 'GET' })).json()
        console.log('[ModuleManger.info][from github]', 'package.json load done')
        if (!content.desktopCucumber) return false
        return content
      case "local":
        console.log('[ModuleManger.info][from local]', path.join(url, 'package.json'))
        var content = await FsHelper.readJsonFile<DefineConfig.PackageJson>(path.join(url, 'package.json'))
        console.log('[ModuleManger.info][from local]', 'package.json load done')
        if (!content.desktopCucumber) return false
        return content
      default:
        const err = new Error(`Method not matched: ${mode}`, { cause: 'mode is undefined' })
        showErrorBox('神经网络检索错误-触酶未识别', err)
        throw err
    }
  }, async err => {
    showErrorBox('神经网络检索错误-人格不存在', err)
    return false as const
  }))

  export const install = InjectFunction.from('ModuleManger.install', async (url: string, mode: DefineConfig.ModuleFrom, fork = 'main') => {
    const saveDir = url.split('/').at(-1)!
    switch (mode) {
      case 'github':
        await installBy.github(url, saveDir, fork)
        break
      case "local":
        await installBy.local(url, saveDir)
        break
    }
    console.log('[ModuleManger.install] done', url)
    return true
  })

  export const uninstall = InjectFunction.from('ModuleManger.uninstall', (namespace) => tryRun(async () => {
    const module = modules.value.module.find(v => v.namespace == namespace)
    if (!module) {
      console.warn('Module not find (uninstall):', namespace)
      return false
    }
    await fs.rm(module.localPath, { force: true, recursive: true })
    modules.set(v => {
      remove(v.module, { namespace })
      return v
    })
    return true
  }, err => {
    showErrorBox('销毁人格错误-海马体电信号偏移', err)
    throw err
  }))

  const getUninstallModules = (handleError: (err: Error) => Promise<DefineConfig.Module[]>) => tryRun(async () => {
    const recordedModules = modules.value.module
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
    const recordedModules = new Set(modules.value.module.map(v => v.namespace))
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
    enable: closeable ? false : 0,
    namespace: from.desktopCucumber.module.namespace,
    origin,
    localPath,
    package: from,
    displayName: from.desktopCucumber.module.displayName,
    closeable
  })
}