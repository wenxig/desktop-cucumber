import { resolve } from 'path'
import { defineConfig, defineViteConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { NaiveUiResolver } from "unplugin-vue-components/resolvers"
import Components from "unplugin-vue-components/vite"
import vueJsx from '@vitejs/plugin-vue-jsx'
import MotionResolver from 'motion-v/resolver'
import { mergeConfig } from 'vite'
const appName = '黄瓜桌面挂件'
const globalConfig = defineViteConfig({
  resolve: {
    alias: {
      "@renderer": resolve("src/renderer/src"),
      "@main": resolve("src/main"),
      "@preload": resolve("src/preload"),
    },
  },
  experimental: {
    enableNativePlugin: true
  },
  define: {
    __APP_NAME__: `'${appName}'`
  },
  build:{
    rollupOptions:{
      external: ['nodegit']
    }
  }
})
export default defineConfig({
  main: mergeConfig(globalConfig, {
    plugins: [externalizeDepsPlugin()],
  }),
  preload: mergeConfig(globalConfig, {
    plugins: [externalizeDepsPlugin()],
  }),
  renderer: mergeConfig(globalConfig, {
    plugins: [
      vue(),
      vueJsx(),
      Components({
        dts: true,
        resolvers: [
          NaiveUiResolver(),
          MotionResolver()
        ]
      }),
      tailwindcss()
    ],
    css: {
      transformer: 'lightningcss'
    }
  }),
})
