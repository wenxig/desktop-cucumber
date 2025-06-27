import fs from "fs/promises"
import path from 'path'
import { FsHelper, SharedValue } from "./helper"
import type { DefineConfig } from "../preload/type"
import simpleGit from 'simple-git'
import { difference, differenceBy, remove, uniqBy } from "lodash-es"
import { app, dialog, net } from "electron"
import { WindowManager } from "./windowManager"
const coreModuleUrl = 'https://github.com/wenxig/desktop-cucumber_core'

export namespace ModuleManger {
  export namespace installBy {
    export const github = async (url: string, saveDir: string) => {
      console.log('[install][from github]', `${url}/raw/refs/heads/main/package.json`)
      const content = <DefineConfig.PackageJson>await (await net.fetch(`${url}/raw/refs/heads/main/package.json`, { method: 'GET' })).json()
      console.log('[install][from github]', 'package.json load done')
      if (modules.value.module.find(v => v.namespace == content.desktopCucumber.module.namespace)) {
        console.warn('Module was installed (install):', url)
        return false
      }
      const aimPath = path.join(modulesDirPath, saveDir)
      await simpleGit(modulesDirPath).clone(url, saveDir)
      modules.set(v => {
        v.module.push({
          enable: false,
          namespace: content.desktopCucumber.module.namespace,
          origin: {
            from: 'github',
            url
          },
          localPath: aimPath,
          package: content
        })
        v.module = uniqBy(v.module, v => v.namespace)
        return v
      })
      return true
    }
    export const local = async (filePath: string, saveDir: string) => {
      const content = await FsHelper.readJsonFile<DefineConfig.PackageJson>(path.join(filePath, 'package.json'))
      if (modules.value.module.find(v => v.namespace == content.desktopCucumber.module.namespace)) {
        console.warn('Module was installed (install):', filePath)
        return false
      }
      const aimPath = path.join(modulesDirPath, saveDir)
      await fs.cp(filePath, aimPath, { recursive: true })
      modules.set(v => {
        v.module.push({
          enable: false,
          namespace: content.desktopCucumber.module.namespace,
          origin: {
            from: 'local',
            url: filePath
          },
          localPath: aimPath,
          package: content
        })
        v.module = uniqBy(v.module, v => v.namespace)
        return v
      })
      return true
    }
  }

  export const modulesDirPath = path.join(__dirname, 'appModules')
  export const modulesJsonPath = path.join(modulesDirPath, 'modules.json')

  export const modules = new SharedValue<DefineConfig.ModulesJson>({
    module: []
  }, 'modules')
  export const modulesBooting = new SharedValue<boolean>(true, 'modulesBooting')

  export const init = async () => {
    try {
      console.log('[ModuleManager.init] run!')
      modulesBooting.value = true
      if (!await FsHelper.isExists(modulesDirPath)) await fs.mkdir(modulesDirPath)
      process.chdir(modulesDirPath)
      if (!await FsHelper.isExists(modulesJsonPath)) await fs.writeFile(modulesJsonPath, JSON.stringify(modules.value))
      else modules.value = await FsHelper.readJsonFile(modulesJsonPath)
      modules.watch(modules => fs.writeFile(modulesJsonPath, JSON.stringify(modules)))
      console.log('[ModuleManager.init] dirs created')
      await install(coreModuleUrl, 'github')
      console.log('[ModuleManager.init] core installed')
      const uninstalleds = await getUninstallModules()
      console.log('[ModuleManager.init] find uninstalled:', uninstalleds)
      await Promise.all(uninstalleds.map(({ origin: { url, from } }) => install(url, from)))
      modulesBooting.value = false
      console.log('[ModuleManager.init] done')
    } catch (err: any) {
      dialog.showErrorBox('人格初始化错误-无法连接到神经网络', err.toString())
      process.exit(0)
    }
  }
  export const install = async (url: string, mode: DefineConfig.ModuleFrom) => {
    const saveDir = url.split('/').at(-1)!
    switch (mode) {
      case 'github':
        await installBy.github(url, saveDir)
        break
      case "local":
        await installBy.local(url, saveDir)
        break
    }
    console.log('[install] done', url)
    return true
  }
  export const uninstall = async (namespace: string) => {
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
  }
  const getUninstallModules = async () => {
    const recodredModules = modules.value.module
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
    return recodredModules.filter(v => !installedModules.has(v.namespace))
  }
}