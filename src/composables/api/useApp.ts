import { ref, onMounted } from 'vue'

export function useWindowControl() {
    const isMaximized = ref(false)

    // 检查窗口最大化状态
    const checkMaximizedState = async () => {
        try {
            // 检查是否在 Tauri 环境中
            if (typeof window === 'undefined' || !(window as any).__TAURI__) {
                return
            }
            
            const { getCurrentWindow } = await import('@tauri-apps/api/window')
            const currentWindow = getCurrentWindow()
            const maximized = await currentWindow.isMaximized()
            isMaximized.value = maximized
        } catch (error) {
            console.error('检查窗口状态失败:', error)
        }
    }

    const minimizeWindow = async () => {
        try {
            // 检查是否在 Tauri 环境中
            if (typeof window === 'undefined' || !(window as any).__TAURI__) {
                console.warn('不在 Tauri 环境中，无法执行窗口操作')
                return
            }
            
            const { getCurrentWindow } = await import('@tauri-apps/api/window')
            const currentWindow = getCurrentWindow()
            await currentWindow.minimize()
        } catch (error) {
            console.error('最小化失败:', error)
        }
    }

    const toggleMaximize = async () => {
        try {
            // 检查是否在 Tauri 环境中
            if (typeof window === 'undefined' || !(window as any).__TAURI__) {
                console.warn('不在 Tauri 环境中，无法执行窗口操作')
                return
            }
            
            const { getCurrentWindow } = await import('@tauri-apps/api/window')
            const currentWindow = getCurrentWindow()
            
            if (isMaximized.value) {
                await currentWindow.unmaximize()
            } else {
                await currentWindow.maximize()
            }
            
            // 更新状态
            await checkMaximizedState()
        } catch (error) {
            console.error('切换最大化失败:', error)
        }
    }

    const closeWindow = async () => {
        try {
            // 检查是否在 Tauri 环境中
            if (typeof window === 'undefined' || !(window as any).__TAURI__) {
                console.warn('不在 Tauri 环境中，无法执行窗口操作')
                return
            }
            
            const { getCurrentWindow } = await import('@tauri-apps/api/window')
            const currentWindow = getCurrentWindow()
            await currentWindow.close()
        } catch (error) {
            console.error('关闭失败:', error)
        }
    }

    // 组件挂载时检查窗口状态
    onMounted(() => {
        checkMaximizedState()
    })

    return {
        isMaximized,
        minimizeWindow,
        toggleMaximize,
        closeWindow,
        checkMaximizedState
    }
}
