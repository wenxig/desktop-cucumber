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