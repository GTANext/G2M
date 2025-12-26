import type { UserInfo } from './web/types'

export const useAdminAuth = () => {
  const router = useRouter()
  const authStore = import.meta.client ? useAuthStore() : null

  const checkAdminPermission = async (skipIfInitialized: boolean = true): Promise<boolean> => {
    if (!import.meta.client || !authStore) return false

    try {
      if (skipIfInitialized && authStore.initialized) {
        if (!authStore.isLoggedIn) {
          router.push('/login')
          return false
        } else if (authStore.user && authStore.user.group !== 'admin') {
          router.push('/error/forbidden')
          return false
        }
        return true
      }

      const result = await authStore.checkAuthStatus(false)
      if (result.success && !result.logged_in) {
        router.push('/login')
        return false
      } else if (result.success && result.logged_in) {
        const user = result.user || authStore.user
        if (user && user.group !== 'admin') {
          router.push('/error/forbidden')
          return false
        }
        return true
      }
      return false
    } catch (err) {
      console.error('检查权限失败:', err)
      return false
    }
  }

  return {
    checkAdminPermission
  }
}

