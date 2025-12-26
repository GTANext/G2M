// 基础响应类型
export interface ApiResponse<T = any> {
  success: boolean
  message?: string | null
  data?: T
  [key: string]: any
}

// 登录凭据
export interface LoginCredentials {
  username: string
  password: string
  captcha?: string
  rememberMe?: boolean
}

// 用户信息
export interface UserInfo {
  uid: number
  username: string
  name: string
  email: string
  avatar?: string
  group?: 'admin' | 'author' | 'user'
  logged_in?: boolean
  token?: string
}

// 登录状态响应
export interface LoginStatusResponse {
  success: boolean
  logged_in: boolean
  user?: UserInfo
  message?: string
}

// 登录响应
export interface LoginResponse {
  success: boolean
  message: string
  data?: UserInfo & {
    user_id?: number
    token?: string
  }
}

// API 配置
export interface ApiConfig {
  baseUrl: string
  timeout: number
  retryCount: number
  retryDelay: number
  ssr: {
    timeout: number
    retryCount: number
    retryDelay: number
  }
}

// 缓存配置
export interface CacheConfig {
  USER_CACHE_DURATION: number
}

// 请求选项
export interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  params?: Record<string, any>
  body?: string
  signal?: AbortSignal
  credentials?: RequestCredentials
}

// 缓存项
interface CacheItem<T> {
  value: T
  expireTime: number
}

