import { createRouter, createWebHistory } from "vue-router"
import Init from "@renderer/pages/init/index.vue"
export const router = createRouter({
  history: createWebHistory('/'),
  routes: [{
    path: '/',
    component: () => import('../pages/view/index.vue')
  }, {
    path: '/init',
    component: Init,
    children: [{
      path: 'sort',
      component: () => import('../pages/init/sort.vue'),
    }, {
      path: 'download',
      component: () => import('../pages/init/download.vue'),
    }]
  }]
})