import { SharedValue } from "@renderer/helpers/ipc"
import { defineStore } from "pinia"
import type { Application } from "pixi.js"
import { shallowReactive, type Raw } from "vue"

export const useStageStore = defineStore('stageStore', () => {
  const stages = shallowReactive(new Map<symbol, Raw<Application> | undefined>())
  const isTouchMode = new SharedValue<boolean>('isTouchMode')
  const isEditMode = new SharedValue<boolean>('isEditMode')
  const isFullScreen = new SharedValue<boolean>('isFullScreen')
  return {
    stages,
    isTouchMode: isTouchMode.toRef(),
    isEditMode: isEditMode.toRef(),
    isFullScreen: isFullScreen.toRef()
  }
})