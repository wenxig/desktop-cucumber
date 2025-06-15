<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { RouterView } from 'vue-router'
window.$message = useMessage()
</script>

<template>
  <RouterView  />
</template>
