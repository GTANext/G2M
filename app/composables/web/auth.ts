import { apiService } from './core'
import { handleApiError, normalizeApiResponse } from './utils'
import type { ApiResponse, LoginCredentials, LoginStatusResponse, LoginResponse, UserInfo } from './types'

export const authApi = {
  checkLogin: (action: string = 'get'): Promise<ApiResponse<LoginStatusResponse>> => {
    const params = action !== 'get' ? { action } : {}
    return apiService.get<LoginStatusResponse>('auth/check-login', params)
  },

  login: (credentials: LoginCredentials, action: string = 'post'): Promise<ApiResponse<UserInfo>> => {
    const actionParam = action !== 'post' ? action : null
    return apiService.post<UserInfo>('auth/login', credentials, actionParam)
  },

  logout: (action: string = 'post'): Promise<ApiResponse> => {
    const actionParam = action !== 'post' ? action : null
    return apiService.post('auth/logout', {}, actionParam)
  }
}

export const useAuthManager = () => {
  const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      const response = await authApi.login(credentials)
      const data = normalizeApiResponse<UserInfo>(response)

      if (data.success) {
        return {
          success: true,
          data: response.data,
          message: data.message || '登录成功'
        }
      }

      return {
        success: false,
        message: data.message || '登录失败'
      }
    } catch (error) {
      console.error('登录失败:', error)
      return {
        success: false,
        message: handleApiError(error, '登录失败')
      }
    }
  }

  const logout = async (): Promise<ApiResponse> => {
    try {
      const response = await authApi.logout()
      const data = normalizeApiResponse(response)

      return {
        success: data.success,
        message: data.message || (data.success ? '登出成功' : '登出失败')
      }
    } catch (error) {
      console.error('登出失败:', error)
      return {
        success: false,
        message: handleApiError(error, '登出失败')
      }
    }
  }

  const checkLoginStatus = async (): Promise<LoginStatusResponse> => {
    try {
      const response = await authApi.checkLogin()
      const data = normalizeApiResponse<LoginStatusResponse>(response)

      return {
        success: data.success,
        logged_in: data.success && (response as any).logged_in,
        data: (response as any).data,
        message: data.message || '状态检查完成'
      }
    } catch (error) {
      console.error('检查登录状态失败:', error)
      return {
        success: false,
        logged_in: false,
        message: handleApiError(error, '检查登录状态失败')
      }
    }
  }

  return {
    login,
    logout,
    checkLoginStatus
  }
}

