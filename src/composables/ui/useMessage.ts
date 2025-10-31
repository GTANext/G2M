import { message, notification } from 'ant-design-vue'
import { MESSAGE_STYLE, NOTIFICATION_STYLE } from '@/constants/ui'

export enum MessageType {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  SUCCESS = 'success'
}

export interface MessageOptions {
  duration?: number
  onClose?: () => void
  key?: string
}

export interface ErrorOptions extends MessageOptions {
  detail?: unknown
}

export interface SuccessOptions extends MessageOptions {
  detail?: unknown
}

export interface WarningOptions extends MessageOptions {
  detail?: unknown
}

export interface InfoOptions extends MessageOptions {
  detail?: unknown
}

export function useMessage() {
  const showMessage = (
    type: MessageType,
    content: string,
    options: MessageOptions = {}
  ) => {
    const config = {
      content,
      style: MESSAGE_STYLE,
      duration: options.duration ?? 3,
      onClose: options.onClose,
      key: options.key
    }
    
    return message[type](config)
  }
  
  const showError = (content: string, options?: ErrorOptions) => {
    // 显示简短的错误消息
    const messageResult = message.error({
      content,
      style: MESSAGE_STYLE,
      duration: options?.duration ?? 3,
      onClose: options?.onClose,
      key: options?.key
    })
    
    // 如果有详细错误信息，显示 notification
    if (options?.detail) {
      let detailText: string
      
      if (options.detail instanceof Error) {
        detailText = options.detail.message
      } else if (typeof options.detail === 'string') {
        detailText = options.detail
      } else {
        detailText = String(options.detail)
      }
      
      notification.error({
        message: '详细信息',
        description: `${content}: ${detailText}`,
        placement: 'topRight',
        style: NOTIFICATION_STYLE
      })
    }
    
    return messageResult
  }
  
  const showSuccess = (content: string, options?: SuccessOptions) => {
    // 显示简短的成功消息
    const messageResult = message.success({
      content,
      style: MESSAGE_STYLE,
      duration: options?.duration ?? 3,
      onClose: options?.onClose,
      key: options?.key
    })
    
    // 如果有详细信息，显示 notification
    if (options?.detail) {
      let detailText: string
      
      if (options.detail instanceof Error) {
        detailText = options.detail.message
      } else if (typeof options.detail === 'string') {
        detailText = options.detail
      } else {
        detailText = String(options.detail)
      }
      
      notification.success({
        message: '详细信息',
        description: `${content}: ${detailText}`,
        placement: 'topRight',
        style: NOTIFICATION_STYLE
      })
    }
    
    return messageResult
  }
  
  const showWarning = (content: string, options?: WarningOptions) => {
    // 显示简短的警告消息
    const messageResult = message.warning({
      content,
      style: MESSAGE_STYLE,
      duration: options?.duration ?? 3,
      onClose: options?.onClose,
      key: options?.key
    })
    
    // 如果有详细信息，显示 notification
    if (options?.detail) {
      let detailText: string
      
      if (options.detail instanceof Error) {
        detailText = options.detail.message
      } else if (typeof options.detail === 'string') {
        detailText = options.detail
      } else {
        detailText = String(options.detail)
      }
      
      notification.warning({
        message: '详细信息',
        description: `${content}: ${detailText}`,
        placement: 'topRight',
        style: NOTIFICATION_STYLE
      })
    }
    
    return messageResult
  }
  
  const showInfo = (content: string, options?: InfoOptions) => {
    // 显示简短的信息消息
    const messageResult = message.info({
      content,
      style: MESSAGE_STYLE,
      duration: options?.duration ?? 3,
      onClose: options?.onClose,
      key: options?.key
    })
    
    // 如果有详细信息，显示 notification
    if (options?.detail) {
      let detailText: string
      
      if (options.detail instanceof Error) {
        detailText = options.detail.message
      } else if (typeof options.detail === 'string') {
        detailText = options.detail
      } else {
        detailText = String(options.detail)
      }
      
      notification.info({
        message: '详细信息',
        description: `${content}: ${detailText}`,
        placement: 'topRight',
        style: NOTIFICATION_STYLE
      })
    }
    
    return messageResult
  }
  
  const showLoading = (content: string, duration = 0, key?: string) => {
    return message.loading({
      content,
      style: MESSAGE_STYLE,
      duration,
      key
    })
  }
  
  const destroyAll = () => {
    message.destroy()
  }
  
  const destroy = (key: string) => {
    message.destroy(key)
  }
  
  return {
    showError,
    showWarning,
    showInfo,
    showSuccess,
    showLoading,
    destroyAll,
    destroy
  }
}