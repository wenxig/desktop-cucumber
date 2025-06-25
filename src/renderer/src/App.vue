<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { RouterView } from 'vue-router'
window.$message = useMessage()



import * as PIXI from "pixi.js"
window.PIXI = PIXI // 为了pixi-live2d-display内部调用
</script>

<template>
  <RouterView  />
</template>
