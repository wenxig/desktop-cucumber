<script setup lang='ts'>
import { DefineConfig } from '@preload/type'
import { InjectFunction, SharedValue } from '@renderer/helpers/ipc'
import { FormInst, FormRules, NGridItem, type SelectOption } from 'naive-ui'
import {  ref, shallowRef } from 'vue'

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
const rules: FormRules = {
  url: {
    required: true,
    validator(_rule, value: string) {
      switch (model.value.method) {
        case 'github':
          return URL.canParse(value) || new Error('输入值不合规')
        case 'local':
          const win32 = /^[A-Z]:\\([^\\\/\:\*\?\"\<\>\|]+\\)*([^\\\/\:\*\?\"\<\>\|]+)$/g
          const mac = /^\/([^:\/]+\/?)*([^:\/]+)$/g
          const linux = /^\/([^\/]+\/?)*([^\/]+)$/g
          if (platform.value.isLinux) return linux.test(value) || new Error('输入值不合规')
          if (platform.value.isMacOS) return mac.test(value) || new Error('输入值不合规')
          return win32.test(value) || new Error('输入值不合规')
      }
    },
    trigger: ['input', 'blur']
  }
}
const moduleInfo = shallowRef<boolean | undefined | DefineConfig.PackageJson>(undefined)
const platform = new SharedValue('platform').toRef()
const ModuleManager_info = InjectFunction.from('ModuleManager.info')
const loadInfoToModuleInfo = async () => {
  moduleInfo.value = true
  try {
    const module = await ModuleManager_info(model.value.url, model.value.method)
    moduleInfo.value = module
  } catch {
    moduleInfo.value = false
  }
}
const formRef = shallowRef<FormInst>()
const $message = window.$message
</script>

<template>
  <NSpin class="size-full *:size-full p-3" :show="moduleInfo === true">
    <NForm :rules :model ref="formRef">
      <NGrid :cols="24" :x-gap="24">
        <NFormItemGi :span="13" label="方式" path="method">
          <NSelect v-model:value="model.method" :options></NSelect>
        </NFormItemGi>
        <NFormItemGi :span="12" label="链接/路径" path="url">
          <NInput v-model:value="model.url" placeholder="请输入" clearable></NInput>
        </NFormItemGi>
        <NGridItem :span="24">
          <div class="flex w-full">
            <NButton round type="primary" @click="(e) => {
              e.preventDefault()
              formRef?.validate((errors) => {
                if (!errors) loadInfoToModuleInfo()
                else $message.error('输入存在问题')
              })
            }">
              检索
            </NButton>
          </div>
        </NGridItem>
      </NGrid>
    </NForm>

    <!-- info -->
    <NAlert type="error" v-if="moduleInfo === false" title="神经网络检索错误">
      请检测环境及输入
    </NAlert>
    <template v-else-if="moduleInfo && (moduleInfo !== true)">
      {{ moduleInfo }}
    </template>
  </NSpin>
</template>