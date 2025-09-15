<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWebview } from '@/composables/useWebview'

const route = useRoute()
const router = useRouter()

const {
    loadGameInfo,
    launchGameHandler,
    formatAddedTime,
    getGameImage,
    showMessage,
    selectGameExecutable
} = useWebview()

const game = ref(null)
const loading = ref(true)
const customExecutable = ref('')

onMounted(async () => {
    const gameId = Number(route.params.id) // 强制转为数字
    if (isNaN(gameId)) {
        router.push('/')
        return
    }

    try {
        const gameData = await loadGameInfo(gameId)
        if (gameData) {
            game.value = gameData
        } else {
            showMessage('未找到指定的游戏', 'error')
            router.push('/')
        }
    } catch (error) {
        console.error('加载游戏信息失败:', error)
        showMessage('加载游戏信息失败', 'error')
        router.push('/')
    } finally {
        loading.value = false
    }
})

const launchGame = async () => {
    if (!game.value) return

    const gameData = {
        ...game.value,
        exe: customExecutable.value || undefined
    }

    await launchGameHandler(gameData)
}

const selectCustomExecutable = async () => {
    if (!game.value) return

    try {
        const executable = await selectGameExecutable({
            directory: game.value.directory,
            type: game.value.type
        })
        
        if (executable) {
            customExecutable.value = executable
            showMessage('已选择自定义可执行文件', 'success')
        }
    } catch (error) {
        console.error('选择可执行文件失败:', error)
        showMessage('选择可执行文件失败', 'error')
    }
}

const goBack = () => {
    router.push('/')
}
</script>

<template>
    <div>
        <v-btn @click="goBack" variant="text" prepend-icon="mdi-arrow-left" class="mb-4">
            返回游戏列表
        </v-btn>

        <v-card v-if="loading" class="pa-6 text-center">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <div class="mt-2">加载中...</div>
        </v-card>

        <v-card v-else-if="game" class="mx-auto">
            <v-card-title class="text-h5">{{ game.name }}</v-card-title>
        </v-card>

        <v-card v-else class="pa-6 text-center">
            <v-icon size="64" color="error">mdi-alert-circle</v-icon>
            <div class="text-h6 mt-2">
                游戏未找到
                {{ router.currentRoute.value.fullPath }}
            </div>
            <v-btn @click="goBack" color="primary" class="mt-4">返回游戏列表</v-btn>
        </v-card>
    </div>
</template>

<style scoped>

</style>