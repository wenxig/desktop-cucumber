import fs from "fs/promises"
import path from 'path'
import { SharedValue } from "./helper"
import type { DefineConfig } from "../preload/type"
import simpleGit from 'simple-git'
const coreModuleUrl = 'https://github.com/wenxig/desktop-cucumber_core'
export namespace ModuleManger {
  export const modulesDirPath = path.join(__dirname, 'appModules')
  export const packageJsonPath = path.join(modulesDirPath, 'modules.json')
  const Git = () => simpleGit(modulesDirPath)

  export const modules = new SharedValue<DefineConfig.ModulesJson>({
    module: []
  }, 'modules')
  export const modulePackage = new SharedValue<DefineConfig.PackageJson[]>([], 'modulePackage')

  export const init = async () => {
    try {
      await fs.access(modulesDirPath, fs.constants.W_OK | fs.constants.R_OK)
    } catch {
      await fs.mkdir(modulesDirPath)
    }
    process.chdir(modulesDirPath)
    try {
      await fs.access(packageJsonPath, fs.constants.W_OK | fs.constants.R_OK)
    } catch {
      await fs.writeFile(packageJsonPath, JSON.stringify(modules.value))
    }
    modules.watch(modules => fs.writeFile(packageJsonPath, JSON.stringify(modules)))
    await reloadAllPackageJson()

    await install(coreModuleUrl, 'github')
  }
  export const install = async (url: string, mode: 'github') => {
    if (modules.value.module.find(v => v.origin.url == url)) {
      console.warn('Module was installed', url)
      return false
    }
    switch (mode) {
      case 'github':
        await installFromGithub(url)
    }
    await reloadAllPackageJson()
    return true
  }
  const installFromGithub = async (url: string) => {
    const name = url.split('/').at(-1)!
    await Git().clone(url, name)
    try {
      await fs.writeFile(path.join(modulesDirPath, name, 'origin.txt'), `github\n${url}`)
    } catch { }
  }
  export const reloadAllPackageJson = async () => {
    const allModules = await fs.readdir(modulesDirPath)
    for (const moduleDirName of allModules) {
      const basepath = path.join(modulesDirPath, moduleDirName)
      if (!(await fs.lstat(basepath)).isDirectory()) continue
      try {
        await fs.access(path.join(basepath, 'is-plugin'), fs.constants.W_OK | fs.constants.R_OK)
      } catch {
        continue
      }
      try {
        const content = <DefineConfig.PackageJson>JSON.parse((await fs.readFile(path.join(basepath, 'package.json'))).toString('utf-8'))
        const originRaw = <[from: string, url: string]>(await fs.readFile(path.join(basepath, 'origin.txt'))).toString('utf-8').split('\n')
        modulePackage.value.push(content)
        const old = modules.value.module.find(v => v.origin.url == originRaw[1])
        modules.value.module.push({
          enable: old?.enable ?? false,
          namespace: content.desktopCucumber.module.namespace,
          origin: {
            from: originRaw[0],
            url: originRaw[1]
          }
        })
      } catch (error) {
        console.error('Read Module Config Error', moduleDirName)
        console.error(error)
        throw error
      }
    }
    modules.update()
    modulePackage.update()
    console.log('reload all package json done', modules.value)
  }
}
