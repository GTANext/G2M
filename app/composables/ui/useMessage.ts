// 使用 notyf 作为消息提示组件
import type { Notyf } from 'notyf'

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
  // 获取 notyf 实例
  const { $notyf } = useNuxtApp()
  const notyf = $notyf as Notyf

  // 格式化详细错误信息
  const formatDetail = (detail: unknown): string => {
    if (detail instanceof Error) {
      return detail.message
    } else if (typeof detail === 'string') {
      return detail
    } else {
      return String(detail)
    }
  }

  // 构建消息内容
  const buildMessage = (content: string, detail?: unknown): string => {
    if (detail) {
      return `${content}\n${formatDetail(detail)}`
    }
    return content
  }

  const showError = (content: string, options?: ErrorOptions) => {
    const message = buildMessage(content, options?.detail)
    const notification = notyf.error(message)

    // 如果有 onClose 回调，在通知关闭时调用
    if (options?.onClose) {
      setTimeout(() => {
        if (options.onClose) {
          options.onClose()
        }
      }, options.duration ?? 3000)
    }

    return { close: () => notification.dismiss() }
  }

  const showSuccess = (content: string, options?: SuccessOptions) => {
    const message = buildMessage(content, options?.detail)
    const notification = notyf.success(message)

    if (options?.onClose) {
      setTimeout(() => {
        if (options.onClose) {
          options.onClose()
        }
      }, options.duration ?? 3000)
    }

    return { close: () => notification.dismiss() }
  }

  const showWarning = (content: string, options?: WarningOptions) => {
    const message = buildMessage(content, options?.detail)
    const notification = notyf.open({
      type: 'warning',
      message,
      duration: options?.duration ?? 3000,
      dismissible: true,
    })

    if (options?.onClose) {
      setTimeout(() => {
        if (options.onClose) {
          options.onClose()
        }
      }, options.duration ?? 3000)
    }

    return { close: () => notification.dismiss() }
  }

  const showInfo = (content: string, options?: InfoOptions) => {
    const message = buildMessage(content, options?.detail)
    const notification = notyf.open({
      type: 'info',
      message,
      duration: options?.duration ?? 3000,
      dismissible: true,
    })

    if (options?.onClose) {
      setTimeout(() => {
        if (options.onClose) {
          options.onClose()
        }
      }, options.duration ?? 3000)
    }

    return { close: () => notification.dismiss() }
  }

  const showLoading = (content: string, duration = 0, key?: string) => {
    // notyf 不支持 loading 类型，使用 info 代替
    const notification = notyf.open({
      type: 'info',
      message: content,
      duration: duration || 0,
      dismissible: false,
    })

    return { close: () => notification.dismiss() }
  }

  const destroyAll = () => {
    notyf.dismissAll()
  }

  const destroy = (key: string) => {
    // notyf 没有基于 key 的销毁方法，只能销毁所有
    // 如果需要精确控制，需要维护一个映射表
    notyf.dismissAll()
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
