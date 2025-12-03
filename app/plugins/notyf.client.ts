import { Notyf } from 'notyf'
import 'notyf/notyf.min.css'

export default defineNuxtPlugin(() => {
  // 初始化 notyf 实例
  const notyf = new Notyf({
    position: {
      x: 'right',
      y: 'top',
    },
    types: [
      {
        type: 'error',
        background: '#ef4444',
        icon: {
          className: 'notyf__icon--error',
          tagName: 'i',
        },
      },
      {
        type: 'success',
        background: '#10b981',
        icon: {
          className: 'notyf__icon--success',
          tagName: 'i',
        },
      },
      {
        type: 'warning',
        background: '#f59e0b',
        icon: {
          className: 'notyf__icon--warning',
          tagName: 'i',
        },
      },
      {
        type: 'info',
        background: '#3b82f6',
        icon: {
          className: 'notyf__icon--info',
          tagName: 'i',
        },
      },
    ],
    duration: 3000,
    dismissible: true,
    ripple: true,
  })

  // 设置 top 位置为 80px，避免被固定头部遮挡
  if (process.client) {
    const style = document.createElement('style')
    style.textContent = `
      .notyf {
        top: 80px !important;
      }
    `
    document.head.appendChild(style)
  }

  return {
    provide: {
      notyf
    }
  }
})

