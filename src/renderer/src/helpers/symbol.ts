import type { Application } from "pixi.js"
import type { InjectionKey } from "vue"

export namespace InjectKeys {
  export const useStage: InjectionKey<() => Promise<[Application, HTMLCanvasElement]>> = Symbol('useStage')
}