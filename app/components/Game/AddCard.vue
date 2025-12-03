<script setup>
import { useGameList } from '~/composables/ui/useGameList'
const { refreshGames } = useGameList()
const addGameVisible = ref(false)

// 打开对话框
const openDialog = () => {
    addGameVisible.value = true
}

// 处理添加游戏成功
const handleAddGameSuccess = async () => {
    await refreshGames()
}

// 处理取消
const handleAddGameCancel = () => {
    // 取消时不需要额外操作
}

// 暴露方法供外部调用
defineExpose({
    openModal: openDialog,
    openDialog
})
</script>

<template>
    <UCard class="cursor-pointer hover:border-primary transition-colors border-2 border-dashed" @click="openDialog">
        <div class="flex flex-col items-center justify-center p-20">
            <UIcon name="i-heroicons-plus-circle" class="w-12 h-12 text-muted mb-4" />
            <p class="text-lg font-medium text-muted">添加游戏</p>
        </div>
    </UCard>
    <GameAddDialog v-model:show="addGameVisible" @success="handleAddGameSuccess" @cancel="handleAddGameCancel" />
</template> 