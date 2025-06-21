import { useMessage } from "naive-ui"
import { Inject } from "../../preload/type"
import * as PIXI from "pixi.js"
declare global {
  interface Window {
    $message: ReturnType<typeof useMessage>
    PIXI: PIXI
    inject: Inject
  }
}

export interface ModleConfig {
  x: number
  y: number
  rotate: number
  scale: number
}
export interface DefineModelFileC2 {
  version: string
  layout: Record<string, number>
  hit_areas_custom: Record<string, [x: number, y: number]>
  model: string
  physics: string
  textures: string[]
  motions: Record<string, { file: string }[]>
  expressions: {
    name: string,
    file: string
  }[]
}