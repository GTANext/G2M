<script setup>
import { useSettings } from '~/composables/ui/useSettings'
import { useMessage } from '~/composables/ui/useMessage'
import { Palette, Sparkles, RotateCcw } from 'lucide-vue-next'

const { settings, toggleStarfield, setTheme, resetSettings } = useSettings()
const { showSuccess } = useMessage()

const colorMode = useColorMode()

// 处理星空背景切换
const handleStarfieldToggle = (enabled) => {
    toggleStarfield(enabled)
    showSuccess(enabled ? '已启用星空背景' : '已禁用星空背景')
}

// 处理主题切换
const handleThemeChange = (theme) => {
    setTheme(theme)
    if (theme === 'auto') {
        colorMode.preference = 'system'
    } else {
        colorMode.preference = theme
    }
    showSuccess(`主题已切换为${theme === 'auto' ? '跟随系统' : theme === 'dark' ? '深色' : '浅色'}`)
}

// 处理重置设置
const handleReset = () => {
    resetSettings()
    colorMode.preference = 'system'
    showSuccess('设置已重置为默认值')
}
</script>

<template>
    <UPage>
        <UPageBody>
            <UCard>
                <template #header>
                    <div class="flex items-center gap-2">
                        <Palette class="w-5 h-5 text-primary" />
                        <h3 class="text-lg font-semibold">外观设置</h3>
                    </div>
                </template>

                <div class="space-y-6">
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <Sparkles class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                <h4 class="text-base font-medium">星空背景</h4>
                            </div>
                            <p class="text-sm text-gray-500 dark:text-gray-400">
                                启用后，所有页面将显示动态星空背景效果
                            </p>
                        </div>
                        <NSwitch :value="settings.appearance.enableStarfield" @update:value="handleStarfieldToggle" />
                    </div>

                    <div>
                        <div class="flex items-center gap-2 mb-3">
                            <UIcon name="i-lucide-palette" class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <h4 class="text-base font-medium">主题模式</h4>
                        </div>
                        <div class="grid grid-cols-3 gap-3">
                            <NButton :type="settings.appearance.theme === 'light' ? 'primary' : 'default'"
                                :quaternary="settings.appearance.theme !== 'light'" @click="handleThemeChange('light')"
                                class="flex flex-col items-center gap-2 py-4">
                                <UIcon name="i-lucide-sun" class="w-6 h-6" />
                                <span>浅色</span>
                            </NButton>
                            <NButton :type="settings.appearance.theme === 'dark' ? 'primary' : 'default'"
                                :quaternary="settings.appearance.theme !== 'dark'" @click="handleThemeChange('dark')"
                                class="flex flex-col items-center gap-2 py-4">
                                <UIcon name="i-lucide-moon" class="w-6 h-6" />
                                <span>深色</span>
                            </NButton>
                            <NButton :type="settings.appearance.theme === 'auto' ? 'primary' : 'default'"
                                :quaternary="settings.appearance.theme !== 'auto'" @click="handleThemeChange('auto')"
                                class="flex flex-col items-center gap-2 py-4">
                                <UIcon name="i-lucide-monitor" class="w-6 h-6" />
                                <span>跟随系统</span>
                            </NButton>
                        </div>
                    </div>
                </div>
            </UCard>
        </UPageBody>
    </UPage>
</template>