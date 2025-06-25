<script setup lang='ts'>
import { SharedValue } from '@renderer/helpers/ipc'
import { Moudle, MoudlesJson } from '../../../preload/type'
const moudles = new SharedValue<MoudlesJson>('moudles').toRef()
const done = () => {
  window.inject.api('moudleDone')
}
</script>

<template>
  <div>
    模块管理
  </div>
  <NVirtualList class="w-full !h-[80vh] border-0 border-y-1 border-black border-solid" :item-size="30"
    :items="moudles.moudle" v-slot="{ item }: { item: Moudle }">
    <div class="h-[29px] w-full border-0 border-b-1 flex items-center border-black border-solid">
      <div>{{ item.url }}</div>
    </div>
  </NVirtualList>
  <NButton @click="done">确定</NButton>
</template>