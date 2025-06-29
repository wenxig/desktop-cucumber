import fs from "fs/promises"
import path from 'path'
import { FsHelper, InjectFunction, SharedValue, tryRun } from "./helper"
import type { DefineConfig } from "../preload/type"
import Git from 'isomorphic-git'
import GitHttp from 'isomorphic-git/http/node/index.cjs'
import { isEmpty, remove, spread, uniqBy } from "lodash-es"
import { dialog, net } from "electron"
const coreModuleUrl = 'https://github.com/wenxig/desktop-cucumber_core'
export namespace ModuleManger.installBy {
  const addModule = async (content: DefineConfig.PackageJson, aimPath: string, origin: DefineConfig.ModuleOrigin) => {
    if (modules.value.module.find(v => v.namespace == content.desktopCucumber.module.namespace)) {
      console.warn('Module was installed (install):', origin.url)
      return false
    }
    await fs.writeFile(path.join(aimPath, 'origin.txt'), JSON.stringify(origin))
    modules.set(v => {
      v.module.push(createModule(content, aimPath, origin))
      v.module = uniqBy(v.module, v => v.namespace)
      return v
    })
    return true
  }

  export const github = async (url: string, saveDir: string, fork: string) => {
    const content = await info(url, 'github')
    const aimPath = path.join(modulesDirPath, saveDir)
    await Git.clone({
      fs,
      http: GitHttp,
      url,
      dir: aimPath,
      ref: fork
    })
    const origin: DefineConfig.ModuleOrigin = {
      from: 'github',
      url
    }
    return addModule(content, aimPath, origin)
  }

  export const local = async (filePath: string, saveDir: string) => {
    const content = await info(filePath, 'local')
    const aimPath = path.join(modulesDirPath, saveDir)
    await fs.cp(filePath, aimPath, { recursive: true })
    const origin: DefineConfig.ModuleOrigin = {
      from: 'local',
      url: filePath
    }
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
    console.log('[ModuleManager.init] run!')
    modulesBooting.value = true
    if (!await FsHelper.isExists(modulesDirPath)) await fs.mkdir(modulesDirPath)
    process.chdir(modulesDirPath)
    if (!await FsHelper.isExists(modulesJsonPath)) await fs.writeFile(modulesJsonPath, JSON.stringify(modules.value))
    else modules.value = await FsHelper.readJsonFile(modulesJsonPath)
    modules.watch(modules => fs.writeFile(modulesJsonPath, JSON.stringify(modules)))
    console.log('[ModuleManager.init] dirs created')

    await modules.set(async v => {
      v.module.push(...await getUnrecordedModules())
      return v
    })

    console.log('[ModuleManager.init] check core is install', isEmpty(modules.value.module))
    if (isEmpty(modules.value.module)) await install(coreModuleUrl, 'github')
    console.log('[ModuleManager.init] core installed')

    const uninstalledModules = await getUninstallModules()
    console.log('[ModuleManager.init] find uninstalled:', uninstalledModules)
    await Promise.all(uninstalledModules.map(({ origin: { url, from } }) => install(url, from)))

    modulesBooting.value = false
    console.log('[ModuleManager.init] done')
  }, err => {
    dialog.showErrorBox('人格初始化错误-神经突触失活', err.stack ?? err.message)
    modulesBooting.value = err
    throw err
  })

  export const gitLsRemote = InjectFunction.from('ModuleManger.gitLsRemote', async url => {
    const info = await Git.getRemoteInfo({
      http: GitHttp,
      url
    })
    return info
  })

  export const info = InjectFunction.from('ModuleManager.info', (url: string, mode: DefineConfig.ModuleFrom, fork = 'main') => tryRun(async () => {
    switch (mode) {
      case "github":
        console.log('[ModuleManger.info][from github]', `${url}/raw/refs/heads/${fork}/package.json`)
        var content = <DefineConfig.PackageJson>await (await net.fetch(`${url}/raw/refs/heads/${fork}/package.json`, { method: 'GET' })).json()
        console.log('[ModuleManger.info][from github]', 'package.json load done')
        return content
      case "local":
        console.log('[ModuleManger.info][from local]', path.join(url, 'package.json'))
        var content = await FsHelper.readJsonFile<DefineConfig.PackageJson>(path.join(url, 'package.json'))
        console.log('[ModuleManger.info][from local]', 'package.json load done')
        return content
      default:
        dialog.showErrorBox('神经网络检索错误-神经断链', `Method not matched: ${mode}`)
        throw new Error(`Method not matched: ${mode}`, { cause: 'mode is undefined' })
    }
  }, err => {
    dialog.showErrorBox('神经网络检索错误-人格不存在', err.stack ?? err.message)
    throw err
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

  export const uninstall = InjectFunction.from('ModuleManger.uninstall', async (namespace) => {
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
  })

  const getUninstallModules = async () => {
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
  }
  const getUnrecordedModules = async () => {
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
  }
  export const createModule = (from: DefineConfig.PackageJson, localPath: string, origin: DefineConfig.ModuleOrigin): DefineConfig.Module => ({
    enable: false,
    namespace: from.desktopCucumber.module.namespace,
    origin,
    localPath,
    package: from,
    displayName: from.desktopCucumber.module.displayName
  })
}