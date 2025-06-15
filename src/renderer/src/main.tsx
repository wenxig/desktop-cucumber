import { createApp, defineComponent } from "vue"
import '@renderer/lib/live2d.min.js'
// import '@renderer/lib/live2dcubismcore.min.js'
import App from "./App.vue"
import "./index.scss"
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NLoadingBarProvider,
  zhCN,
} from "naive-ui"
import { router } from "./router"
import { createPinia } from "pinia"

const app = createApp(
  defineComponent(() => () => <NConfigProvider locale={zhCN} abstract>
    <NLoadingBarProvider container-class="z-[200000]">
      <NDialogProvider>
        <NMessageProvider >
          <App />
        </NMessageProvider>
      </NDialogProvider>
    </NLoadingBarProvider>
  </NConfigProvider>)
)
app.use(router)
const pinia = createPinia()
app.use(pinia)
app.mount("#app")