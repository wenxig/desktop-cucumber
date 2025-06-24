import type { Application } from "pixi.js"
import type { InjectionKey, Raw } from "vue"

export namespace InjectKeys {
  export const useStage: InjectionKey<() => Promise<[Raw<Application>, Raw<HTMLCanvasElement>]>> = Symbol('useStage')
}