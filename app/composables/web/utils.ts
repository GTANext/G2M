import type { ApiResponse } from './types'

export const handleApiError = (error: Error | unknown, defaultMessage: string): string => {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return '请求超时，请检查网络连接'
    }
    if (error.message.includes('Failed to fetch')) {
      return '网络连接失败，请检查网络设置'
    }
    return defaultMessage || error.message || '未知错误'
  }
  return defaultMessage || '未知错误'
}

export const normalizeApiResponse = <T = any>(response: any): ApiResponse<T> => {
  if (!response) {
    return {
      success: false,
      message: '服务器无响应'
    }
  }
  return {
    success: response.success ?? false,
    message: response.message || response.error || null,
    ...response
  }
}

