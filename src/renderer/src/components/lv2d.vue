<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, computed, shallowRef, inject, markRaw, Raw } from "vue"
import { Live2DModel, } from "pixi-live2d-display-advanced"
import { useLocalStorage } from "@vueuse/core"
import { InjectKeys } from "@renderer/helpers/symbol"
import { ModleConfig } from "@renderer/type"
import { useStageStore } from "@renderer/stores/stage"
import { debounce } from "lodash-es"
import { HitAreaFrames } from "pixi-live2d-display-advanced/extra"
const stageStore = useStageStore()
const $props = withDefaults(defineProps<{
  controlable?: boolean
}>(), {
  controlable: false
})

onMounted(() => {
  watch(loadUrl, async loadUrl => {
    await init(loadUrl)
  }, { immediate: true })
})
onBeforeUnmount(() => {
  model.value = undefined
})
const loadUrl = defineModel<string>('loadUrl', { required: true })
const useStage = inject(InjectKeys.useStage)
const [app, canvas] = await useStage!()
const model = shallowRef<Raw<Live2DModel>>()
const init = async (loadUrl: string) => {
  if (!app) return
  if (model.value) app.stage.removeChild(model.value)
  const m = model.value = markRaw(await Live2DModel.from(loadUrl, {
    autoFocus: !!$props.controlable,
  }))
  m.transform.pivot.set(m.width / 2, m.height / 2)
  const mc = modelConfig.value
  m.scale.set(mc.scale)
  app.stage.addChild(m)
  m.x = mc.x || app.stage.width / 2
  m.y = mc.y || app.stage.height / 2
  m.angle = mc.rotate
  const hit=new HitAreaFrames()
  hit.visible=true
  m.addChild(hit)
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





const headBox = shallowRef<HTMLDivElement>()
const bodyBox = shallowRef<HTMLDivElement>()
const isHoveringModel = shallowRef(false)
watch(model, model => {
  if (!model) return
  model.on('mouseenter', () => {
    isHoveringModel.value = true
    console.log('mouseenter')
  })
  model.on('mouseleave', () => {
    isHoveringModel.value = false
    console.log('mouseleave')
  })
})
watch(() => [isHoveringModel.value, stageStore.isEditMode, stageStore.isTouchMode, $props.controlable] as const, debounce(([isHoveringModel, isEditMode, isTouchMode, controlable]) => {
  if (isEditMode || isTouchMode) {
    canvas.style.opacity = controlable ? '1' : '0.05'
    return
  }
  canvas.style.opacity = `${1 + (isHoveringModel ? -0.7 : 0)}`
}, 100))
// debounce+truncate
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
  }" :class="[stageStore.isEditMode && 'pointer-events-none']"
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