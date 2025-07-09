<script setup lang='ts'>
import Lv2d from '@renderer/components/lv2d.vue'
import Stage from '@renderer/components/stage.vue'
import { SharedValue } from '@renderer/helpers/ipc'
import { useLocalStorage } from '@vueuse/core'
window.$message.success('应用已启动，请在托盘查看设置')
const models = new SharedValue('modelDefines').toRef()
const loadModel = useLocalStorage('loadModel', models.value[0])
</script>

<template>
  <Stage>
    <Lv2d v-model:loadModel="loadModel" controllable />
  </Stage>
</template>