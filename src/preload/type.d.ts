import type { Rectangle } from "electron"
type Api = {
  tiggerTaskBarHideStatue: []
  moduleDone: []
}
export type Inject = {
  api<T extends keyof Api>(k: T, ...args: Api[T]): void
  sharedValue: {
    sync(name: string, v: any): void
    boot<T>(name: string): T
    watch<T>(name: string, cb: (v: T) => void): () => void
  }
  event<T extends keyof On['event']>(event: T, callback: (...p: On['event'][T]) => void): () => void
}

export type On = {
  event: {
    'workspace-changed': [is: 'show' | 'hide']
  }
}

import { IPackageJson } from 'package-json-type'

export namespace DefineConfig {
  export interface ModulesJson {
    module: Module[]
  }
  export type ModuleFrom = 'github' | 'local'
  export interface ModuleOrigin{
    from: ModuleFrom
    url: string
  }
  export interface Module {
    enable: false | number
    namespace: string
    displayName: string
    origin: ModuleOrigin,
    localPath: string
    package: PackageJson
  }
  export interface PackageJson extends IPackageJson {
    desktopCucumber: Config
  }
  export interface Config {
    module: ModuleConfig
    models: ModelDefine[]
  }
  export interface ModuleConfig {
    namespace: string
    displayName: string
    configVersion: number
  }
  export interface ModelDefine {
    id: string
    path: string
    extends?: _ResourceLocation[]
    name: string
    hitbox?: boolean
  }
  export type _ResourceLocation = ResourceLocation | string
  export interface ResourceLocation {
    namespace: string
    id: string
  }
}

export interface SharedValueType {
  isEditMode: boolean
  isFullScreen: boolean
  isTouchMode: boolean

  modules: DefineConfig.ModulesJson
  modulesBooting: boolean
}