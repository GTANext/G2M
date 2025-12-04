<script setup>
import { useSettings } from '~/composables/ui/useSettings'
import UIStarsBackground from '~/components/UI/StarsBackground.vue'

const route = useRoute()
const { settings } = useSettings()

// 根据路由 meta 和用户设置决定是否显示背景
const enableBackground = computed(() => {
    // 如果路由明确禁用背景，则不显示
    if (route.meta.enableBackground === false) {
        return false
    }
    // 确保在客户端才读取设置
    if (typeof window === 'undefined') {
        return false
    }
    // 否则根据用户设置决定（settings 是 reactive，直接访问属性）
    return settings.appearance?.enableStarfield ?? false
})
</script>

<template>
    <div class="relative">
        <ClientOnly>
            <UIStarsBackground v-if="enableBackground" :key="`stars-${enableBackground}`" class="fixed inset-0 -z-10" />
        </ClientOnly>
        <G2MAppHead />
        <UMain class="my-4 pt-14">
            <UContainer>
                <slot />
            </UContainer>
        </UMain>
        <G2MAppFoot />
    </div>
</template>