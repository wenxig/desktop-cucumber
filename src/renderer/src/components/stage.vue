<script setup lang="ts">
import { computed, provide, shallowReactive } from "vue"
import * as PIXI from "pixi.js"
import { until } from "@vueuse/core"
import { SharedValue } from "@renderer/helpers/ipc"
import { InjectKeys } from "@renderer/helpers/symbol"
import { useStageStore } from "@renderer/stores/stage"

const stageStore = useStageStore()

const isEditMode = new SharedValue<boolean>('isEditMode').toRef()
const isHideTaskbar = new SharedValue<boolean>('isFullScreen').toRef()
window.inject.api('tiggerTaskBarHideStatue')
const bgAlpha = computed(() =>
  isEditMode.value ? 1 : 1
    - (isHideTaskbar.value ? 0.3 : 0)
)
const createStage = (canvas: HTMLCanvasElement) => new PIXI.Application({
  view: canvas,
  width: screen.width,
  height: screen.height,
  backgroundAlpha: 0,
})
const canvases = shallowReactive(new Map<symbol, HTMLCanvasElement>())
const useStage = async () => {
  console.log('create stage...')
  const key = Symbol()
  stageStore.stages.set(key, undefined)
  await until(() => canvases.get(key)).toBeTruthy()
  stageStore.stages.set(key, createStage(canvases.get(key)!))
  console.log('create stage done')
  return [stageStore.stages.get(key), canvases.get(key)] as [PIXI.Application, HTMLCanvasElement]
}
provide(InjectKeys.useStage, useStage)
</script>

<template>
  <Touch>
    <Edit>
      <div :style="{ opacity: bgAlpha }" class='transition-all'>
        <canvas v-for="key of stageStore.stages.keys()" :ref="c => canvases.set(key, <any>c)" class='transition-all' />
      </div>
      <Suspense>
        <slot />
      </Suspense>
    </Edit>
  </Touch>
</template>