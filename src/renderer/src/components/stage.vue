<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed, shallowRef, provide, shallowReactive, reactive } from "vue"
import * as PIXI from "pixi.js"
import { toReactive, until, useDraggable, useEventListener, useLocalStorage, useMouse } from "@vueuse/core"
import { SharedValue } from "@renderer/helpers/ipc"
import { createMessageStore } from "@renderer/helpers/message"
import { InjectKeys } from "@renderer/helpers/symbol"
import { ModleConfig } from "@renderer/type"
import { useStageStore } from "@renderer/stores/stage"


const stageStore = useStageStore()

const isEditMode = new SharedValue<boolean>('isEditMode').toRef()
const box = ref<HTMLDivElement>()


const modelConfig = useLocalStorage<ModleConfig>('modelConfig', {
  x: 0,
  y: 0,
  rotate: 0,
  scale: 0.25
})



const editTooltips = createMessageStore([
  ['quit', ['按下[esc]或再次点击[编辑]退出编辑']],
  ['drag', ['左键按住屏幕滑动以调整位置']]
])
watch(isEditMode, isEditMode => {
  if (isEditMode) editTooltips.showAll()
  else editTooltips.closeAll()
})
useEventListener('keydown', e => {
  if (e.key == 'Escape' && isEditMode.value) isEditMode.value = false
})


const positionSetter = ref<HTMLDivElement>()
const positionSetterDragInstance = toReactive(useDraggable(positionSetter, {
  initialValue: modelConfig.value,
}))
let lastMoveTime: number = Date.now()
watch(() => positionSetterDragInstance.position, (position, old) => {
  if (Date.now() - lastMoveTime > 200) return lastMoveTime = Date.now()
  lastMoveTime = Date.now()
  const x = (Math.abs(position.x) - Math.abs(old.x))
  if (x > 100) return
  modelConfig.value.x -= x
  const y = (Math.abs(position.y) - Math.abs(old.y))
  if (y > 100) return
  modelConfig.value.y -= y
})
const resetPosition = () => {
  modelConfig.value.x = screen.width / 2
  modelConfig.value.y = screen.height / 2
  modelConfig.value.rotate = 0
  modelConfig.value.scale = 0.25
}
const isHideTaskbar = new SharedValue<boolean>('isFullScreen').toRef()
window.inject.api('tiggerTaskBarHideStatue')


const createStage = (canvas: HTMLCanvasElement) => new PIXI.Application({
  view: canvas,
  width: screen.width,
  height: screen.height,
  backgroundAlpha: 0,
})
const bgAlpha = computed(() =>
  isEditMode.value ? 1 : 1
    - (isHideTaskbar.value ? 0.3 : 0)
)

const canvases = reactive(new Map<symbol, HTMLCanvasElement>())
const useStage = async () => {
  console.log('create stage...')
  const key = Symbol()
  stageStore.stages.set(key, undefined)
  await until(() => canvases.get(key)).toBeTruthy()
  stageStore.stages.set(key, createStage(canvases.get(key)!))
  console.log('create stage done')
  return [stageStore.stages.get(key)!, canvases.get(key)!] as [PIXI.Application, HTMLCanvasElement]
}
provide(InjectKeys.useStage, useStage)
</script>

<template>
  <div ref="box" :class="[isEditMode && '!bg-opacity-50']"
    class="right-0 size-full fixed bottom-0 bg-opacity-0 transition-all bg-black">
    <div :style="{ opacity: bgAlpha }" class='transition-all'>
      <canvas v-for="key of stageStore.stages.keys()" :ref="c => canvases.set(key, <any>c)" class='transition-all' />
    </div>
    <div v-if="isEditMode" :style="positionSetterDragInstance.style"
      class="size-[114514vw] -translate-x-1/2 -translate-y-1/2" ref="positionSetter">
    </div>
    <Suspense>
      <slot />
    </Suspense>
    <NSpace class="absolute left-2 bottom-2" v-if="isEditMode">
      <ButtonTooltip name="重置位置" @click="resetPosition">
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 20 20">
          <g fill="none">
            <path
              d="M6.03 2.47a.75.75 0 0 1 0 1.06L4.81 4.75H11A6.25 6.25 0 1 1 4.75 11a.75.75 0 0 1 1.5 0A4.75 4.75 0 1 0 11 6.25H4.81l1.22 1.22a.75.75 0 0 1-1.06 1.06l-2.5-2.5a.75.75 0 0 1 0-1.06l2.5-2.5a.75.75 0 0 1 1.06 0z"
              fill="currentColor"></path>
          </g>
        </svg>
      </ButtonTooltip>
      <ButtonSlider :step="0.01" :min="-180" :max="180" v-model="modelConfig.rotate" name="旋转模型">
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 16 16">
          <g fill="none">
            <path
              d="M8 3.25A4.75 4.75 0 0 0 3.25 8a.75.75 0 0 1-1.5 0a6.25 6.25 0 1 1 10.587 4.5h.913a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75v-2.5a.75.75 0 0 1 1.5 0v.461A4.75 4.75 0 0 0 8 3.25zM5.75 8a2.25 2.25 0 1 1 4.5 0a2.25 2.25 0 0 1-4.5 0zM8 7.25a.75.75 0 1 0 0 1.5a.75.75 0 0 0 0-1.5z"
              fill="currentColor"></path>
          </g>
        </svg>
      </ButtonSlider>
      <ButtonSlider v-model="modelConfig.scale" :step="0.01" :min="0.1" :max="2" name="缩放模型">
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24">
          <path
            d="M15.85 3.85L17.3 5.3l-2.18 2.16c-.39.39-.39 1.03 0 1.42c.39.39 1.03.39 1.42 0L18.7 6.7l1.45 1.45a.5.5 0 0 0 .85-.36V3.5c0-.28-.22-.5-.5-.5h-4.29a.5.5 0 0 0-.36.85zm-12 4.3L5.3 6.7l2.16 2.18c.39.39 1.03.39 1.42 0c.39-.39.39-1.03 0-1.42L6.7 5.3l1.45-1.45A.5.5 0 0 0 7.79 3H3.5c-.28 0-.5.22-.5.5v4.29c0 .45.54.67.85.36zm4.3 12L6.7 18.7l2.18-2.16c.39-.39.39-1.03 0-1.42c-.39-.39-1.03-.39-1.42 0L5.3 17.3l-1.45-1.45a.5.5 0 0 0-.85.36v4.29c0 .28.22.5.5.5h4.29a.5.5 0 0 0 .36-.85zm12-4.3L18.7 17.3l-2.16-2.18c-.39-.39-1.03-.39-1.42 0c-.39.39-.39 1.03 0 1.42l2.18 2.16l-1.45 1.45a.5.5 0 0 0 .36.85h4.29c.28 0 .5-.22.5-.5v-4.29a.5.5 0 0 0-.85-.36z"
            fill="currentColor"></path>
        </svg>
      </ButtonSlider>
    </NSpace>
  </div>
</template>