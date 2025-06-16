<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { RouterView } from 'vue-router'
window.$message = useMessage()
window.$message.success('应用已启动，请在托盘查看设置')
</script>

<template>
  <RouterView  />
</template>
