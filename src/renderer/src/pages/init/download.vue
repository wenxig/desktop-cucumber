<script setup lang='ts'>
import { DefineConfig } from '@preload/type'
import { type SelectOption } from 'naive-ui'
import { ref, shallowRef } from 'vue'


const options: SelectOption[] = [{
  label: '如"github"类的所有git站',
  value: 'github'
}, {
  label: '本地文件夹',
  value: 'local'
}]

const model = ref({
  method: <DefineConfig.ModuleFrom>'github',
  url: ''
})

const checkUrlIsRight = (v: string) => {
  switch (model.value.method) {
    case 'github':
      return URL.canParse(v)
    case 'local':
      
      break
  }
}
</script>

<template>
  <NScrollbar class="size-full">
    <NForm size="large" :model ref="formRef">
      <NGrid :cols="24" :x-gap="24">
        <NFormItemGi :span="13" label="方式" path="model.method">
          <NSelect v-model:value="model.method" :options></NSelect>
        </NFormItemGi>
        <NFormItemGi :span="12" label="链接/路径" path="model.url">
          <NInput v-model:value="model.url" placeholder="请输入" clearable></NInput>
        </NFormItemGi>
      </NGrid>
    </NForm>
  </NScrollbar>
</template>