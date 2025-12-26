import { apiService } from './core'
import { handleApiError, normalizeApiResponse } from './utils'
import { CACHE_CONFIG } from './config'
import { memoryCache } from '../utils/cache'
import { getStoredUser, setStoredUser, clearStoredUser, setStoredToken } from '../utils/storage'
import type { ApiResponse, UserInfo } from './types'

export const userApi = {
  getUserInfo: (action: string = 'get'): Promise<ApiResponse<UserInfo>> => {
    const params = action !== 'get' ? { action } : {}
    return apiService.get<UserInfo>('user/info', params)
  },

  updateUser: (userData: Partial<UserInfo>, action: string = 'put'): Promise<ApiResponse<UserInfo>> => {
    const actionParam = action !== 'put' ? action : null
    return apiService.put<UserInfo>('user/info', userData, actionParam)
  },

  resetPassword: (passwordData: { old_password: string; new_password: string; confirm_password: string }): Promise<ApiResponse> => {
    return apiService.post('user/password', passwordData)
  }
}

interface UserInfoResponse {
  success: boolean
  logged_in: boolean
  data?: UserInfo
  message?: string
}

export const useUserManager = () => {
  const USER_CACHE_KEY = 'user_info'

  const clearLocalCache = (): void => {
    memoryCache.delete(USER_CACHE_KEY)
  }

  const getUserInfo = async (force: boolean = false): Promise<UserInfoResponse> => {
    const isSSR = import.meta.server

    if (!isSSR && !force) {
      const cached = memoryCache.get<UserInfoResponse>(USER_CACHE_KEY)
      if (cached) {
        return cached
      }
    }

    try {
      const response = await userApi.getUserInfo()
      const data = normalizeApiResponse<UserInfo>(response)

      if (data.success && response.data) {
        const userData = response.data as any

        if (userData.token) {
          setStoredToken(userData.token)
          apiService.setToken(userData.token)
        }

        const { token, ...userInfo } = userData

        const result: UserInfoResponse = {
          success: true,
          logged_in: true,
          data: userInfo,
          message: data.message || '获取用户信息成功'
        }

        if (!isSSR) {
          memoryCache.set(USER_CACHE_KEY, result, CACHE_CONFIG.USER_CACHE_DURATION)
        }
        setStoredUser(userInfo)
        return result
      } else {
        const result: UserInfoResponse = {
          success: data.success,
          logged_in: false,
          message: data.message || '用户未登录'
        }

        if (!isSSR) {
          memoryCache.set(USER_CACHE_KEY, result, CACHE_CONFIG.USER_CACHE_DURATION)
        }
        clearStoredUser()
        return result
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
      const errorResult: UserInfoResponse = {
        success: false,
        logged_in: false,
        message: handleApiError(error, '获取用户信息失败')
      }

      if (error instanceof Error && ('status' in error || error.message.includes('401') || error.message.includes('403'))) {
        clearStoredUser()
        clearLocalCache()
      }
      return errorResult
    }
  }

  const updateUserInfo = async (userData: Partial<UserInfo>): Promise<ApiResponse<UserInfo>> => {
    try {
      const response = await userApi.updateUser(userData)
      const data = normalizeApiResponse<UserInfo>(response)

      if (data.success && response.data) {
        setStoredUser(response.data)
        clearLocalCache()

        return {
          success: true,
          data: response.data,
          message: data.message || '更新用户信息成功'
        }
      }

      return {
        success: data.success,
        message: data.message || '更新用户信息失败'
      }
    } catch (error) {
      console.error('更新用户信息失败:', error)
      return {
        success: false,
        message: handleApiError(error, '更新用户信息失败')
      }
    }
  }

  const resetPassword = async (passwordData: { old_password: string; new_password: string; confirm_password: string }): Promise<ApiResponse> => {
    try {
      if (!passwordData.new_password || !passwordData.confirm_password) {
        return {
          success: false,
          message: '新密码和确认密码不能为空'
        }
      }

      if (passwordData.new_password.length < 6) {
        return {
          success: false,
          message: '密码长度不能少于6位'
        }
      }

      if (passwordData.new_password !== passwordData.confirm_password) {
        return {
          success: false,
          message: '两次输入的密码不一致'
        }
      }

      const response = await userApi.resetPassword(passwordData)
      const data = normalizeApiResponse(response)

      return {
        success: data.success,
        message: data.message || (data.success ? '密码重置成功' : '密码重置失败')
      }
    } catch (error) {
      console.error('重置密码失败:', error)
      return {
        success: false,
        message: handleApiError(error, '重置密码失败')
      }
    }
  }

  const refreshUserInfo = async (): Promise<UserInfoResponse> => {
    return await getUserInfo(true)
  }

  return {
    getUserInfo,
    updateUserInfo,
    resetPassword,
    refreshUserInfo,
    getStoredUser,
    setStoredUser,
    clearStoredUser,
    clearLocalCache
  }
}

