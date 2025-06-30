<script setup lang="ts">
import { useMessage, useThemeVars } from 'naive-ui'
import { RouterView } from 'vue-router'
window.$message = useMessage()
import * as PIXI from "pixi.js"
window.PIXI = PIXI // 为了pixi-live2d-display内部调用
import { useStyleTag } from "@vueuse/core"
import { computed } from "vue"
const cssVars = useThemeVars()
const injectStyle = computed(() => {
  console.log(cssVars.value)
  let css = '*{\n'
  for (const key in cssVars.value) {
    const styleValue = cssVars.value[key]
    const styleKey = `--nn-${key
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .replace(/([a-zA-Z])([0-9])/g, '$1-$2')
      .replace(/([0-9])([a-zA-Z])/g, '$1-$2')
      .toLowerCase()}`
    css += `${styleKey}: ${styleValue};\n`
  }
  css += '}'
  return css
})
useStyleTag(injectStyle)
</script>

<template>
  <RouterView />
</template>
