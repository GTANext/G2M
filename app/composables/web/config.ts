import type { ApiConfig, CacheConfig } from './types'

const getBaseUrl = (): string => {
  try {
    if (import.meta.client || import.meta.server) {
      const config = useRuntimeConfig()
      return config.public.apiBaseUrl || 'http://api.localhost:8080'
    }
  } catch (error) {
    console.warn('无法获取运行时配置，使用默认值:', error)
  }

  const useProxy = process.env.NUXT_USE_PROXY !== 'false'
  if (useProxy) {
    return '/apiService'
  }

  return process.env.NUXT_PUBLIC_API_BASE_URL ||
    process.env.API_BASE_URL ||
    'http://api.localhost:8080'
}

export const API_CONFIG: ApiConfig = {
  get baseUrl() {
    return getBaseUrl()
  },
  timeout: 10000,
  retryCount: 3,
  retryDelay: 1000,
  ssr: {
    timeout: 5000,
    retryCount: 1,
    retryDelay: 500
  }
}

export const CACHE_CONFIG: CacheConfig = {
  USER_CACHE_DURATION: 5 * 60 * 1000
}

export const API_ENDPOINTS = {
  CONFIG: {
    GET_CONFIG: '/anon/common/config'
  },
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    CHECK_LOGIN: '/auth/check-login',
    GET_TOKEN: '/auth/token',
    GET_CAPTCHA: '/auth/captcha'
  },
  USER: {
    INFO: '/user/info'
  }
} as const

