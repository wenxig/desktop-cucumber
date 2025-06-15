<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, reactive, watch, computed } from "vue"

import * as PIXI from "pixi.js"
// @ts-ignore
import { Live2DModel } from "pixi-live2d-display/cubism2" // 只需要 Cubism 2
import type { Live2DModel as _Live2DModel, Live2DFactoryOptions } from "pixi-live2d-display"
import { useDraggable, useEventListener, useKeyModifier, useLocalStorage } from "@vueuse/core"
import { MessageReactive, NButton } from "naive-ui"
import { createLoadingMessage } from "@renderer/helpers/message"

window.PIXI = PIXI // 为了pixi-live2d-display内部调用

let app: PIXI.Application | undefined// 为了存储pixi实例
let model: _Live2DModel | undefined// 为了存储live2d实例

onMounted(() => {
  init()
})

onBeforeUnmount(() => {
  app = undefined
  model = undefined
})
const canvas = ref<HTMLCanvasElement>()
const box = ref<HTMLDivElement>()
const modelPosition = useLocalStorage('modelPosition', {
  x: 0,
  y: 0,
  rotate: 0
})
const init = async () => {
  if (!box.value) return
  // 创建PIXI实例
  app = new PIXI.Application({
    // 指定PixiJS渲染器使用的HTML <canvas> 元素
    view: canvas.value,
    width: box.value.getBoundingClientRect().width,
    height: box.value.getBoundingClientRect().height,
    backgroundAlpha: 0,

  })
  // 引入live2d模型文件
  model = await Live2DModel.from("/live2d_musumi/model.json", <Live2DFactoryOptions>{
    autoInteract: true
  }) as _Live2DModel
  model.scale.set(0.25)
  app.stage.addChild(model)
  model.x = modelPosition.value.x || app.stage.width / 2
  model.y = modelPosition.value.y

}
const isEditMode = defineModel<boolean>('editMode')

const messages: Record<string, MessageReactive | undefined> = {}
watch(isEditMode, isEditMode => {
  if (isEditMode) {
    messages.quit = window.$message.info('按下[esc]或再次点击[编辑]退出编辑', { duration: 0 })
    messages.drag = window.$message.info('左键按住屏幕滑动以调整位置', { duration: 0 })
  } else {
    messages.drag?.destroy()
    messages.quit?.destroy()
  }
})
useEventListener('keydown', e => {
  if (e.key == 'Escape' && isEditMode.value) {
    isEditMode.value = false
  }
})
const positionSetter = ref<HTMLDivElement>()
const { style, position } = useDraggable(positionSetter, {
  initialValue: modelPosition.value,
})
let lastMoveTime: number = Date.now()
watch(position, (position, old) => {
  if (!model) return
  if (Date.now() - lastMoveTime > 200) return lastMoveTime = Date.now()
  lastMoveTime = Date.now()
  const x = (Math.abs(position.x) - Math.abs(old.x))
  if (x > 100) return
  modelPosition.value.x -= x
  const y = (Math.abs(position.y) - Math.abs(old.y))
  if (y > 100) return
  modelPosition.value.y -= y
})
const resetPosition = () => {
  if (!app || !model) return
  modelPosition.value.x = app.stage.width / 2
  modelPosition.value.y = 0
  model.rotation = modelPosition.value.rotate = 0
}
watch(modelPosition.value, ({ rotate }) => {
  if (!model) return
  model.rotation = rotate
  model.x = modelPosition.value.x
  model.y = modelPosition.value.y
})
</script>

<template>
  <div ref="box" :class="[isEditMode && 'bg-opacity-50']"
    class="right-0 size-full fixed bottom-0 bg-opacity-0 transition-all bg-black">
    <canvas ref="canvas" />
    <div v-if="editMode" :style="[style]" class="size-[114514vw] -translate-x-1/2 -translate-y-1/2"
      ref="positionSetter">
    </div>
    <NSpace class="absolute left-2 bottom-2" v-if="editMode">
      <NPopover trigger="hover" placement="top-start">
        <template #trigger>
          <NButton size="large" circle class="!bg-white" @click.stop.prevent="resetPosition">
            <template #icon>
              <NIcon>
                <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 20 20">
                  <g fill="none">
                    <path
                      d="M6.03 2.47a.75.75 0 0 1 0 1.06L4.81 4.75H11A6.25 6.25 0 1 1 4.75 11a.75.75 0 0 1 1.5 0A4.75 4.75 0 1 0 11 6.25H4.81l1.22 1.22a.75.75 0 0 1-1.06 1.06l-2.5-2.5a.75.75 0 0 1 0-1.06l2.5-2.5a.75.75 0 0 1 1.06 0z"
                      fill="currentColor"></path>
                  </g>
                </svg>
              </NIcon>
            </template>
          </NButton>
        </template>
        <span>重置位置</span>
      </NPopover>

      <NPopselect :options="[]" trigger="click" class="!w-80">
        <NButton size="large" circle class="!bg-white" @click.stop.prevent>
          <template #icon>
            <NIcon>
              <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 16 16">
                <g fill="none">
                  <path
                    d="M8 3.25A4.75 4.75 0 0 0 3.25 8a.75.75 0 0 1-1.5 0a6.25 6.25 0 1 1 10.587 4.5h.913a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75v-2.5a.75.75 0 0 1 1.5 0v.461A4.75 4.75 0 0 0 8 3.25zM5.75 8a2.25 2.25 0 1 1 4.5 0a2.25 2.25 0 0 1-4.5 0zM8 7.25a.75.75 0 1 0 0 1.5a.75.75 0 0 0 0-1.5z"
                    fill="currentColor"></path>
                </g>
              </svg>
            </NIcon>
          </template>
        </NButton>
        <template #header>
          <span class="pl-1">旋转模型</span>
        </template>

        <template #empty>
          <NSlider v-model:value="modelPosition.rotate" :step="0.01" :min="-3.14" :max="3.14" />
        </template>
        <template #action>

        </template>
      </NPopselect>
    </NSpace>
  </div>
</template>