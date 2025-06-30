<script setup lang='ts'>
import { DefineConfig } from '@preload/type'
import { InjectFunction, SharedValue } from '@renderer/helpers/ipc'
import { isArray, isEmpty, isObject } from 'lodash-es'
import { FormInst, FormRules, NGridItem, type SelectOption } from 'naive-ui'
import { computed, ref, shallowRef, watch } from 'vue'
import { FileDownloadRound } from '@vicons/material'
import { useInitStore } from '../../stores/init'
import { createLoadingMessage } from '@renderer/helpers/message'
const options: SelectOption[] = [{
  label: '如"github"类的所有git站',
  value: 'github'
}, {
  label: '本地文件夹',
  value: 'local'
}]

const model = ref({
  method: <DefineConfig.ModuleFrom>'github',
  url: '',
  fork: ''
})
const rules: FormRules = {
  url: {
    required: true,
    validator(_rule, value: string) {
      switch (model.value.method) {
        case 'github':
          if (URL.canParse(value)) {
            searchForks()
            return true
          }
          return new Error('输入值不合规')
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
  },
  fork: {
    required: false,
    validator(_rule, value: string) {
      switch (model.value.method) {
        case 'github':
          return (!isEmpty(value)) || new Error('请选择分支')
        case 'local': return true
      }
    },
    trigger: ['input', 'blur']
  },
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
watch(model, () => {
  moduleInfo.value = undefined
}, {
  deep: true
})
const formRef = shallowRef<FormInst>()
const $message = window.$message

const githubForks = shallowRef<string[] | undefined | false>()
const ModuleManager_gitLsRemote = InjectFunction.from('ModuleManger.gitLsRemote')
let latestGithubForksSymbol: Symbol | undefined = undefined
const searchForks = async () => {
  githubForks.value = false
  const [fp, s] = [ModuleManager_gitLsRemote(model.value.url), latestGithubForksSymbol ??= Symbol()]
  try {
    const f = await fp
    if (s !== latestGithubForksSymbol) return
    githubForks.value = f
    model.value.fork = f.at(0) ?? ''
  } catch {
    githubForks.value = undefined
    window.$message.error('源不是git仓库')
  }
}
const initStore = useInitStore()
const ModuleManager_install = InjectFunction.from('ModuleManger.install')
const downloadModule = async () => {
  initStore.isInstallModule = true
  await createLoadingMessage('生成人格中').bind(ModuleManager_install(model.value.url, model.value.method, model.value.fork), false)
  initStore.isInstallModule = false
}
const isLoadingButton = computed(() => {
  if (moduleInfo.value == true) return true
  if (initStore.isInstallModule == true) return true
  return false
})
const isDisabledButton = computed(() => {
  if (isLoadingButton.value) return true
  const { fork, method, url } = model.value
  if (isEmpty(url)) return true
  if (method == "github" && isEmpty(fork)) return true
  return false
})

</script>

<template>
  <NSpin class="size-full *:size-full p-3" :show="moduleInfo === true">
    <NForm :rules :model ref="formRef" class="!mb-4">
      <NGrid :cols="24" :x-gap="24">
        <NFormItemGi :span="13" label="方式" path="method">
          <NSelect v-model:value="model.method" :options></NSelect>
        </NFormItemGi>
        <NFormItemGi :span="12" label="链接/路径" path="url">
          <NInput v-model:value="model.url" placeholder="请输入" clearable></NInput>
        </NFormItemGi>
        <NFormItemGi :span="8" label="分支" path="fork" v-if="model.method == 'github'">
          <NSelect :options="isArray(githubForks) ? githubForks.map(v => ({ label: v, value: v })) : []"
            :loading="githubForks === false" v-model:value="model.fork" remote filterable></NSelect>
        </NFormItemGi>
        <NGridItem :span="24">
          <div class="flex w-full">
            <NButton :loading="isLoadingButton" :disabled="isDisabledButton" round type="primary" @click="(e) => {
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

    <!-- download -->
    <NTooltip trigger="hover" placement="left" v-if="!isDisabledButton && isObject(moduleInfo)">
      <template #trigger>
        <NFloatButton @click="(e) => {
          e.preventDefault()
          formRef?.validate((errors) => {
            if (!errors) downloadModule()
            else $message.error('输入存在问题')
          })
        }" :right="10" :bottom="10" type="primary" shape="circle">
          <NIcon :size="25">
            <FileDownloadRound />
          </NIcon>
        </NFloatButton>
      </template>
      生成人格
    </NTooltip>


    <!-- info -->
    <NAlert type="error" v-if="moduleInfo === false" title="神经网络检索错误">
      请检测环境及输入是否正确
    </NAlert>
    <template v-else-if="(moduleInfo && (moduleInfo !== true))">
      {{ moduleInfo }}
    </template>

  </NSpin>
</template>