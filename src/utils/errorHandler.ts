import { useMessage } from '@/composables/ui/useMessage'
import { ERROR_MESSAGES } from '@/constants/ui'

export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  NOT_FOUND = 'not_found',
  UNKNOWN = 'unknown'
}

export interface AppError {
  type: ErrorType
  message: string
  code?: string
  details?: any
}

export function createError(
  type: ErrorType,
  message: string,
  code?: string,
  details?: any
): AppError {
  return { type, message, code, details }
}

export function handleError(error: AppError | Error | string): void {
  const { showError } = useMessage()
  
  if (typeof error === 'string') {
    showError(error)
    return
  }
  
  if (error instanceof Error) {
    console.error('Unexpected error:', error)
    showError(ERROR_MESSAGES.NETWORK_ERROR)
    return
  }
  
  // 处理 AppError
  console.error(`${error.type} error:`, error)
  
  const errorMessages: Record<ErrorType, string> = {
    [ErrorType.NETWORK]: ERROR_MESSAGES.NETWORK_ERROR,
    [ErrorType.PERMISSION]: ERROR_MESSAGES.PERMISSION_DENIED,
    [ErrorType.NOT_FOUND]: ERROR_MESSAGES.GAME_NOT_FOUND,
    [ErrorType.VALIDATION]: error.message || '输入数据不合法',
    [ErrorType.UNKNOWN]: error.message || '发生未知错误'
  }
  
  showError(errorMessages[error.type])
}

export function isPermissionError(error: any): boolean {
  return error?.message?.includes('os error 740') || 
         error?.code === 'PERMISSION_DENIED'
}

export function isNetworkError(error: any): boolean {
  return error?.code === 'NETWORK_ERROR' || 
         error?.message?.includes('fetch')
}