<script setup lang='ts'>
import { useStageStore } from '@renderer/stores/stage'
import { toReactive, useMouse } from '@vueuse/core'
import { motion } from 'motion-v'
const mouse = toReactive(useMouse())
const stageStore = useStageStore()
</script>

<template>
  <AnimatePresence class="fixed -z-[1]">
    <div class="fixed size-full top-0 transition-all duration-200 left-0"
      :class="[(stageStore.isEditMode ? false : stageStore.isTouchMode) ? 'bg-white/[0.7] backdrop-blur-none' : 'bg-white/[0] backdrop-blur-none']">
      <slot />
    </div>
    <motion.div v-if="stageStore.isTouchMode" :style="{
      left: `${mouse.x}px`,
      top: `${mouse.y}px`
    }" class="rounded-full absolute bg-green-300 size-8 pointer-events-none -translate-x-1/2 -translate-y-1/2"></motion.div>
  </AnimatePresence>
</template>