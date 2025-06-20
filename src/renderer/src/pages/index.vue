<script setup lang='ts'>
import Lv2d from '@renderer/components/lv2d.vue'
import { SharedValue } from '@renderer/helpers/ipc'
const isEditMode = (new SharedValue<boolean>('isEditMode')).toRef()
window.inject.event('edit-mode-changed', to => {
  isEditMode.value = to
})
</script>

<template>
  <Lv2d v-model:isEditMode="isEditMode" />
</template>