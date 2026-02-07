import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/DocView.vue'),
    },
    {
      path: '/doc/:path(.*)',
      name: 'doc',
      component: () => import('@/views/DocView.vue'),
    },
  ],
})

export default router
