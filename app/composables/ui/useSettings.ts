export interface AppSettings {
    // 外观设置
    appearance: {
        enableStarfield: boolean  // 是否启用星空背景
        theme: 'light' | 'dark' | 'auto'  // 主题模式
    }
    // 其他设置可以在这里扩展
}

const defaultSettings: AppSettings = {
    appearance: {
        enableStarfield: false,
        theme: 'auto'
    }
}

const STORAGE_KEY = 'g2m-settings'

// 从 localStorage 读取设置
function loadSettings(): AppSettings {
    if (typeof window === 'undefined') {
        return { ...defaultSettings }
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            const parsed = JSON.parse(stored)
            // 合并默认值，确保新字段有默认值
            return {
                appearance: {
                    ...defaultSettings.appearance,
                    ...(parsed.appearance || {})
                }
            }
        }
    } catch (error) {
        console.warn('Failed to load settings from localStorage:', error)
    }

    return { ...defaultSettings }
}

// 保存设置到 localStorage
function saveSettings(settings: AppSettings) {
    if (typeof window === 'undefined') {
        return
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
        console.warn('Failed to save settings to localStorage:', error)
    }
}

// 单例模式：确保所有组件使用同一个 settings 实例
let settingsInstance: ReturnType<typeof createSettings> | null = null

function createSettings() {
    // 确保在客户端才初始化
    const initialSettings = typeof window !== 'undefined' ? loadSettings() : { ...defaultSettings }
    const settings = reactive<AppSettings>(initialSettings)

    // 监听设置变化，自动保存到 localStorage（仅在客户端）
    if (typeof window !== 'undefined') {
        watch(() => settings, (newSettings) => {
            saveSettings(newSettings)
        }, { deep: true })
    }

    // 启用/禁用星空背景
    const toggleStarfield = (enabled: boolean) => {
        settings.appearance.enableStarfield = enabled
    }

    // 设置主题
    const setTheme = (theme: 'light' | 'dark' | 'auto') => {
        settings.appearance.theme = theme
    }

    // 重置设置
    const resetSettings = () => {
        Object.assign(settings, defaultSettings)
    }

    return {
        settings,
        toggleStarfield,
        setTheme,
        resetSettings
    }
}

// 使用原生 localStorage 持久化设置
export function useSettings() {
    // 单例模式：如果已存在实例，直接返回
    if (!settingsInstance) {
        settingsInstance = createSettings()
    }
    return settingsInstance
}
