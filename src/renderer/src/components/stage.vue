<script setup lang="ts">
import { computed, markRaw, provide, Raw, shallowReactive } from "vue"
import { Application } from "pixi.js"
import { until } from "@vueuse/core"
import { InjectKeys } from "@renderer/helpers/symbol"
import { useStageStore } from "@renderer/stores/stage"
import { InjectFunction } from "@renderer/helpers/ipc"

const stageStore = useStageStore()

InjectFunction.fromSync('tiggerTaskBarHideStatue')()
const bgAlpha = computed(() =>
  stageStore.isEditMode ? 1 : 1
    - (stageStore.isFullScreen ? 0.3 : 0)
)
const createStage = (canvas: Raw<HTMLCanvasElement>) => markRaw(new Application({
  view: canvas,
  width: screen.width,
  height: screen.height,
  backgroundAlpha: 0,
}))
const canvases = shallowReactive(new Map<symbol, Raw<HTMLCanvasElement>>())
const useStage = async () => {
  const key = Symbol()
  stageStore.stages.set(key, undefined)
  await until(() => canvases.get(key)).toBeTruthy()
  stageStore.stages.set(key, createStage(canvases.get(key)!))
  return [stageStore.stages.get(key), canvases.get(key)] as [Raw<Application>, Raw<HTMLCanvasElement>]
}
provide(InjectKeys.useStage, useStage)
</script>

<template>
  <Touch>
    <Edit>
      <div :style="{ opacity: bgAlpha }" class='transition-all'>
        <canvas v-for="key of stageStore.stages.keys()" :ref="c => canvases.set(key, markRaw(<any>c))"
          class='transition-all' />
      </div>
      <Suspense>
        <slot />
      </Suspense>
    </Edit>
  </Touch>
</template>