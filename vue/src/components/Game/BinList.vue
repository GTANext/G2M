<script setup>
import { onMounted } from 'vue'
import { useWebview } from '@/composables/useWebview'

const {
    deletedGames,
    isGamesLoading,
    loadDeletedGames,
    restoreGameHandler,
    formatAddedTime,
    getGameImage
} = useWebview()

onMounted(async () => {
    await loadDeletedGames()
})

const handleRestoreGame = async (index) => {
    try {
        // 直接传递索引数字而不是对象
        await restoreGameHandler(index);
        // 重新加载列表
        await loadDeletedGames()
    } catch (error) {
        if (window.motyf) {
            window.motyf({ content: "游戏恢复失败", type: "error" })
        }
    }
}

const refreshList = async () => {
    await loadDeletedGames()
}
</script>

<template>
    <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
            <span>已删除的游戏</span>
            <v-btn variant="tonal" size="small" @click="refreshList" :loading="isGamesLoading">
                <v-icon start>mdi-refresh</v-icon>
                刷新
            </v-btn>
        </v-card-title>

        <v-card-text>
            <a-spin :loading="isGamesLoading" style="width: 100%;">
                <a-empty v-if="!isGamesLoading && (!deletedGames || deletedGames.length === 0)" description="暂无已删除的游戏">
                    <template #icon>
                        <v-icon size="48" color="grey">mdi-delete-empty</v-icon>
                    </template>
                </a-empty>

                <a-list v-else>
                    <a-list-item v-for="(game, index) in deletedGames" :key="index" class="my-2">
                        <a-list-item-meta>
                            <template #avatar>
                                <a-avatar shape="square" size="large">
                                    <img :src="getGameImage(game.type)" :alt="game.name || game.type"
                                        style="object-fit: cover;" />
                                </a-avatar>
                            </template>
                            <template #title>
                                <div class="d-flex align-center">
                                    <span>{{ game.name || game.type || '未知游戏' }}</span>
                                    <a-tag color="red" size="small" class="mx-2">已删除</a-tag>
                                </div>
                            </template>
                            <template #description>
                                <div class="d-flex flex-column ga-1">
                                    <div class="d-flex align-center text-body-2 text-medium-emphasis">
                                        <v-icon size="small" class="mr-2">mdi-folder</v-icon>
                                        <span class="text-truncate">{{ game.directory }}</span>
                                    </div>
                                    <div v-if="game.addedTime"
                                        class="d-flex align-center text-body-2 text-medium-emphasis">
                                        <v-icon size="small" class="mr-2">mdi-clock-outline</v-icon>
                                        <span>添加时间: {{ formatAddedTime(game.addedTime) }}</span>
                                    </div>
                                    <div v-if="game.deletedTime"
                                        class="d-flex align-center text-body-2 text-medium-emphasis">
                                        <v-icon size="small" class="mr-2">mdi-delete</v-icon>
                                        <span>删除时间: {{ formatAddedTime(game.deletedTime) }}</span>
                                    </div>
                                </div>
                            </template>
                        </a-list-item-meta>
                        <template #actions>
                            <v-btn variant="text" size="small" @click="() => handleRestoreGame(index)" color="primary">
                                <v-icon start>mdi-undo</v-icon>
                                恢复
                            </v-btn>
                        </template>
                    </a-list-item>
                </a-list>
            </a-spin>
        </v-card-text>
    </v-card>
</template>

<style scoped></style>