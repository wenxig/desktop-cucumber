<script setup lang='ts'>
import ButtonTooltip from './buttonTooltip.vue';

const modelValue = defineModel<number>({ required: true })
defineProps<{
  name: string,
  min: number,
  max: number,
  step: number
}>()
defineSlots<{
  default: HTMLElement
}>()

</script>

<template>
  <NPopselect :options="[]" trigger="click" class="!w-80">
    <ButtonTooltip :name>
      <slot />
    </ButtonTooltip>
    <template #header>
      <span class="pl-1">{{ name }}</span>
    </template>
    <template #empty>
      <NSlider v-model:value="modelValue" :step :min :max />
    </template>
    <template #action>
      <NInputNumber v-model:value="modelValue" :step :min :max />
    </template>
  </NPopselect>
</template>