import { API_CONFIG, API_ENDPOINTS } from './config'
import type { ApiResponse, RequestOptions } from './types'
import { getStoredToken, setStoredToken, clearStoredToken } from '../utils/storage'

export class ApiService {
  private tokenEnabled: boolean = false
  private captchaEnabled: boolean = false
  private configLoaded: boolean = false
  private tokenFetching: Promise<string | null> | null = null

  private getBaseUrl(): string {
    return API_CONFIG.baseUrl
  }

  async initConfig(): Promise<void> {
    if (this.configLoaded) {
      return
    }

    try {
      const response = await this.request<{ token: boolean; captcha: boolean }>(
        API_ENDPOINTS.CONFIG.GET_CONFIG,
        { method: 'GET' }
      )

      if (response.success && response.data) {
        this.tokenEnabled = response.data.token ?? false
        this.captchaEnabled = response.data.captcha ?? false
        this.configLoaded = true
      }
    } catch (error) {
      console.warn('获取配置失败，使用默认配置:', error)
      this.tokenEnabled = false
      this.captchaEnabled = false
      this.configLoaded = true
    }
  }

  getToken(): string | null {
    return getStoredToken()
  }

  /**
   * 自动获取 Token（如果缺失且已启用）
   * 通过 Cookie/Session 自动识别用户并获取 Token
   * 注意：只有在用户已登录的情况下才会尝试获取 Token
   */
  private async fetchTokenIfNeeded(): Promise<string | null> {
    // 如果未启用 Token，直接返回 null
    if (!this.tokenEnabled) {
      return null
    }

    // 如果已有 Token，直接返回
    const existingToken = this.getToken()
    if (existingToken) {
      return existingToken
    }

    // 检查用户是否已登录（通过检查本地存储的用户信息）
    // 如果用户未登录，不尝试获取 Token，避免不必要的请求
    try {
      const { getStoredUser } = await import('../utils/storage')
      const user = getStoredUser()
      if (!user) {
        // 用户未登录，不尝试获取 Token
        return null
      }
    } catch (error) {
      // 无法检查用户状态，不尝试获取 Token
      return null
    }

    // 如果正在获取 Token，等待当前请求完成
    if (this.tokenFetching) {
      return await this.tokenFetching
    }

    // 创建新的 Token 获取请求
    this.tokenFetching = (async () => {
      try {
        // 调用 /auth/token 接口，通过 Cookie 自动识别用户
        const response = await this.request<{ token?: string; token_enabled?: boolean }>(
          API_ENDPOINTS.AUTH.GET_TOKEN,
          { method: 'GET' }
        )

        if (response.success && response.data?.token) {
          this.setToken(response.data.token)
          return response.data.token
        }

        return null
      } catch (error) {
        // 获取 Token 失败（可能是用户未登录），静默失败
        console.debug('自动获取 Token 失败（可能用户未登录）:', error)
        return null
      } finally {
        // 清除获取状态
        this.tokenFetching = null
      }
    })()

    return await this.tokenFetching
  }

  setToken(token: string): void {
    setStoredToken(token)
  }

  clearToken(): void {
    clearStoredToken()
  }

  isTokenEnabled(): boolean {
    return this.tokenEnabled
  }

