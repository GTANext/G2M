export default defineNuxtRouteMiddleware(async (to, from) => {
  // 仅在客户端执行
  if (!import.meta.client) return

  // 如果已经在登录页面，不需要检查
  if (to.path === '/login') return

  const { useAuthStore } = await import('~/composables/useAuthStore')
  const authStore = useAuthStore()

  // 如果还未初始化，先初始化
  if (!authStore.initialized.value) {
    await authStore.checkAuthStatus()
  }

  // 如果未登录，跳转到登录页面
  if (!authStore.isLoggedIn.value) {
    return navigateTo({
      path: '/login',
      query: {
        redirect: to.fullPath
      }
    })
  }
})

