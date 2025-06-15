<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue"

import * as PIXI from "pixi.js"
// @ts-ignore
import { Live2DModel } from "pixi-live2d-display/cubism2" // 只需要 Cubism 2

window.PIXI = PIXI // 为了pixi-live2d-display内部调用

let app // 为了存储pixi实例
let model // 为了存储live2d实例

onMounted(() => {
  init()
})

onBeforeUnmount(() => {
  app = null
  model = null
})
const canvas = ref<HTMLCanvasElement>()
const init = async () => {
  // 创建PIXI实例
  app = new PIXI.Application({
    // 指定PixiJS渲染器使用的HTML <canvas> 元素
    view: canvas.value,
    // 响应式设计
    resizeTo: canvas.value,
    // 设置渲染器背景的透明度 0（完全透明）到1（完全不透明）
    backgroundAlpha: 0,
    
  })
  // 引入live2d模型文件
  model = await Live2DModel.from("/live2d_musumi/model.json", {
    autoInteract: true, // 关闭眼睛自动跟随功能
  })
  // 调整live2d模型文件缩放比例（文件过大，需要缩小）
  model.scale.set(0.3)
  // 调整x轴和y轴坐标使模型文件居中
  model.y = 0
  model.x = -24
  // 把模型添加到舞台上
  app.stage.addChild(model)
}
</script>

<template>
  <div class="canvasWrap">
    <canvas ref="canvas" />
  </div>
</template>