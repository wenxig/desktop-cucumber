<script setup lang='ts'>
import { motion } from "motion-v"
defineSlots<{
  default: any
}>()
defineProps<{
  text: string
  class?: any
  size: number
}>()


</script>

<template>
  <NButton class="!bg-white/80 flex items-center backdrop-blur-3xl" :class round @click.stop.prevent="$emit('click')" size="large">
    <NIcon>
      <slot />
    </NIcon>
    <motion.div :animate="{
      width: 'auto',
      transition: {
        duration: .5,
        ease: [0.62, 0.10, 0.41, 1]
      }
    }" :initial="{ width: 0 }" class="ml-2 text-nowrap">{{ text }}</motion.div>
  </NButton>
</template>