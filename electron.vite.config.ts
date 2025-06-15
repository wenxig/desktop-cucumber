import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import tailwindConfig from "./tailwind.config.ts"
import tailwindcss from "tailwindcss"
import { NaiveUiResolver } from "unplugin-vue-components/resolvers"
import Components from "unplugin-vue-components/vite"
import vueJsx from '@vitejs/plugin-vue-jsx'
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
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
        resolvers: [NaiveUiResolver()],
      }),
    ],
    css: {
      postcss: {
        plugins: [tailwindcss(tailwindConfig)],
      },
    },
  },
})
