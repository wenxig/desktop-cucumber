<script setup lang='ts'>
import { SharedValue } from '@renderer/helpers/ipc'
import { SettingsInputComponentRound } from '@vicons/material'

const modules = new SharedValue('modules').toRef()
</script>

<template>
  <NScrollbar class="size-full">
    <TransitionGroup tag="ul" name="list">
      <NAlert v-for="m of modules.module" :key="m.namespace" :title="m.displayName" type="default"
        class="w-[90%] mx-auto mt-1">
        <template #icon>
          <SettingsInputComponentRound />
        </template>
        <NEl tag="span" class="text-(--text-color-3) -ml-4 italic font-bold mr-1" v-if="m.package.version">
          v{{ m.package.version }}
        </NEl>
        {{ m.package.description }}
      </NAlert>
    </TransitionGroup>
  </NScrollbar>
</template>
<style scoped>
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.list-leave-active {
  position: absolute;
}
</style>