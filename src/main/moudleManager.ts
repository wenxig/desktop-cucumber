import fs from "fs/promises"
import path from 'path'
import { SharedValue, type WindowManager } from "./helper"
import type { MoudlesJson } from "../preload/type"
const coreMoudleUrl = 'https://github.com/wenxig/desktop-cucumber_core'
export namespace MoudleManger {
  export const moudlesDirPath = path.join(__dirname, 'appMoudles')
  export const packageJsonPath = path.join(moudlesDirPath, 'moudles.json')


  let _moudles: SharedValue<MoudlesJson> | undefined
  export const moudles = () => _moudles

  export const init = async (windowManager: WindowManager) => {
    try {
      await fs.access(moudlesDirPath, fs.constants.W_OK | fs.constants.R_OK)
    } catch {
      await fs.mkdir(moudlesDirPath)
    }
    process.chdir(moudlesDirPath)
    _moudles = new SharedValue<MoudlesJson>({
      moudle: [
        {
          enable: true,
          type: 'github',
          url: coreMoudleUrl
        }
      ]
    }, 'moudles', windowManager)
    try {
      await fs.access(packageJsonPath, fs.constants.W_OK | fs.constants.R_OK)
    } catch {
      await fs.writeFile(packageJsonPath, JSON.stringify(_moudles.value))
    }
    _moudles.watch(moudles => fs.writeFile(packageJsonPath, JSON.stringify(moudles)))
  }
}