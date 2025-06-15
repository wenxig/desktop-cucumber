import { useMessage } from "naive-ui"
import { Inject } from "../../preload/type"
import * as PIXI from "pixi.js"
declare global {
  interface Window extends Inject {
    $message: ReturnType<typeof useMessage>
    PIXI: PIXI
  }
}

export interface KnownTags {
  anthor: Record<string, number>
  character: Record<string, Set<string>>
  origin: Record<string, number>
}
