import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }

    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
      }
    }

    if (to.path !== from.path) {
      return { top: 0 }
    }

    return undefined
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/index.vue'),
    },
    {
      path: '/download',
      name: 'download',
      redirect: {
        path: '/',
        hash: '#download',
      },
    },
    {
      path: '/docs/:pathMatch(.*)*',
      name: 'docs',
      component: () => import('@/pages/docs.vue'),
    },
  ],
})

export default router
