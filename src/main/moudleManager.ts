import fs from "fs/promises"
import path from 'path'
import { RefValue, SharedValue } from "./helper"
import type { DefineConfig } from "../preload/type"
import simpleGit from 'simple-git'
import { IPackageJson } from 'package-json-type'
const coreMoudleUrl = 'https://github.com/wenxig/desktop-cucumber_core'
export namespace MoudleManger {
  export const moudlesDirPath = path.join(__dirname, 'appMoudles')
  export const packageJsonPath = path.join(moudlesDirPath, 'moudles.json')
  const Git = () => simpleGit(moudlesDirPath)

  export const moudles = new SharedValue<DefineConfig.MoudlesJson>({
    moudle: []
  }, 'moudles')
  export const modulePackage = new SharedValue<DefineConfig.PackageJson[]>([], 'modulePackage')

  export const init = async () => {
    try {
      await fs.access(moudlesDirPath, fs.constants.W_OK | fs.constants.R_OK)
    } catch {
      await fs.mkdir(moudlesDirPath)
    }
    process.chdir(moudlesDirPath)
    try {
      await fs.access(packageJsonPath, fs.constants.W_OK | fs.constants.R_OK)
    } catch {
      await fs.writeFile(packageJsonPath, JSON.stringify(moudles.value))
    }
    moudles.watch(moudles => fs.writeFile(packageJsonPath, JSON.stringify(moudles)))
    await reloadAllPackageJson()

    await install(coreMoudleUrl, 'github')
  }
  export const install = async (url: string, mode: 'github') => {
    if (moudles.value.moudle.find(v => v.origin.url == url)) {
      console.warn('Moudle was installed', url)
      return false
    }
    switch (mode) {
      case 'github':
        await installFromGithub(url)
    }
    return true
  }
  const installFromGithub = async (url: string) => {
    const name = url.split('/').at(-1)!
    await Git().clone(url, name)
    try {
      await fs.writeFile(path.join(moudlesDirPath, name, 'origin.txt'), `github\n${url}`)
    } catch { }
  }
  export const reloadAllPackageJson = async () => {
    const allMoudles = await fs.readdir(moudlesDirPath)
    for (const moudleDirName of allMoudles) {
      const basepath = path.join(moudlesDirPath, moudleDirName)
      try {
        const content = <DefineConfig.PackageJson>JSON.parse((await fs.readFile(path.join(basepath, 'package.json'))).toString('utf-8'))
        const originRaw = <[from: string, url: string]>(await fs.readFile(path.join(basepath, 'origin.txt'))).toString('utf-8').split('\n')
        modulePackage.value.push(content)
        const old = moudles.value.moudle.find(v => v.origin.url == originRaw[1])
        moudles.value.moudle.push({
          enable: old?.enable ?? false,
          namespace: content.desktopCucumber.moudle.namespace,
          origin: {
            from: originRaw[0],
            url: originRaw[1]
          }
        })
      } catch (error) {
        console.error('Read Moudle Config Error', moudleDirName)
        console.error(error)
        throw error
      }
    }
    moudles.update()
    modulePackage.update()
  }
}
