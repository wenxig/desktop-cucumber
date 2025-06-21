import { defineStore } from "pinia"
import type { Application } from "pixi.js"
import { shallowReactive } from "vue"

export const useStageStore = defineStore('stageStore', () => {
  const stages = shallowReactive(new Map<symbol, Application | undefined>())
  return { stages }
})