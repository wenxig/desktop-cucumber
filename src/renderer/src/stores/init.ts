import { defineStore } from "pinia"
import { shallowRef } from "vue"

export const useInitStore = defineStore('initStore', () => {
  const isInstallModule = shallowRef(false)
  return {
    isInstallModule
  }
})