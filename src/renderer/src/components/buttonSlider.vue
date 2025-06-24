<script setup lang='ts'>

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
  <NPopover trigger="hover" placement="top-start">
    <template #trigger>
      <NPopselect :options="[]" trigger="click" class="!w-80">
        <NButton size="large" circle class="!bg-white" @click.stop.prevent>
          <template #icon>
            <NIcon>
              <slot />
            </NIcon>
          </template>
        </NButton>
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
    <span>
      {{ name }}
    </span>
  </NPopover>
</template>