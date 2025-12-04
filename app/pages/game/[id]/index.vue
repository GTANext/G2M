<script setup>
import { useGameInfo } from '~/composables/game/useGameInfo'
import { useGameActions } from '~/composables/game/useGameActions'
import { useModPrerequisites } from '~/composables/game/useModPrerequisites'
import { Play, FolderOpen, FileText, Calendar, Tag } from 'lucide-vue-next'
import { GAME_TYPE_NAMES } from '~/constants/game'

const route = useRoute()
const gameId = computed(() => route.params.id)

const { 
    gameData, 
    loading, 
    loadGameInfo,
    getGameTypeName,
    getGameImage,
    getGameDirectory,
    getGameExecutable,
    modLoaderStatus,
    modLoaderLoading,
    hasMissingModLoaders,
    checkModLoaders
} = useGameInfo(gameId)

const { 
    loading: actionLoading, 
    launchGame, 
    openGameFolder 
} = useGameActions()

const gameInfoRef = computed(() => gameData.value)
const { modStatus, loadModStatus } = useModPrerequisites(gameInfoRef)

// 格式化时间
const formatTime = (timeString) => {
    if (!timeString) return '未知时间'
    const date = new Date(timeString)
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// 处理启动游戏
const handleLaunch = () => {
    launchGame(gameData.value)
}

// 处理打开文件夹
const handleOpenFolder = () => {
    openGameFolder(gameData.value)
}

// 加载游戏信息和MOD状态
onMounted(async () => {
    if (gameId.value) {
        await loadGameInfo()
        if (gameData.value?.dir) {
            await checkModLoaders()
            await loadModStatus()
        }
    }
})
</script>

<template>
    <div v-if="loading" class="flex justify-center items-center py-20">
        <NSpin size="large">
            <template #description>正在加载游戏信息...</template>
        </NSpin>
    </div>

    <div v-else-if="gameData" class="space-y-6">
        <!-- MOD加载器警告 -->
        <NAlert v-if="hasMissingModLoaders" type="warning" title="缺少必要的MOD加载器">
            请前往"前置安装"页面查看详情并安装必要的MOD加载器。
        </NAlert>
        <NAlert v-else-if="modLoaderLoading" type="info" title="正在检查 MOD 前置环境" />

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- 左侧：游戏封面 -->
            <div class="lg:col-span-1">
                <UCard>
                    <div class="relative">
                        <img
                            :src="getGameImage"
                            :alt="gameData.name"
                            class="w-full rounded-lg object-cover"
                            @error="$event.target.src = '/images/null.svg'"
                        />
                        <div class="absolute top-3 right-3">
                            <NTag :type="modStatus.dinput8 && modStatus.cleo ? 'success' : 'warning'">
                                {{ getGameTypeName }}
                            </NTag>
                        </div>
                    </div>
                </UCard>
            </div>

            <!-- 右侧：游戏详情和操作 -->
            <div class="lg:col-span-2 space-y-6">
                <!-- 游戏名称 -->
                <div>
                    <h2 class="text-2xl font-bold mb-2">{{ gameData.name }}</h2>
                </div>

                <!-- 游戏信息 -->
                <UCard>
                    <div class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="flex items-center gap-3">
                                <Tag class="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                <div>
                                    <div class="text-sm text-gray-500 dark:text-gray-400">游戏类型</div>
                                    <div class="font-medium">{{ getGameTypeName }}</div>
                                </div>
                            </div>

                            <div class="flex items-center gap-3">
                                <FolderOpen class="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                <div class="flex-1 min-w-0">
                                    <div class="text-sm text-gray-500 dark:text-gray-400">游戏目录</div>
                                    <div class="font-medium truncate" :title="getGameDirectory">
                                        {{ getGameDirectory }}
                                    </div>
                                </div>
                            </div>

                            <div class="flex items-center gap-3">
                                <FileText class="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                <div>
                                    <div class="text-sm text-gray-500 dark:text-gray-400">启动程序</div>
                                    <div class="font-medium">{{ getGameExecutable || '未设置' }}</div>
                                </div>
                            </div>

                            <div v-if="gameData.time" class="flex items-center gap-3">
                                <Calendar class="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                <div>
                                    <div class="text-sm text-gray-500 dark:text-gray-400">添加时间</div>
                                    <div class="font-medium">{{ formatTime(gameData.time) }}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </UCard>

                <!-- 操作按钮 -->
                <UCard>
                    <div class="flex flex-wrap gap-3">
                        <NButton 
                            type="primary" 
                            size="large"
                            :loading="actionLoading.launch"
                            @click="handleLaunch"
                        >
                            <template #icon>
                                <Play :size="18" />
                            </template>
                            启动游戏
                        </NButton>

                        <NButton 
                            size="large"
                            :loading="actionLoading.openFolder"
                            @click="handleOpenFolder"
                        >
                            <template #icon>
                                <FolderOpen :size="18" />
                            </template>
                            打开文件夹
                        </NButton>
                    </div>
                </UCard>
            </div>
        </div>
    </div>

    <div v-else class="flex justify-center items-center py-20">
        <UEmpty description="游戏信息不存在" />
    </div>
</template>
