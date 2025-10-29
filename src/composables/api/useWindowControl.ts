import { ref } from 'vue'

export function useWindowControl() {
    const isMaximized = ref(false)

    const minimizeWindow = async () => {
        try {
            const { invoke } = await import('@tauri-apps/api/core')
            await invoke('minimize_window')
        } catch (error) {
            console.error('最小化失败:', error)
        }
    }

    const toggleMaximize = async () => {
        try {
            const { invoke } = await import('@tauri-apps/api/core')
            await invoke('maximize_window')
            isMaximized.value = !isMaximized.value
        } catch (error) {
            console.error('切换最大化失败:', error)
        }
    }

    const closeWindow = async () => {
        try {
            const { invoke } = await import('@tauri-apps/api/core')
            await invoke('close_window')
        } catch (error) {
            console.error('关闭失败:', error)
        }
    }

    return {
        isMaximized,
        minimizeWindow,
        toggleMaximize,
        closeWindow
    }
}
