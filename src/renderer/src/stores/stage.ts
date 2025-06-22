import { SharedValue } from "@renderer/helpers/ipc"
import { isString } from "lodash-es"
import { defineStore } from "pinia"
import type { Application } from "pixi.js"
import { computed, shallowReactive } from "vue"

export const useStageStore = defineStore('stageStore', () => {
  const stages = shallowReactive(new Map<symbol, Application | undefined>())
  const isTouchMode = new SharedValue<boolean>('isTouchMode')
  const isEditMode = new SharedValue<boolean>('isEditMode')
  const useIsInUncommenMode = (expect: string | string[]) => {
    expect = isString(expect) ? [expect] : expect
    const knownUncommenState = [isTouchMode, isEditMode]
    return computed(() => {
      const filtered = knownUncommenState.filter(v => !expect.includes(v.name))
      return filtered.some(v => v.value)
    })
  }
  return { stages, isTouchMode: isTouchMode.toRef(), isEditMode: isEditMode.toRef(), useIsInUncommenMode }
})