<script setup lang='ts'>
import { type MenuOption, NIcon } from 'naive-ui'
import { shallowRef, h, type Component } from 'vue'
import { AutoAwesomeMosaicFilled, FileDownloadRound } from '@vicons/material'
import { RouterLink, RouteLocationRaw } from 'vue-router'
import { SharedValue } from '@renderer/helpers/ipc'
const renderIcon = (icon: Component) => () => h(NIcon, null, { default: () => h(icon) })
const renderButton = (text: string, to: RouteLocationRaw) => () => h(RouterLink, {
  to
}, { default: () => text })
const menuOptions: MenuOption[] = [
  {
    label: renderButton('人格管理', '/init/sort'),
    key: 'sort',
    icon: renderIcon(AutoAwesomeMosaicFilled)
  },
  {
    label: renderButton('人格下载', '/init/download'),
    key: 'download',
    icon: renderIcon(FileDownloadRound)
  },
]

const collapsed = shallowRef(true)

const isBooting = new SharedValue<boolean>('modulesBooting').toRef()
</script>

<template>
  <NSpin class="!size-full" :show="isBooting">
    <NSpace vertical class="!size-full *:!h-full" justify="center">
      <NLayout class="!h-full">
        <NLayoutHeader class="border-b-1 !h-8 flex items-center pl-8 font-bold text-lg" bordered>人格配置</NLayoutHeader>
        <NLayout has-sider class="!h-[calc(100%-32px)]">
          <NLayoutSider class="!h-full" bordered collapse-mode="width" :collapsed :collapsed-width="64" :width="160"
            show-trigger @collapse="collapsed = true" @expand="collapsed = false">
            <NMenu class="!h-full" :collapsed :collapsed-width="64" :collapsed-icon-size="22" :options="menuOptions" />
          </NLayoutSider>
          <NLayout class="!h-full">
            <RouterView />
          </NLayout>
        </NLayout>
      </NLayout>
    </NSpace>
    <template #description>
      下载核心包/未完成下载的包
    </template>
  </NSpin>
</template>