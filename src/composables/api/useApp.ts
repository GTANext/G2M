import { ref, onMounted } from 'vue'

export function useWindowControl() {
    const isMaximized = ref(false)

    // Tauri环境检测
    const isTauriEnvironment = () => {
        try {
            // 检查多个Tauri标识符
            return !!(
                (window as any).__TAURI__ || 
                (window as any).__TAURI_INTERNALS__ ||
                (window as any).__TAURI_METADATA__ ||
                typeof (window as any).__TAURI_INVOKE__ === 'function'
            )
        } catch {
            return false
        }
    }

    // 检查窗口最大化状态
    const checkMaximizedState = async () => {
        try {
            const { getCurrentWindow } = await import('@tauri-apps/api/window')
            const currentWindow = getCurrentWindow()
            const maximized = await currentWindow.isMaximized()
            isMaximized.value = maximized
        } catch (error) {
            console.error('检查窗口状态失败:', error)
            // 在生产环境中，如果检测失败，假设未最大化
            isMaximized.value = false
        }
    }

    const minimizeWindow = async () => {
        try {
            const { getCurrentWindow } = await import('@tauri-apps/api/window')
            const currentWindow = getCurrentWindow()
            await currentWindow.minimize()
        } catch (error) {
            console.error('最小化失败:', error)
            // 如果Tauri API失败，尝试使用原生方法
            try {
                if ((window as any).__TAURI_INVOKE__) {
                    await (window as any).__TAURI_INVOKE__('plugin:window|minimize', { label: 'main' })
                }
            } catch (nativeError) {
                console.error('原生方法最小化也失败:', nativeError)
            }
        }
    }

    const toggleMaximize = async () => {
        try {
            console.log('尝试切换最大化 - Tauri环境:', isTauriEnvironment(), '当前状态:', isMaximized.value)
            
            const { getCurrentWindow } = await import('@tauri-apps/api/window')
            const currentWindow = getCurrentWindow()
            
            if (isMaximized.value) {
                await currentWindow.unmaximize()
                console.log('窗口取消最大化成功')
            } else {
                await currentWindow.maximize()
                console.log('窗口最大化成功')
            }
            
            // 更新状态
            await checkMaximizedState()
        } catch (error) {
            console.error('切换最大化失败:', error)
            // 如果Tauri API失败，尝试使用原生方法
            try {
                if ((window as any).__TAURI_INVOKE__) {
                    if (isMaximized.value) {
                        await (window as any).__TAURI_INVOKE__('plugin:window|unmaximize', { label: 'main' })
                    } else {
                        await (window as any).__TAURI_INVOKE__('plugin:window|maximize', { label: 'main' })
                    }
                    await checkMaximizedState()
                }
            } catch (nativeError) {
                console.error('原生方法切换最大化也失败:', nativeError)
            }
        }
    }

    const closeWindow = async () => {
        try {
            const { getCurrentWindow } = await import('@tauri-apps/api/window')
            const currentWindow = getCurrentWindow()
            await currentWindow.close()
        } catch (error) {
            console.error('关闭失败:', error)
            try {
                if ((window as any).__TAURI_INVOKE__) {
                    await (window as any).__TAURI_INVOKE__('plugin:window|close', { label: 'main' })
                }
            } catch (nativeError) {
                console.error('原生方法关闭也失败:', nativeError)
            }
        }
    }

    // 组件挂载时检查窗口状态
    onMounted(() => {
        console.log('useWindowControl mounted - 开始检查窗口状态')
        // 只在 Tauri 环境中检查窗口状态
        if (isTauriEnvironment()) {
            // 延迟一点时间确保Tauri完全初始化
            setTimeout(() => {
                checkMaximizedState()
            }, 100)
        }
    })

    return {
        isMaximized,
        minimizeWindow,
        toggleMaximize,
        closeWindow,
        checkMaximizedState
    }
}
