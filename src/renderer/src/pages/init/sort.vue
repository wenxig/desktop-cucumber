<script setup lang='ts'>
import { DefineConfig } from '@preload/type'
import { SharedValue } from '@renderer/helpers/ipc'
import { MenuRound } from '@vicons/material'
import { isBoolean } from 'lodash-es'
const modulesRaw = new SharedValue('modules')
const modules = modulesRaw.toRef()
const reverseEnable = (m: DefineConfig.Module) => modulesRaw.set(v => {
  m = v.module.find(v => v.namespace == m.namespace)!
  m.enable = !m.enable
  return v
})
</script>

<template>
  <NScrollbar class="size-full">
    <TransitionGroup tag="ul" name="list">
      <NCard v-for="(m, index) of modules.module" :key="m.namespace" :title="m.displayName"
        header-class="!pt-1 !pb-0 !px-3" content-class="!pb-1 !px-3"
        :class="[!isBoolean(modules.module[index].enable) ? '!border-(--nn-primary-color)/20 !bg-(--nn-primary-color-hover)/10' : '!bg-(--nn-icon-color-disabled)/20 !border-(--nn-icon-color-pressed)/20 ']"
        class="!w-[90%] mx-auto mt-1 ">
        <template #header-extra>
          <span class="text-(--text-color-3) italic font-thin" v-if="isBoolean(modules.module[index].enable)">未启用</span>
          <span class="text-(--text-color-3) italic font-thin" v-else>已启用</span>
          <NPopselect :options="[]" trigger="click">
            <NButton circle quaternary class="!ml-3">
              <template #icon>
                <NIcon>
                  <MenuRound />
                </NIcon>
              </template>
            </NButton>
            <template #header>
            </template>
            <template #empty>
              <NButton quaternary @click="reverseEnable(m)">{{ modules.module[index].enable ? '禁用' : '启用' }}</NButton>
            </template>
            <template #action>
            </template>
          </NPopselect>
        </template>
        <span class="text-(--nn-text-color-disabled) italic font-bold mr-3" v-if="m.package.version">
          v{{ m.package.version }}
        </span>
        <span class="text-(--nn-text-color-3)">{{ m.package.description }}</span>
      </NCard>
    </TransitionGroup>
  </NScrollbar>
</template>
<style scoped>
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.list-leave-active {
  position: absolute;
}
</style>