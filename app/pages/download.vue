<script setup>
// 使用认证中间件，未登录时自动跳转到登录页面
definePageMeta({
    middleware: 'auth'
})

import { useDownloadRecords } from '~/composables/game/useDownloadRecords'
import { useGameDownload } from '~/composables/game/useGameDownload'
import { useGameExtract } from '~/composables/game/useGameExtract'
import { GAME_TYPE_NAMES, GAME_IMAGES } from '~/constants/game'
import { Download, Package, CheckCircle2, XCircle } from 'lucide-vue-next'

const { downloadRecords, loadDownloadRecords, getGameDownloadStatus, getDownloadRecord } = useDownloadRecords()

// 游戏列表
const games = [
    { type: 'gta3', name: 'Grand Theft Auto III', description: 'GTA III - 经典开放世界游戏' },
    { type: 'gtavc', name: 'Grand Theft Auto Vice City', description: 'GTA Vice City - 80年代风格' },
    { type: 'gtasa', name: 'Grand Theft Auto San Andreas', description: 'GTA San Andreas - 最受欢迎的GTA游戏' }
]

// 当前操作的游戏类型
const selectedGameType = ref(null)
const downloadDialogVisible = ref(false)
const extractDialogVisible = ref(false)
const cancellingDownload = ref(false)

// 下载相关
const downloadComposables = ref({})
const extractComposables = ref({})

// 初始化下载和解压 composables
games.forEach(game => {
    const gameType = ref(game.type)
    downloadComposables.value[game.type] = useGameDownload(gameType)
    extractComposables.value[game.type] = useGameExtract(gameType, computed(() => getDownloadRecord(game.type)))
})

// 处理下载
const handleDownload = async (gameType) => {
    selectedGameType.value = gameType
    downloadDialogVisible.value = true

    // 延迟一下，确保对话框已经显示
    await nextTick()

    const downloadComposable = downloadComposables.value[gameType]
    const result = await downloadComposable.startDownload()

    if (result?.success) {
        await loadDownloadRecords()
        downloadDialogVisible.value = false
        selectedGameType.value = null
    } else if (result?.cancelled) {
        // 用户取消，关闭对话框
        downloadDialogVisible.value = false
        selectedGameType.value = null
    }
    // 下载失败时保持对话框打开，显示错误信息
}

// 处理取消下载
const handleDownloadCancel = async (gameType) => {
    if (!gameType) return

    cancellingDownload.value = true

    // 立即关闭对话框，提供快速反馈
    downloadDialogVisible.value = false
    selectedGameType.value = null

    // 异步执行取消操作
    const downloadComposable = downloadComposables.value[gameType]
    if (downloadComposable) {
        try {
            await downloadComposable.cancelDownload()
        } catch (error) {
            console.error('取消下载失败:', error)
        }
    }

    cancellingDownload.value = false
}

// 处理解压
const handleExtract = (gameType) => {
    selectedGameType.value = gameType
    extractDialogVisible.value = true
}

// 处理解压完成
const handleExtractComplete = async () => {
    extractDialogVisible.value = false
    selectedGameType.value = null
    await loadDownloadRecords()
}

// 处理解压取消
const handleExtractCancel = () => {
    extractDialogVisible.value = false
    selectedGameType.value = null
}

// 格式化文件大小
const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// 格式化日期
const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}
</script>

