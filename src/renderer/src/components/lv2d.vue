<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed, shallowRef } from "vue"
import * as PIXI from "pixi.js"
import { Live2DModel, } from "pixi-live2d-display/cubism2" // 只需要 Cubism 2
import { toReactive, useDraggable, useEventListener, useLocalStorage, useMouse } from "@vueuse/core"
import type { MessageReactive } from "naive-ui"
import { max } from "lodash-es"
window.PIXI = PIXI // 为了pixi-live2d-display内部调用

let app: PIXI.Application | undefined// 为了存储pixi实例
const model = shallowRef<Live2DModel>()

onMounted(() => {
  init()
})

onBeforeUnmount(() => {
  app = undefined
  model.value = undefined
})
const canvas = ref<HTMLCanvasElement>()
const box = ref<HTMLDivElement>()
const modelConfig = useLocalStorage('modelConfig', {
  x: 0,
  y: 0,
  rotate: 0,
  scale: 0.25
})
const init = async () => {
  if (!box.value) return
  // 创建PIXI实例
  app = new PIXI.Application({
    // 指定PixiJS渲染器使用的HTML <canvas> 元素
    view: canvas.value,
    width: screen.width,
    height: screen.height,
    backgroundAlpha: 0
  })
  // 引入live2d模型文件
  const m = model.value = await Live2DModel.from("/live2d_musumi/model.json", {
    autoInteract: true,
  })
  m.transform.pivot.set(m.width / 2, m.height / 2)
  const mc = modelConfig.value
  m.scale.set(mc.scale)
  app.stage.addChild(m)
  m.x = mc.x || app.stage.width / 2
  m.y = mc.y || app.stage.height / 2
  m.angle = mc.rotate
  console.log(m)
  // const hitarea = new HitAreaFrames()
  // hitarea.visible = true
  // m.addChild(hitarea)
  // 没用, wsd没考虑点击, 所以没有身体部件
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
  initialValue: modelConfig.value,
})
let lastMoveTime: number = Date.now()
watch(position, (position, old) => {
  if (!model) return
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
  if (!app || !model.value) return
  modelConfig.value.x = app.stage.width / 2
  modelConfig.value.y = app.stage.height / 2
  model.value.rotation = modelConfig.value.rotate = 0
  modelConfig.value.scale = 0.25
}
const isHideTaskbar = shallowRef(false)
window.inject.event('full-screen-changed', (isFulled) => {
  console.log('full-screen-changed', isFulled)
  isHideTaskbar.value = isFulled
})
watch(modelConfig, ({ rotate, x, y, scale }) => {
  console.log('modelConfig changed')
  if (!model.value) return console.warn('can not find model')
  model.value.angle = rotate
  model.value.x = x
  model.value.y = y
  model.value.scale.set(scale)
}, { immediate: true, deep: true })


window.inject.api.tiggerTaskBarHideStatue()

const mouse = toReactive(useMouse())
const distanceToPointerOpacity = computed(() => {
  if (!model.value) return 0
  const md = model.value
  const xDistance = mouse.x - md.x
  const yDistance = mouse.y - md.y
  if (yDistance < -200 || xDistance < -200 || yDistance > 200 || xDistance > 200) return 0
  const length = Math.sqrt((xDistance ** 2) + (yDistance ** 2))
  const v = (200 -
    length > 200 ? length : 200
  ) / 200
  return v > 0.7 ? 0.7 : v
})
const canvasOpacity = computed(() =>
  isEditMode.value ? 1 :
    max([(
      1
      - (isHideTaskbar.value ? 0.3 : 0)
      - distanceToPointerOpacity.value
    ), 0.1]) || 0.1)
</script>

<template>
  <div ref="box" :class="[isEditMode && '!bg-opacity-50']"
    class="right-0 size-full fixed bottom-0 bg-opacity-0 transition-all bg-black">
    <canvas ref="canvas" :style="{ opacity: canvasOpacity }" class='transition-all' />
    <div v-if="editMode" :style class="size-[114514vw] -translate-x-1/2 -translate-y-1/2" ref="positionSetter">
    </div>
    <div v-if="model" :style="{
      left: `${modelConfig.x}px`,
      top: `${modelConfig.y + model.height * 0.15}px`,
      width: `${model.width * 0.4}px`,
      height: `${model.height}px`,
      rotate: `${modelConfig.rotate}deg`,
      '--tw-scale-x': modelConfig.scale * 4,
      '--tw-scale-y': modelConfig.scale * 4
    }" :class="[isEditMode && 'pointer-events-none']"
      class="fixed z-10 bg-opacity-30 -translate-x-1/2 -translate-y-1/2">
      <!-- hitbox -->
    </div>
    <NSpace class="absolute left-2 bottom-2" v-if="editMode">
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