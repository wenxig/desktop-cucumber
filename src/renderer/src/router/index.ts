import { createRouter, createWebHistory } from "vue-router"

export const router = createRouter({
  history: createWebHistory('/'),
  routes: [{
    path: '/',
    component: () => import('../pages/view/index.vue')
  }, {
    path: '/init',
    component: () => import('../pages/init/index.vue'),
    children: [{
      path: 'sort',
      component: () => import('../pages/init/sort.vue'),
    }, {
      path: 'download',
      component: () => import('../pages/init/download.vue'),
    }]
  }]
})