<template>
    <UPage>
        <UPageBody>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <UCard v-for="game in games" :key="game.type" class="hover:shadow-lg transition-shadow">
                    <template #header>
                        <div class="flex items-center gap-3">
                            <img :src="GAME_IMAGES[game.type]" :alt="game.name"
                                class="w-16 h-16 rounded-lg object-cover"
                                @error="$event.target.src = '/images/null.svg'" />
                            <div class="flex-1">
                                <h3 class="text-lg font-semibold">{{ game.name }}</h3>
                                <p class="text-sm text-gray-500 dark:text-gray-400">{{ game.description }}</p>
                            </div>
                        </div>
                    </template>

                    <div class="space-y-4">
                        <!-- 下载状态 -->
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-gray-600 dark:text-gray-400">下载状态：</span>
                            <div class="flex items-center gap-2">
                                <CheckCircle2 v-if="getGameDownloadStatus(game.type) === 'downloaded'"
                                    class="w-5 h-5 text-green-500" />
                                <XCircle v-else class="w-5 h-5 text-gray-400" />
                                <span class="text-sm font-medium">
                                    {{ getGameDownloadStatus(game.type) === 'downloaded' ? '已下载' : '未下载' }}
                                </span>
                            </div>
                        </div>

                        <!-- 下载信息 -->
                        <div v-if="getDownloadRecord(game.type)" class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-gray-400">文件大小：</span>
                                <span class="font-medium">{{ formatBytes(getDownloadRecord(game.type)?.file_size)
                                }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-gray-400">下载时间：</span>
                                <span class="font-medium">{{ formatDate(getDownloadRecord(game.type)?.download_date)
                                }}</span>
                            </div>
                        </div>

                        <!-- 操作按钮 -->
                        <div class="flex gap-2">
                            <NButton v-if="getGameDownloadStatus(game.type) !== 'downloaded'" type="primary"
                                :loading="downloadComposables[game.type]?.isDownloading"
                                @click="handleDownload(game.type)" class="flex-1">
                                <template #icon>
                                    <Download :size="16" />
                                </template>
                                下载
                            </NButton>
                            <NButton v-else type="success" @click="handleExtract(game.type)" class="flex-1">
                                <template #icon>
                                    <Package :size="16" />
                                </template>
                                解压安装
                            </NButton>
                        </div>
                    </div>
                </UCard>
            </div>

            <!-- 下载对话框 -->
            <NModal v-model:show="downloadDialogVisible"
                :title="selectedGameType ? `下载 ${GAME_TYPE_NAMES[selectedGameType]}` : '下载游戏'" preset="card"
                style="width: 600px">
                <div v-if="selectedGameType" class="space-y-4">
                    <div class="space-y-2">
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600 dark:text-gray-400">下载进度：</span>
                            <span class="font-medium">
                                {{ Math.round(downloadComposables[selectedGameType]?.downloadProgress || 0) }}%
                            </span>
                        </div>
                        <NProgress :percentage="downloadComposables[selectedGameType]?.downloadProgress || 0"
                            :show-indicator="false" />
                    </div>

                    <div class="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>
                            已下载：{{
                                downloadComposables[selectedGameType]?.formatBytes?.(downloadComposables[selectedGameType]?.downloadedBytes
                                    || 0) }}
                        </span>
                        <span>
                            总计：{{
                                downloadComposables[selectedGameType]?.formatBytes?.(downloadComposables[selectedGameType]?.totalBytes
                                    || 0) }}
                        </span>
                    </div>

                    <div class="flex justify-end gap-2 pt-4">
                        <NButton @click="handleDownloadCancel(selectedGameType)" :loading="cancellingDownload">
                            {{ downloadComposables[selectedGameType]?.isDownloading ? '取消下载' : '关闭' }}
                        </NButton>
                    </div>
                </div>
            </NModal>

            <!-- 解压对话框 -->
            <NModal v-model:show="extractDialogVisible"
                :title="selectedGameType ? `解压安装 ${GAME_TYPE_NAMES[selectedGameType]}` : '解压安装'" preset="card"
                style="width: 600px" :mask-closable="false">
                <GameExtractDialog v-if="selectedGameType" :key="`extract-${selectedGameType}-${extractDialogVisible}`"
                    :game-type="selectedGameType" :download-record="getDownloadRecord(selectedGameType)"
                    @complete="handleExtractComplete" @cancel="handleExtractCancel" />
            </NModal>
        </UPageBody>
    </UPage>
</template>
