<script setup lang='ts'>
import Lv2d from '@renderer/components/lv2d.vue'
import Stage from '@renderer/components/stage.vue'
import { SharedValue } from '@renderer/helpers/ipc'
import { ref } from 'vue'
const isEditMode = (new SharedValue<boolean>('isEditMode')).toRef()

const loadUrl = ref("/live2d_musumi/model.json")
</script>

<template>
  <Stage editable v-model:isEditMode="isEditMode">
    <Lv2d v-model:isEditMode="isEditMode" v-model:loadUrl="loadUrl" />
  </Stage>
</template>