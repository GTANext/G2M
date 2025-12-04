<script setup lang="ts">
import { useGameInfo } from '~/composables/game/useGameInfo'
import { useModApi } from '~/composables/api/useModApi'
import type { G2MModInfo } from '~/composables/api/useModApi'
import { useMessage } from '~/composables/ui/useMessage'
import { Inbox, FolderOpen, File, RefreshCw } from 'lucide-vue-next'

const route = useRoute()
const gameId = computed(() => route.params.id)

const { gameData, loadGameInfo } = useGameInfo(gameId)
const modApi = useModApi()
const { showError } = useMessage()

// MOD列表
const mods = ref<G2MModInfo[]>([])
const loading = computed(() => modApi.loadingState.loading)

// 拖拽状态
const isDragging = ref(false)
const dragOverZone = ref<'left' | 'right' | null>(null)

// MOD类型标签颜色映射
const getModTagColor = (type: string) => {
    const colorMap: Record<string, string> = {
        'CLEO 脚本': 'success',
        'CLEO Redux': 'info',
        'ModLoader 资源': 'warning',
        'ASI 插件': 'error',
        'DLL 插件': 'default'
    }
    return colorMap[type] || 'default'
}

// 获取MOD类型
const getModType = (mod: G2MModInfo): string => {
    if (mod.type) {
        const typeMap: Record<string, string> = {
            cleo: 'CLEO 脚本',
            cleo_redux: 'CLEO Redux',
            modloader: 'ModLoader 资源',
            asi: 'ASI 插件',
            dll: 'DLL 插件'
        }
        return typeMap[mod.type] || mod.type
    }
    
    const path = mod.install_path || ''
    if (path.includes('cleoredux') || path.includes('plugins/cleo')) {
        return 'CLEO Redux'
    }
    if (path.includes('/cleo/') || path.endsWith('.cs')) {
        return 'CLEO 脚本'
    }
    if (path.includes('modloader')) {
        return 'ModLoader 资源'
    }
    if (path.endsWith('.asi')) {
        return 'ASI 插件'
    }
    if (path.endsWith('.dll')) {
        return 'DLL 插件'
    }
    return '未知类型'
}

// 判断是否为目录
const isDirectoryPath = (path?: string | null): boolean => {
    if (!path) return false
    return !/\.[^/\\]+$/.test(path)
}

// 加载MOD列表
const loadMods = async () => {
    if (!gameData.value?.dir) return
    const modList = await modApi.getGameMods(gameData.value.dir)
    mods.value = modList
}

// 处理拖拽进入
const handleDragEnter = (e: DragEvent, zone: 'left' | 'right') => {
    e.preventDefault()
    e.stopPropagation()
    isDragging.value = true
    dragOverZone.value = zone
}

// 处理拖拽悬停
const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy'
    }
}

// 处理拖拽离开
const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        isDragging.value = false
        dragOverZone.value = null
    }
}

// 处理文件拖拽放置
const handleDrop = async (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isDragging.value = false
    dragOverZone.value = null

    if (!gameData.value?.dir) {
        showError('游戏目录不存在')
        return
    }

    try {
        const files = e.dataTransfer?.files
        if (files && files.length > 0) {
            const file = files[0]
            const fileName = file.name.toLowerCase()
            const isZip = fileName.endsWith('.zip') || fileName.endsWith('.rar') || fileName.endsWith('.7z')
            const isModFile = fileName.endsWith('.cs') || fileName.endsWith('.js') || fileName.endsWith('.ts') 
                || fileName.endsWith('.asi') || fileName.endsWith('.dll')

            if (isZip || isModFile) {
                // 在Tauri环境中，尝试获取文件路径
                let filePath: string | null = null
                if ('path' in file && file.path) {
                    filePath = file.path as string
                }

                if (filePath) {
                    const modName = file.name.replace(/\.(zip|rar|7z|cs|js|ts|asi|dll)$/i, '')
                    const result = await modApi.installUserMod({
                        game_dir: gameData.value.dir,
                        mod_source_path: filePath,
                        mod_name: modName,
                        overwrite: false
                    })

                    if (result) {
                        await loadMods()
                    }
                } else {
                    // 无法获取路径，使用文件选择器
                    await handleSelectAndInstall(false)
                }
            }
        }
    } catch (error) {
        console.error('处理文件拖拽失败:', error)
    }
}

