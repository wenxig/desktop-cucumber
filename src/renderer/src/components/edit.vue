<script setup lang='ts'>
import { watch, shallowRef } from "vue"
import { toReactive, useDraggable, useEventListener, useLocalStorage } from "@vueuse/core"
import { ModelConfig } from "@renderer/type"
import { createMessageStore } from "@renderer/helpers/message"
import { useStageStore } from "@renderer/stores/stage"
import { ZoomOutMapRound, CropRotateRound, UndoRound } from "@vicons/material"
const stageStore = useStageStore()

const editTooltips = createMessageStore([
  ['quit', ['按下[esc]或再次点击[编辑]退出编辑']],
  ['drag', ['左键按住屏幕滑动以调整位置']]
])
watch(() => stageStore.isEditMode, isEditMode => {
  if (isEditMode) editTooltips.showAll()
  else editTooltips.closeAll()
})
useEventListener('keydown', e => {
  if (e.key == 'Escape' && stageStore.isEditMode) stageStore.isEditMode = false
})

const modelConfig = useLocalStorage<ModelConfig>('modelConfig', {
  x: 0,
  y: 0,
  rotate: 0,
  scale: 0.25
})
const positionSetter = shallowRef<HTMLDivElement>()
const positionSetterDragInstance = toReactive(useDraggable(positionSetter, {
  initialValue: modelConfig.value,
}))
let lastMoveTime: number = Date.now()
const configSetter = watch(() => positionSetterDragInstance.position, (position, old) => {
  if (Date.now() - lastMoveTime > 200) return lastMoveTime = Date.now()
  lastMoveTime = Date.now()
  const x = (Math.abs(position.x) - Math.abs(old.x))
  if (x > 100) return
  modelConfig.value.x -= x
  const y = (Math.abs(position.y) - Math.abs(old.y))
  if (y > 100) return
  modelConfig.value.y -= y
})
watch(() => stageStore.isEditMode, isEditMode => {
  if (isEditMode) {
    configSetter.resume()
    return
  }
  configSetter.pause()
})
const resetPosition = () => {
  modelConfig.value.x = screen.width / 2
  modelConfig.value.y = screen.height / 2
  modelConfig.value.rotate = 0
  modelConfig.value.scale = 0.25
}

</script>

<template>
  <div :class="[stageStore.isEditMode && 'bg-black/50']"
    class="right-0 size-full fixed bottom-0 transition-all bg-black/0">
    <slot />
    <div v-if="stageStore.isEditMode" :style="positionSetterDragInstance.style"
      class="size-[114514vw] -translate-x-1/2 -translate-y-1/2" ref="positionSetter">
    </div>
    <NSpace class="absolute left-2 bottom-2" v-if="stageStore.isEditMode">
      <ButtonTooltip name="重置位置" @click="resetPosition">
        <UndoRound />
      </ButtonTooltip>
      <ButtonSlider :step="0.01" :min="-180" :max="180" v-model="modelConfig.rotate" name="旋转模型">
        <CropRotateRound />
      </ButtonSlider>
      <ButtonSlider v-model="modelConfig.scale" :step="0.01" :min="0.1" :max="2" name="缩放模型">
        <ZoomOutMapRound />
      </ButtonSlider>
    </NSpace>
  </div>
</template>