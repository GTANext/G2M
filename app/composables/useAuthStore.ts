/**
 * 认证状态管理 Store
 * 使用 Vue 的 reactive 实现状态管理，不依赖 Pinia
 */

import { useAuth } from './useAuth'
import { useUserManager } from './useApiService'
import { getStoredUser, setStoredUser, clearStoredUser, getStoredToken, clearStoredToken } from './utils/storage'
import { apiService } from './web/core'
import type { UserInfo, LoginStatusResponse } from './web/types'

interface AuthState {
  user: UserInfo | null
  isAuthenticated: boolean
  initialized: boolean
}

// 全局状态
let globalState: AuthState | null = null
let checkPromise: Promise<LoginStatusResponse> | null = null

/**
 * 认证状态管理 Store
 */
export const useAuthStore = () => {
  // 创建或获取全局状态
  if (!globalState) {
    globalState = reactive<AuthState>({
      user: null,
      isAuthenticated: false,
      initialized: false
    })
  }

  const state = globalState

  // Getters
  const isLoggedIn = computed(() => state.isAuthenticated && state.user !== null)

  // Actions
  const actions = {
    setUser(user: UserInfo | null): void {
      state.user = user
      state.isAuthenticated = !!user
      if (user) {
        setStoredUser(user)
      } else {
        clearStoredUser()
      }
    },

    clearUser(): void {
      state.user = null
      state.isAuthenticated = false
      state.initialized = false // 重置初始化状态，下次需要重新检查
      clearStoredUser()
      clearStoredToken()
      apiService.clearToken()
    },

    initFromStorage(): void {
      const storedUser = getStoredUser()
      if (storedUser) {
        state.user = storedUser
        state.isAuthenticated = true
      }

      const token = getStoredToken()
      if (token) {
        apiService.setToken(token)
      }
    },

    async checkAuthStatus(force: boolean = false): Promise<LoginStatusResponse> {
      if (!force && checkPromise) {
        return checkPromise
      }

      if (state.initialized && !force) {
        return {
          success: true,
          logged_in: state.isAuthenticated,
          user: state.user || undefined
        }
      }

      checkPromise = performCheck()

      try {
        return await checkPromise
      } finally {
        checkPromise = null
      }
    },

    resetInitialization(): void {
      state.initialized = false
      checkPromise = null
    },

    async loadUserInfo(): Promise<{ success: boolean; data?: UserInfo; message?: string }> {
      if (!state.isAuthenticated) {
        return { success: false, message: '用户未登录' }
      }

      if (state.user) {
        return { success: true, data: state.user }
      }

      try {
        const { getUserInfo } = useUserManager()
        const userInfoResult = await getUserInfo()

        if (userInfoResult.success && userInfoResult.logged_in && userInfoResult.data) {
          actions.setUser(userInfoResult.data)
          return { success: true, data: userInfoResult.data }
        } else {
          actions.clearUser()
          return { success: false, message: '获取用户信息失败' }
        }
      } catch (error) {
        console.error('获取用户信息失败:', error)
        return { success: false, message: '网络错误' }
      }
    }
  }

  // 内部辅助函数
  const performCheck = async (): Promise<LoginStatusResponse> => {
    try {
      if (!state.initialized) {
        actions.initFromStorage()
      }

      const { checkLoginStatus } = useAuth()
      const result = await checkLoginStatus()

      if (result.success && result.logged_in) {
        state.isAuthenticated = true
        if (!state.user) {
          actions.initFromStorage()
        }
        if (result.user) {
          actions.setUser(result.user)
        }
      } else {
        actions.clearUser()
      }

      state.initialized = true
      return result
    } catch (error) {
      console.error('检查认证状态失败:', error)
      return {
        success: false,
        logged_in: false,
        message: '网络错误'
      }
    }
  }

  return {
    // State
    user: computed(() => state.user),
    isAuthenticated: computed(() => state.isAuthenticated),
    initialized: computed(() => state.initialized),
    isLoggedIn,

    // Actions
    ...actions
  }
}

