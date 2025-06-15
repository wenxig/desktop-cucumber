<script setup lang='ts'>
import Lv2d from '@renderer/components/lv2d.vue'
import { ref, watch } from 'vue'
const editMode = ref(false)
window.inject.event('edit-mode-changed', to => {
  editMode.value = to
})
watch(editMode, editMode => window.inject.api.changeEditMode(editMode))
</script>

<template>
  <Lv2d v-model:editMode="editMode" />
</template>