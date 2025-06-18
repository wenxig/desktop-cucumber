<script setup lang='ts'>
defineEmits<{
  click: []
}>()
defineSlots<{
  default: HTMLElement
}>()
defineProps<{
  name: string
}>()
</script>

<template>
  <NPopover trigger="hover" placement="top-start">
    <template #trigger>
      <NButton size="large" circle class="!bg-white" @click.stop.prevent="$emit('click')">
        <template #icon>
          <NIcon>
            <slot />
          </NIcon>
        </template>
      </NButton>
    </template>
    <span>
      {{ name }}
    </span>
  </NPopover>
</template>