// 选择并安装MOD文件或文件夹
const handleSelectAndInstall = async (isDirectory: boolean = false) => {
    if (!gameData.value?.dir) {
        showError('游戏目录不存在')
        return
    }

    try {
        const selectedPath = await modApi.selectModFiles(isDirectory)
        if (selectedPath) {
            const pathParts = selectedPath.replace(/\\/g, '/').split('/')
            const name = pathParts[pathParts.length - 1] || '未命名MOD'
            const modName = name.replace(/\.(zip|rar|7z|cs|js|ts|asi|dll)$/i, '')

            const result = await modApi.installUserMod({
                game_dir: gameData.value.dir,
                mod_source_path: selectedPath,
                mod_name: modName,
                overwrite: false
            })

            if (result) {
                await loadMods()
            }
        }
    } catch (error) {
        console.error('选择MOD文件失败:', error)
    }
}

// 监听gameData变化
watch(() => gameData.value?.dir, () => {
    if (gameData.value?.dir) {
        loadMods()
    }
}, { immediate: true })

// 组件挂载时加载
onMounted(async () => {
    await loadGameInfo()
    if (gameData.value?.dir) {
        await loadMods()
    }
})
</script>

<template>
    <div class="space-y-6">
        <!-- 有MOD时显示列表 -->
        <div v-if="mods.length > 0">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold">已安装的MOD ({{ mods.length }})</h3>
                <NButton @click="loadMods" :loading="loading">
                    <template #icon>
                        <RefreshCw :size="16" />
                    </template>
                    刷新列表
                </NButton>
            </div>

            <NSpin :show="loading">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <UCard 
                        v-for="mod in mods" 
                        :key="mod.id"
                        class="hover:shadow-lg transition-shadow"
                    >
                        <div class="flex items-start gap-3">
                            <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <FolderOpen v-if="isDirectoryPath(mod.install_path)" :size="20" class="text-primary" />
                                <File v-else :size="20" class="text-primary" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="font-semibold mb-1 truncate">{{ mod.name }}</div>
                                <div class="flex flex-wrap gap-2 mb-2">
                                    <NTag :type="getModTagColor(getModType(mod))" size="small">
                                        {{ getModType(mod) }}
                                    </NTag>
                                    <NTag v-if="mod.author" size="small">
                                        {{ mod.author }}
                                    </NTag>
                                </div>
                                <div v-if="mod.install_path" class="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {{ mod.install_path }}
                                </div>
                            </div>
                        </div>
                    </UCard>
                </div>
            </NSpin>
        </div>

        <!-- 没有MOD时显示拖拽安装界面 -->
        <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- 左侧：拖拽区域 -->
            <div class="lg:col-span-2">
                <UCard 
                    :class="{ 'border-primary bg-primary/5': isDragging && dragOverZone === 'left' }"
                    @dragenter="(e) => handleDragEnter(e, 'left')"
                    @dragover="handleDragOver"
                    @dragleave="handleDragLeave"
                    @drop="handleDrop"
                    class="h-full transition-all"
                >
                    <div class="flex flex-col items-center justify-center py-20 px-8 text-center">
                        <Inbox :size="64" class="text-primary mb-4" />
                        <h3 class="text-lg font-semibold mb-2">拖拽MOD文件到此处</h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">
                            支持 ZIP 压缩包、文件夹或单个文件
                        </p>
                        <p class="text-xs text-gray-400 dark:text-gray-500">
                            (.cs, .js, .ts, .asi, .dll 等)
                        </p>
                    </div>
                </UCard>
            </div>

            <!-- 右侧：操作按钮区域 -->
            <div class="lg:col-span-1">
                <UCard>
                    <template #header>
                        <h3 class="font-semibold">操作</h3>
                    </template>
                    <div class="space-y-3">
                        <NButton 
                            type="primary" 
                            block 
                            @click="() => handleSelectAndInstall(false)" 
                            :loading="loading"
                        >
                            <template #icon>
                                <File :size="16" />
                            </template>
                            选择MOD文件
                        </NButton>
                        <NButton 
                            block 
                            @click="() => handleSelectAndInstall(true)" 
                            :loading="loading"
                        >
                            <template #icon>
                                <FolderOpen :size="16" />
                            </template>
                            选择MOD文件夹
                        </NButton>
                        <NButton 
                            block 
                            @click="loadMods" 
                            :loading="loading"
                        >
                            <template #icon>
                                <RefreshCw :size="16" />
                            </template>
                            刷新MOD列表
                        </NButton>
                    </div>
                </UCard>
            </div>
        </div>
    </div>
</template>
