<script setup>
import { useGameExtract } from '~/composables/game/useGameExtract'
import { FolderOpen, Package } from 'lucide-vue-next'

const props = defineProps({
    gameType: {
        type: String,
        required: true
    },
    downloadRecord: {
        type: Object,
        default: null
    }
})

const emit = defineEmits(['complete', 'cancel'])

// 使用 composable - 确保 downloadRecord 是响应式的
const downloadRecordRef = computed(() => props.downloadRecord)
const {
    extractPath,
    isExtracting,
    extractProgress,
    currentFile,
    totalFiles,
    extractedFiles,
    gameNames,
    selectExtractFolder,
    startExtract,
    reset
} = useGameExtract(computed(() => props.gameType), downloadRecordRef)

// 选择解压目录
const handleSelectFolder = async () => {
    await selectExtractFolder()
}

// 开始解压
const handleStartExtract = async () => {
    const result = await startExtract()
    if (result?.success) {
        emit('complete')
        reset()
    }
}

// 取消
const handleCancel = () => {
    if (isExtracting.value) {
        return
    }
    emit('cancel')
    reset()
}

// 获取文件名
const getFileName = (path) => {
    if (!path) return ''
    return path.split(/[/\\]/).pop() || path
}
</script>

<template>
    <div class="space-y-4">
        <!-- 下载记录信息 -->
        <NAlert v-if="props.downloadRecord" type="info" title="ZIP 文件信息">
            <div class="space-y-1 text-sm">
                <div>文件：{{ getFileName(props.downloadRecord.zip_path) }}</div>
                <div>下载日期：{{ new Date(props.downloadRecord.download_date).toLocaleString('zh-CN') }}</div>
            </div>
        </NAlert>
        <NAlert v-else type="warning" title="未找到下载记录">
            请先下载游戏文件
        </NAlert>

        <!-- 解压位置选择 -->
        <div>
            <label class="block text-sm font-medium mb-2">解压位置</label>
            <div class="flex gap-2">
                <NInput
                    :value="extractPath"
                    placeholder="请选择解压位置"
                    readonly
                    class="flex-1"
                />
                <NButton
                    @click="handleSelectFolder"
                    :disabled="isExtracting"
                >
                    <template #icon>
                        <FolderOpen :size="16" />
                    </template>
                    选择位置
                </NButton>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                将在选择的位置自动创建游戏文件夹（如：{{ gameNames?.[props.gameType] || props.gameType }}），如果文件夹已存在则创建为 {{ gameNames?.[props.gameType] || props.gameType }}-1、{{ gameNames?.[props.gameType] || props.gameType }}-2 等
            </p>
        </div>

        <!-- 解压进度 -->
        <div v-if="isExtracting" class="space-y-2">
            <NAlert type="info" title="正在解压游戏文件...">
                <div class="space-y-2">
                    <div class="text-sm">
                        进度：{{ extractedFiles }}{{ totalFiles > 0 ? ' / ' + totalFiles : '' }} 个文件
                    </div>
                    <div v-if="currentFile" class="text-xs text-gray-500 dark:text-gray-400">
                        当前文件：{{ getFileName(currentFile) }}
                    </div>
                </div>
            </NAlert>
            <NProgress
                :percentage="extractProgress"
                :show-indicator="false"
            />
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end gap-2 pt-2">
            <NButton
                @click="handleCancel"
                :disabled="isExtracting"
            >
                取消
            </NButton>
            <NButton
                type="primary"
                @click="handleStartExtract"
                :disabled="!extractPath || isExtracting"
                :loading="isExtracting"
            >
                <template #icon>
                    <Package :size="16" />
                </template>
                开始解压
            </NButton>
        </div>
    </div>
</template>

