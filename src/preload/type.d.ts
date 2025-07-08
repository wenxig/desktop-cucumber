import type { Platform } from "@electron-toolkit/utils"
import type { AnyFn } from "@vueuse/core"
import type { Rectangle } from "electron"
import { IPackageJson } from 'package-json-type'
export type Inject = {
  sharedValue: {
    sync(name: string, v: any): void
    boot<T>(name: string): T
    watch<T>(name: string, cb: (v: T) => void): () => void
  }
  injectFunction: {
    sync(name: string, ...v: any[]): InjectFunctionResult<Awaited<any>>
    call(name: string, ...v: any[]): Promise<InjectFunctionResult<any>>
  }
  event<T extends keyof On['event']>(event: T, callback: (...p: On['event'][T]) => void): () => void
}

export type On = {
  event: {
    'workspace-changed': [is: 'show' | 'hide'],
    'live2d-opened': []
  }
}


export namespace DefineConfig {
  export interface ModulesJson {
    module: Module[]
  }
  export type ModuleFrom = 'github' | 'local'
  export interface ModuleOrigin {
    from: ModuleFrom
    url: string
  }
  export interface Module {
    enable: boolean
    namespace: string
    displayName: string
    origin: ModuleOrigin,
    localPath: string
    package: PackageJson
    closeable: boolean
    models: ModelDefine[]
  }
  export interface PackageJson extends IPackageJson {
    desktopCucumber: Config
  }
  export interface Config {
    module: ModuleConfig
    models?: ModelDefine[]
  }
  export interface ModuleConfig {
    namespace: string
    displayName: string
    configVersion: number
  }
  export interface ModelDefine {
    id: string
    path: string
    extends?: ResourceLocation_[]
    name: string
    hitbox?: boolean
  }
  export type ResourceLocation_ = ResourceLocation | string
  export interface ResourceLocation {
    namespace: string
    id: string
  }

  export type ModelAssignedDefine = (DefineConfig.ModelDefine & { configUrl: string })


  export interface DefineModelFile extends object {

  }
}

export interface SharedValueType {
  isEditMode: boolean
  isFullScreen: boolean
  isTouchMode: boolean

  modules: DefineConfig.ModulesJson
  modulesBooting: boolean | Error
  modulesErrors: [name: string, error: string][]
  modelDefines: DefineConfig.ModelAssignedDefine[]

  platform: Platform
}

export type InjectFunctionResult<T> = {
  isError: false
  result: T
} | {
  isError: true
  result: unknown
}
export interface InjectFunctionType {
  "ModuleManager.info"(url: string, mode: DefineConfig.ModuleFrom, fork?: string): Promise<DefineConfig.PackageJson | false>
  "ModuleManager.install"(url: string, mode: DefineConfig.ModuleFrom, fork?: string): Promise<boolean>
  "ModuleManager.uninstall"(namespace: string): Promise<boolean>
  "ModuleManager.gitLsRemote"(url: string): Promise<string[]>
  "ModuleManager.done"(): Promise<void>
  triggerTaskBarHideStatue(): boolean
  live2dDone(): void
}
