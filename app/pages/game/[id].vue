<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { useGameInfo } from '~/composables/game/useGameInfo'

const route = useRoute()
const gameId = computed(() => route.params.id)

const { gameData, loadGameInfo } = useGameInfo(gameId)

// 加载游戏信息
onMounted(() => {
    if (gameId.value) {
        loadGameInfo()
    }
})

// 导航菜单项
const items = computed<NavigationMenuItem[][]>(() => [
    [
        {
            label: '游戏信息',
            type: 'label'
        },
        {
            label: '概览',
            icon: 'i-heroicons-information-circle',
            to: `/game/${gameId.value}`,
            active: route.path === `/game/${gameId.value}`
        },
        {
            label: 'MOD 管理',
            icon: 'i-heroicons-cube',
            to: `/game/${gameId.value}/mods`,
            active: route.path.startsWith(`/game/${gameId.value}/mods`)
        },
        {
            label: '设置',
            icon: 'i-heroicons-cog-6-tooth',
            to: `/game/${gameId.value}/settings`,
            active: route.path.startsWith(`/game/${gameId.value}/settings`)
        }
    ]
])
</script>

<template>
    <UPage>
        <template #left>
            <UNavigationMenu orientation="vertical" :items="items" class="data-[orientation=vertical]:w-42" />
        </template>
        <UPageBody>
            <UPageHeader 
                :title="gameData?.name" 
                :description="gameData?.description"
                :headline="gameData?.dir" 
                class="mt-[-48px]"
            >
                <template #links>
                    <UButton icon="i-heroicons-play" label="启动游戏" />
                </template>
            </UPageHeader>
            <slot />
        </UPageBody>
    </UPage>
</template>
