import { createApp, defineComponent } from "vue"
import App from "./App.vue"
import "./index.css"
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NLoadingBarProvider,
  NGlobalStyle,
  zhCN,
} from "naive-ui"
import { router } from "./router"
import { createPinia } from "pinia"
const app = createApp(
  defineComponent(() => () => <NConfigProvider locale={zhCN} abstract>
    <NGlobalStyle />
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