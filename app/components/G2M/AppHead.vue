<script setup>
import { useCommon } from '~/composables/ui/useCommon'
import { useWindowControl } from '~/composables/api/useApp'

const { navItems, isActive, externalLinks } = useCommon()
const { minimizeWindow, closeWindow } = useWindowControl()

const items = computed(() => {
    return navItems.value.map(item => ({
        label: item.label,
        to: item.route,
        active: isActive(item.route)
    }))
})
</script>

<template>
    <div class="fixed top-0 left-0 right-0 z-50 w-full" data-tauri-drag-region>
        <UHeader>
            <template #title>
                <NuxtLink to="/">
                    <img src="/images/logo.svg" alt="G2M" class="h-12 w-auto" />
                </NuxtLink>
            </template>

            <div class="flex-1 flex justify-center no-drag">
                <UNavigationMenu :items="items" />
            </div>

            <template #right>
                <div class="flex items-center gap-2 no-drag">
                    <UTooltip text="最小化">
                        <UButton color="neutral" variant="ghost" @click="minimizeWindow" icon="i-heroicons-minus"
                            aria-label="最小化" />
                    </UTooltip>

                    <UTooltip text="关闭">
                        <UButton color="neutral" variant="ghost" @click="closeWindow" icon="i-heroicons-x-mark"
                            aria-label="关闭" />
                    </UTooltip>
                </div>
            </template>
        </UHeader>
    </div>
</template>

<style scoped>
/* 全局拖拽设置 */
[data-tauri-drag-region] {
    -webkit-app-region: drag;
}

/* 按钮区域禁止拖拽，确保可以正常点击 */
.no-drag {
    -webkit-app-region: no-drag;
}
</style>