  isCaptchaEnabled(): boolean {
    return this.captchaEnabled
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const cleanEndpoint = endpoint.replace(/^\//, '')
    const url = `${this.getBaseUrl()}/${cleanEndpoint}`
    const isSSR = import.meta.server

    const config = isSSR ? API_CONFIG.ssr : API_CONFIG
    const { timeout, retryCount, retryDelay } = config

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    // 如果启用 Token，自动获取并添加到请求头
    if (this.tokenEnabled) {
      // 先尝试从存储获取
      let token = this.getToken()

      // 如果没有 Token，且不是获取 Token 的请求，尝试自动获取
      if (!token && !endpoint.includes(API_ENDPOINTS.AUTH.GET_TOKEN)) {
        token = await this.fetchTokenIfNeeded()
      }

      if (token) {
        headers['X-API-Token'] = token
      }
    }

    const defaultOptions: RequestOptions = {
      method: 'GET',
      credentials: 'include',
      headers,
      ...options
    }

    let lastError: Error | unknown
    for (let i = 0; i < retryCount; i++) {
      try {
        if (isSSR) {
          return await this._handleSSRRequest<T>(url, defaultOptions)
        } else {
          return await this._handleClientRequest<T>(url, defaultOptions, timeout)
        }
      } catch (error) {
        lastError = error
        const isNetworkError = this._isNetworkError(error)

        if (!isNetworkError) {
          throw lastError
        }

        if (i === retryCount - 1) {
          throw lastError
        }

        await this._handleRetryDelay(error, i, retryDelay)
      }
    }
    throw lastError
  }

  private async _handleSSRRequest<T>(url: string, defaultOptions: RequestOptions): Promise<ApiResponse<T>> {
    const fetchOptions: any = { ...defaultOptions }
    delete fetchOptions.signal
    delete fetchOptions.credentials

    const queryString = new URLSearchParams(defaultOptions.params as Record<string, string> || {}).toString()
    const fullUrl = queryString ? `${url}?${queryString}` : url

    return await $fetch<ApiResponse<T>>(fullUrl, fetchOptions)
  }

  private async _handleClientRequest<T>(url: string, defaultOptions: RequestOptions, timeout: number): Promise<ApiResponse<T>> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      let fullUrl = url
      if (defaultOptions.params) {
        const searchParams = new URLSearchParams(defaultOptions.params as Record<string, string>)
        const queryString = searchParams.toString()
        if (queryString) {
          fullUrl += (url.includes('?') ? '&' : '?') + queryString
        }
      }

      const headers = new Headers(defaultOptions.headers as HeadersInit)

      const fetchOptions: RequestInit = {
        method: defaultOptions.method || 'GET',
        headers,
        signal: controller.signal,
        credentials: 'include'
      }

      if (defaultOptions.body) {
        fetchOptions.body = defaultOptions.body
      }

      const response = await fetch(fullUrl, fetchOptions)
      clearTimeout(timeoutId)

      if (response.status === 401) {
        const isAuthEndpoint = fullUrl.includes('/auth/login') || fullUrl.includes('/auth/logout')

        if (!isAuthEndpoint && import.meta.client) {
          try {
            const { useAuthStore } = await import('../useAuthStore')
            const authStore = useAuthStore()
            authStore.clearUser()
          } catch (e) {
            console.warn('登出逻辑执行失败:', e)
          }
        }

        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const responseData = await response.json()
          if (responseData && !responseData.success && responseData.message) {
            throw new Error(responseData.message)
          }
        }
        throw new Error('未授权访问')
      }

      const contentType = response.headers.get('content-type')
      let responseData: ApiResponse<T>
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json()
      } else {
        responseData = {
          success: response.ok,
          data: await response.text() as any
        }
      }

      if (!response.ok) {
        // 如果响应数据中有错误信息，使用它
        if (responseData && !responseData.success && responseData.message) {
          // 对于 400 错误，直接抛出错误消息
          if (response.status === 400) {
            throw new Error(responseData.message || '请求参数错误')
          }
          throw new Error(responseData.message)
        }
        throw new Error(`HTTP error! status: ${response.status}`, {
          cause: {
            status: response.status,
            data: responseData
          }
        } as ErrorOptions)
      }

      return responseData
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private _isNetworkError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false
    }

    const networkErrorPatterns = [
      'Failed to fetch',
      'NetworkError',
      'Network request failed',
      'AbortError',
      'timeout',
      'ECONNREFUSED',
      'ENOTFOUND',
    ]

    const errorMessage = error.message.toLowerCase()
    const errorName = error.name.toLowerCase()

    const isNetworkError = networkErrorPatterns.some(
      pattern => errorMessage.includes(pattern.toLowerCase()) || errorName.includes(pattern.toLowerCase())
    )

    // 如果错误消息包含业务错误相关的信息，不应该重试
    // 验证码错误、参数验证错误等业务错误不应该重试
    const isBusinessError =
      errorMessage.includes('http error') ||
      errorMessage.includes('status:') ||
      errorMessage.includes('未授权') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('not found') ||
      errorMessage.includes('bad request') ||
      errorMessage.includes('验证码') ||
      errorMessage.includes('captcha') ||
      errorMessage.includes('参数') ||
      errorMessage.includes('validation')

    return isNetworkError && !isBusinessError
  }

  private async _handleRetryDelay(error: unknown, retryIndex: number, baseRetryDelay: number): Promise<void> {
    const currentRetryDelay = baseRetryDelay * Math.pow(2, retryIndex)
    await this.delay(currentRetryDelay)
  }

  async get<T = any>(endpoint: string, params: Record<string, any> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
      params
    })
  }

  async post<T = any>(endpoint: string, data: any = {}, action: string | null = null): Promise<ApiResponse<T>> {
    const params = action ? { action } : {}
    return this.request<T>(endpoint, {
      method: 'POST',
      params,
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  async put<T = any>(endpoint: string, data: any = {}, action: string | null = null): Promise<ApiResponse<T>> {
    const params = action ? { action } : {}
    return this.request<T>(endpoint, {
      method: 'PUT',
      params,
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  async delete<T = any>(endpoint: string, action: string | null = null): Promise<ApiResponse<T>> {
    const params = action ? { action } : {}
    return this.request<T>(endpoint, {
      method: 'DELETE',
      params
    })
  }
}

export const apiService = new ApiService()

