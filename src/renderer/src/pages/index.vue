<script setup lang='ts'>
import Lv2d from '@renderer/components/lv2d.vue'
import Stage from '@renderer/components/stage.vue'
import { shuffle } from 'lodash-es'
import { ref } from 'vue'
const known = [
  'base',
  'mujica',
  'summer',
  'winter'
]
const loadUrl = ref(`/live2d/musumi_${shuffle(known)[0]}/model.json`)
</script>

<template>
  <Stage>
    <Lv2d v-model:loadUrl="loadUrl" editable />
  </Stage>
</template>