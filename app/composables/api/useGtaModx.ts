export const useGtaModx = () => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiBase || 'https://api.gtamodx.com/modx_api'
  const siteUrl = config.public.siteUrl || 'https://www.gtamodx.com'

  /**
   * Token 管理
   */
  const useAuth = () => {
    // 设置token
    const setToken = (token: string) => {
      if (import.meta.client) {
        localStorage.setItem('token', token)
      }
    }

    // 获取token
    const getToken = (): string | null => {
      if (import.meta.client) {
        return localStorage.getItem('token')
      }
      return null
    }

    // 清除token
    const removeToken = () => {
      if (import.meta.client) {
        localStorage.removeItem('token')
      }
    }

    return {
      setToken,
      getToken,
      removeToken
    }
  }

  const { getToken, setToken, removeToken } = useAuth()

  // 用户状态
  const user = ref<any>(null)
  const isAuthenticated = ref(false)

  /**
   * 通用请求方法
   * @param endpoint - API端点路径
   * @param options - 请求配置选项
   * @returns API响应数据
   */
  const request = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    // 设置默认请求头
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    // 添加认证token
    const token = getToken()
    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`
    }

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers
      })

      const data = await response.json()

      // 处理错误响应
      if (!response.ok || data.error) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      return data
    } catch (error) {
      // 错误会被抛出，由调用方处理并显示 notification
      throw error
    }
  }

  /**
   * 获取用户信息
   */
  const getUserInfo = async () => {
    try {
      const res = await request('/get_user_info')

      if (res.error) {
        throw new Error(res.error)
      }

      user.value = res
      isAuthenticated.value = true
      return res
    } catch (error) {
      // 如果获取用户信息失败，清除登录状态
      isAuthenticated.value = false
      user.value = null
      removeToken()

      const errorMsg = error instanceof Error ? error.message : '获取用户信息失败'
      throw new Error(errorMsg)
    }
  }

  /**
   * 检查登录状态
   */
  const checkAuthStatus = async () => {
    const token = getToken()
    if (!token) {
      isAuthenticated.value = false
      user.value = null
      return false
    }

    try {
      // 发送请求获取用户信息
      const res = await request('/get_user_info')

      if (res.error) {
        throw new Error(res.error)
      }

      user.value = res
      isAuthenticated.value = true
      return true
    } catch (error) {
      // 如果获取用户信息失败，清除登录状态
      isAuthenticated.value = false
      user.value = null
      removeToken()
      return false
    }
  }

  /**
   * 设置 token
   * @param token - 登录 token
   */
  const setAuthToken = (token: string) => {
    setToken(token)
    // 设置 token 后自动获取用户信息
    getUserInfo().catch(() => {
      // 如果获取失败，清除 token
      removeToken()
    })
  }

  /**
   * 退出登录
   */
  const logout = () => {
    removeToken()
    user.value = null
    isAuthenticated.value = false
  }

  /**
   * 打开登录页面
   */
  const openLoginPage = async () => {
    try {
      // 在 Tauri 环境中使用 opener 插件
      if (import.meta.client && typeof window !== 'undefined') {
        const { open } = await import('@tauri-apps/plugin-opener')
        await open(`${siteUrl}/login`)
      } else {
        // 在浏览器环境中直接打开
        window.open(`${siteUrl}/login`, '_blank')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      throw new Error(`打开登录页面失败: ${errorMsg}`)
    }
  }

  return {
    // 用户状态
    user,
    isAuthenticated,
    siteUrl,

    // 登录状态相关 API
    getUserInfo,
    checkAuthStatus,
    setAuthToken,
    logout,
    openLoginPage
  }
}
