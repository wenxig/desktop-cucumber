<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed, shallowRef, inject } from "vue"
import { Live2DModel, } from "pixi-live2d-display-advanced"
import { toReactive, useLocalStorage, useMouse } from "@vueuse/core"
import { inRange, max, min } from "lodash-es"
import { numberMap } from "@renderer/helpers/number"
import { InjectKeys } from "@renderer/helpers/symbol"
import { ModleConfig } from "@renderer/type"
import { SharedValue } from "@renderer/helpers/ipc"
import { HitAreaFrames } from "pixi-live2d-display-advanced/extra"
const useStage = inject(InjectKeys.useStage)
const [app, canvas] = await useStage!()
const model = shallowRef<Live2DModel>()
const isEditMode = new SharedValue<boolean>('isEditMode').toRef()
const loadUrl = defineModel<string>('loadUrl', { required: true })
const $props = withDefaults(defineProps<{
  editable?: boolean
}>(), {
  editable: false
})
onMounted(() => {
  watch(loadUrl, loadUrl => {
    init(loadUrl)
  }, { immediate: true })
})
onBeforeUnmount(() => {
  model.value = undefined
})


const _modelConfig = defineModel<ModleConfig>('modelConfig')
const l__modelConfig = useLocalStorage<ModleConfig>('modelConfig', {
  x: 0,
  y: 0,
  rotate: 0,
  scale: 0.25
})
const modelConfig = computed<ModleConfig>({
  get() {
    return _modelConfig.value ?? l__modelConfig.value
  },
  set(v) {
    if (_modelConfig.value) {
      _modelConfig.value = v
    } else {
      l__modelConfig.value = v
    }
  }
})



const init = async (loadUrl: string) => {
  if (!app) return
  if (model.value) app.stage.removeChild(model.value)
  const m = model.value = await Live2DModel.from(loadUrl, {
    autoFocus: $props.editable,
  })
  m.transform.pivot.set(m.width / 2, m.height / 2)
  const mc = modelConfig.value
  m.scale.set(mc.scale)
  app.stage.addChild(m)
  m.x = mc.x || app.stage.width / 2
  m.y = mc.y || app.stage.height / 2
  m.angle = mc.rotate
  const hitAreaFrames = new HitAreaFrames()
  m.addChild(hitAreaFrames)
  hitAreaFrames.visible = true

  m.on('tap',()=>window.$message.info('taped'))
}
watch(modelConfig, ({ rotate, x, y, scale }) => {
  console.log('modelConfig changed')
  if (!model.value) return
  model.value.angle = rotate
  model.value.x = x
  model.value.y = y
  model.value.scale.set(scale)
}, { immediate: true, deep: true })

const headBox = ref<HTMLDivElement>()
const bodyBox = ref<HTMLDivElement>()

const mouse = toReactive(useMouse())
const distanceToPointerOpacity = computed(() => {
  if (!headBox.value) return 0
  const headBound = headBox.value.getBoundingClientRect()
  if (!inRange(mouse.x, headBound.x, headBound.x + headBound.width)
    || !inRange(mouse.y, headBound.y, headBound.y + headBound.height)) return 0
  const xDistance = mouse.x - (headBound.x + headBound.width / 2)
  const yDistance = mouse.y - (headBound.y + headBound.height / 2)
  const length = Math.sqrt((xDistance ** 2) + (yDistance ** 2))
  return min([numberMap(length, 50, headBound.width, 0.7, 0), 0.7]) ?? 0.7
})
const isOnBodyOpacity = computed(() => {
  if (!bodyBox.value) return 0
  const bodyBound = bodyBox.value.getBoundingClientRect()
  if (inRange(mouse.x, bodyBound.x, bodyBound.x + bodyBound.width)
    && inRange(mouse.y, bodyBound.y, bodyBound.y + bodyBound.height)) return 0.7
  return 0
})
watch([
  isEditMode,
  $props,
  distanceToPointerOpacity,
  isOnBodyOpacity
], () => {
  canvas.style.opacity = isEditMode.value ? ($props.editable ? '1' : '0.05') : `${max([1
    - distanceToPointerOpacity.value
    - isOnBodyOpacity.value
    , 0.1])}`
})
</script>

<template>
  <div v-if="model" :style="{
    left: `${modelConfig.x}px`,
    top: `${modelConfig.y}px`,
    width: `${model.width * 0.4}px`,
    height: `${model.height}px`,
    rotate: `${modelConfig.rotate}deg`,
    '--tw-scale-x': modelConfig.scale * 4,
    '--tw-scale-y': modelConfig.scale * 4
  }" :class="[isEditMode && 'pointer-events-none']"
    class="fixed z-10 bg-opacity-30 bg-red- origin-top-left -translate-x-1/2 -translate-y-1/3">
    <div class="absolute top-0 left-0 bg-green- bg-opacity-30 translate-x-0" @mouseenter.stop @mouseleave.stop :style="{
      width: `${model.width * 0.4}px`,
      height: `${model.width * 0.4}px`,
      rotate: `${-modelConfig.rotate}deg`,
      '--tw-scale-x': modelConfig.scale * 4,
      '--tw-scale-y': modelConfig.scale * 4
    }" ref="headBox">
      <!-- head -->
    </div>
    <div class="absolute left-0 bg-yellow- bg-opacity-30 translate-x-0" @mouseenter.stop @mouseleave.stop :style="{
      top: `${model.width * 0.4}px`,
      width: `${model.width * 0.4}px`,
      height: `${model.width * 0.4}px`,
      rotate: `${-modelConfig.rotate}deg`,
      '--tw-scale-x': modelConfig.scale * 4,
      '--tw-scale-y': modelConfig.scale * 4
    }" ref="bodyBox">
      <!-- body -->
    </div>
  </div>
</template>