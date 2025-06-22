import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { NaiveUiResolver } from "unplugin-vue-components/resolvers"
import Components from "unplugin-vue-components/vite"
import vueJsx from '@vitejs/plugin-vue-jsx'
import MotionResolver from 'motion-v/resolver'
const appName = '黄瓜桌面挂件'
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: {
      __APP_NAME__: `'${appName}'`
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    define: {
      __APP_NAME__: `'${appName}'`
    }
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
      },
    },
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
    experimental: <any>{
      enableNativePlugin: true
    },
    define: {
      __APP_NAME__: `'${appName}'`
    },
    css: {
      transformer: 'lightningcss'
    }
  },
})
