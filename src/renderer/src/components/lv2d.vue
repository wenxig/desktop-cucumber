<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed, shallowRef, inject } from "vue"
import { Live2DModel, } from "pixi-live2d-display-advanced"
import { toReactive, useLocalStorage, useMouse } from "@vueuse/core"
import { numberMap } from "@renderer/helpers/number"
import { InjectKeys } from "@renderer/helpers/symbol"
import { ModleConfig } from "@renderer/type"
import { SharedValue } from "@renderer/helpers/ipc"
const isEditMode = new SharedValue<boolean>('isEditMode').toRef()
const $props = withDefaults(defineProps<{
  controlable?: boolean
}>(), {
  controlable: false
})

onMounted(() => {
  watch(loadUrl, loadUrl => {
    init(loadUrl)
  }, { immediate: true })
})
onBeforeUnmount(() => {
  model.value = undefined
})
const loadUrl = defineModel<string>('loadUrl', { required: true })
const useStage = inject(InjectKeys.useStage)
const [app, canvas] = await useStage!()
const model = shallowRef<Live2DModel>()
const init = async (loadUrl: string) => {
  if (!app) return
  if (model.value) app.stage.removeChild(model.value)
  const m = model.value = await Live2DModel.from(loadUrl, {
    autoFocus: !!$props.controlable,
  })
  m.transform.pivot.set(m.width / 2, m.height / 2)
  const mc = modelConfig.value
  m.scale.set(mc.scale)
  app.stage.addChild(m)
  m.x = mc.x || app.stage.width / 2
  m.y = mc.y || app.stage.height / 2
  m.angle = mc.rotate
}

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
watch(modelConfig, ({ rotate, x, y, scale }) => {
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
  const head = headBox.value
  if (!head) return 0
  const { x: hX, y: hY, width: hW, height: hH } = head.getBoundingClientRect()
  const { x: mX, y: mY } = mouse
  if (
    mX < hX || mX > hX + hW ||
    mY < hY || mY > hY + hH
  ) return 0
  const centerX = hX + (hW / 2)
  const centerY = hY + (hH / 2)
  const dx = mX - centerX
  const dy = mY - centerY
  const dist = Math.hypot(dx, dy)
  const mapped = numberMap(dist, 50, hW, 0.7, 0)
  return Math.max(0, Math.min(mapped, 0.7))
})
const isOnBodyOpacity = computed(() => {
  const body = bodyBox.value
  if (!body) return 0
  const { x, y, width, height } = body.getBoundingClientRect()
  const { x: mX, y: mY } = mouse
  if (mX < x || mX > x + width || mY < y || mY > y + height) return 0
  return 0.7
})
const opacityWatcher = watch([
  distanceToPointerOpacity,
  isOnBodyOpacity
], () => {
  canvas.style.opacity = `${Math.max(1
    - distanceToPointerOpacity.value
    - isOnBodyOpacity.value
    , 0.1)}`
})
watch(isEditMode, isEditMode => {
  if (isEditMode) {
    opacityWatcher.pause()
    canvas.style.opacity = $props.controlable ? '1' : '0.05'
    return
  }
  opacityWatcher.resume()
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
    class="fixed z-10 origin-top-left -translate-x-1/2 -translate-y-1/3">
    <div class="absolute top-0 left-0 translate-x-0" @mouseenter.stop @mouseleave.stop :style="{
      width: `${model.width * 0.4}px`,
      height: `${model.width * 0.4}px`,
      rotate: `${-modelConfig.rotate}deg`,
      '--tw-scale-x': modelConfig.scale * 4,
      '--tw-scale-y': modelConfig.scale * 4
    }" ref="headBox">
      <!-- head -->
    </div>
    <div class="absolute left-0 translate-x-0" @mouseenter.stop @mouseleave.stop :style="{
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