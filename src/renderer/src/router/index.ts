import { createRouter, createWebHistory } from "vue-router"

export const router = createRouter({
  history: createWebHistory('/'),
  routes: [{
    path: '/',
    component: () => import('../pages/index.vue')
  }, {
    path: '/init',
    component: () => import('../pages/init.vue')
  }]
})