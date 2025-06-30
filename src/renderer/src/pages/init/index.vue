<script setup lang='ts'>
import { type MenuOption, NIcon } from 'naive-ui'
import { shallowRef, h, type Component, watch } from 'vue'
import { AutoAwesomeMosaicFilled, FileDownloadRound } from '@vicons/material'
import { RouterLink, RouteLocationRaw, useRouter } from 'vue-router'
import { SharedValue } from '@renderer/helpers/ipc'
import { isBoolean } from 'lodash-es'
import { useInitStore } from '@renderer/stores/init'
const $router = useRouter()
const renderIcon = (icon: Component) => () => h(NIcon, null, { default: () => h(icon) })
const renderButton = (text: string, to: RouteLocationRaw) => () => h(RouterLink, {
  to
}, { default: () => text })
const menuOptions: MenuOption[] = [
  {
    label: renderButton('人格管理', '/init/sort'),
    key: 'sort',
    icon: renderIcon(AutoAwesomeMosaicFilled),
  },
  {
    label: renderButton('人格下载', '/init/download'),
    key: 'download',
    icon: renderIcon(FileDownloadRound)
  },
]

const collapsed = shallowRef(true)
const menuSelect = shallowRef('')
const isBooting = new SharedValue('modulesBooting').toRef()
watch(isBooting, isBooting => {
  console.log('isBooting', isBooting)
  if (!isBooting) {
    $router.push('/init/sort')
    menuSelect.value = 'sort'
  }
}, { immediate: true })

const initStore = useInitStore()

</script>

<template>
  <NSpin class="!h-full *:!h-full" :show="initStore.isInstallModule || (isBoolean(isBooting) && isBooting)">
    <NSpace vertical class="!h-full *:!h-full" justify="center">
      <NLayout class="!h-full">
        <NLayoutHeader class="border-b-1 !h-8 flex items-center pl-8 font-bold text-lg" bordered>神经网络终端</NLayoutHeader>
        <NLayout has-sider class="!h-[calc(100%-32px)]">
          <NLayoutSider class="!h-full" bordered collapse-mode="width" :collapsed :collapsed-width="64" :width="160"
            show-trigger @collapse="collapsed = true" @expand="collapsed = false">
            <NMenu v-model:value="menuSelect" class="!h-full" :collapsed :collapsed-width="64" :collapsed-icon-size="22"
              :options="menuOptions" />
          </NLayoutSider>
          <NLayout class="!h-full">
            <RouterView />
          </NLayout>
        </NLayout>
      </NLayout>
    </NSpace>
    <template #description>
      {{ initStore.isInstallModule ? '生成人格中' : '生成核心人格/未完成生成的人格中' }}
    </template>
  </NSpin>
</template>