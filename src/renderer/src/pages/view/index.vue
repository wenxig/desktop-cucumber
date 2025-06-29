<script setup lang='ts'>
import Lv2d from '@renderer/components/lv2d.vue'
import Stage from '@renderer/components/stage.vue'
window.$message.success('应用已启动，请在托盘查看设置')
import { ref } from 'vue'
const known = [
  'base',
  'mujica',
  'summer',
  'winter'
]
const loadUrl = ref(`/live2d/musumi_${known[1]}/model.json`)
</script>

<template>
  <Stage>
    <Lv2d v-model:loadUrl="loadUrl" controllable />
  </Stage>
</template>