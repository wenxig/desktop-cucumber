<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { RouterView } from 'vue-router'
window.$message = useMessage()
window.$message.success('应用已启动，请在托盘查看设置')



import * as PIXI from "pixi.js"
window.PIXI = PIXI // 为了pixi-live2d-display内部调用
</script>

<template>
  <RouterView  />
</template>
