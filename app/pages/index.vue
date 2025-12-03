<script setup>
import { useGameList } from '~/composables/ui/useGameList'
import { useMessage } from '~/composables/ui/useMessage'

const { games, isLoading, fetchGames, refreshGames } = useGameList()
const { showSuccess } = useMessage()

// 添加游戏模态框状态
const isAddModalOpen = ref(false)
const addCardRef = ref()

// 检查是否为空状态
const isEmpty = computed(() => !isLoading.value && games.value.length === 0)

// 处理刷新
const handleRefresh = async () => {
    try {
        await refreshGames()
        showSuccess('刷新成功')
    } catch (error) {
        console.error('刷新失败:', error)
    }
}

// 处理添加游戏
const handleAddGame = () => {
    if (addCardRef.value) {
        addCardRef.value.openModal()
    } else {
        isAddModalOpen.value = true
    }
}

onMounted(() => {
    fetchGames()
})
</script>

<template>

    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
        <div class="text-center">
            <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p class="text-muted">加载中...</p>
        </div>
    </div>

    <div v-else-if="isEmpty" class="flex flex-col items-center justify-center min-h-[400px]">
        <UEmpty icon="i-lucide-file" title="未找到游戏" description="看起来你还没有添加任何游戏。请添加一个游戏以开始。" />
        <div class="mt-6 flex gap-3">
            <UButton icon="i-lucide-plus" @click="handleAddGame" color="primary">
                添加游戏
            </UButton>
            <UButton icon="i-lucide-refresh-cw" @click="handleRefresh" color="neutral" variant="subtle">
                刷新
            </UButton>
        </div>
        <GameAddCard ref="addCardRef" v-model="isAddModalOpen" class="hidden" />
    </div>

    <UBlogPosts v-else>
        <GameCard v-for="game in games" :key="game.id" :game="game" />
        <GameAddCard ref="addCardRef" v-model="isAddModalOpen" />
    </UBlogPosts>
</template>
