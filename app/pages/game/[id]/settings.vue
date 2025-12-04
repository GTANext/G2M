<script setup>
import { useGameInfo } from '~/composables/game/useGameInfo'
import { useGameActions } from '~/composables/game/useGameActions'
import { useGameApi } from '~/composables/api/useGameApi'
import { useMessage } from '~/composables/ui/useMessage'
import { Edit, Trash2, Settings, AlertTriangle, FolderOpen, Image } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const gameId = computed(() => route.params.id)

const { gameData, loadGameInfo } = useGameInfo(gameId)
const { loading: actionLoading, saveEdit } = useGameActions()
const gameApi = useGameApi()
const { showError, showSuccess, showWarning } = useMessage()

// 编辑对话框状态
const editDialogVisible = ref(false)
const editFormData = ref({
    name: '',
    dir: '',
    exe: '',
    img: ''
})

// 删除确认对话框
const deleteDialogVisible = ref(false)

// 初始化编辑表单
const initEditForm = () => {
    if (gameData.value) {
        editFormData.value = {
            name: gameData.value.name || '',
            dir: gameData.value.dir || '',
            exe: gameData.value.exe || '',
            img: gameData.value.img || ''
        }
    }
}

// 打开编辑对话框
const handleEdit = () => {
    initEditForm()
    editDialogVisible.value = true
}

// 取消编辑
const handleCancelEdit = () => {
    editDialogVisible.value = false
    initEditForm()
}

// 保存编辑
const handleSaveEdit = async () => {
    const success = await saveEdit(gameId.value, editFormData.value, gameData.value)
    if (success) {
        editDialogVisible.value = false
        await loadGameInfo()
    }
}

// 处理删除游戏
const handleDelete = () => {
    deleteDialogVisible.value = true
}

// 确认删除
const handleConfirmDelete = async () => {
    try {
        const response = await gameApi.deleteGame(gameId.value)
        if (response?.success) {
            showSuccess('游戏删除成功')
            router.push('/')
        } else {
            showError('删除游戏失败', { detail: response?.error })
        }
    } catch (error) {
        showError('删除游戏失败', { detail: error })
    } finally {
        deleteDialogVisible.value = false
    }
}

// 选择游戏目录
const selectingFolder = ref(false)
const handleSelectFolder = async () => {
    try {
        selectingFolder.value = true
        const response = await gameApi.selectGameFolder()
        if (response?.success && response?.data) {
            // 检查是否有重复目录
            const duplicateCheck = await gameApi.checkDuplicateDirectory(response.data, gameId.value)
            if (duplicateCheck?.success && duplicateCheck?.data?.is_duplicate) {
                showError('该目录已被其他游戏使用')
                return
            }
            editFormData.value.dir = response.data
        }
    } catch (error) {
        console.error('选择游戏目录失败:', error)
    } finally {
        selectingFolder.value = false
    }
}

// 选择游戏图片
const selectingImage = ref(false)
const handleSelectImage = async () => {
    try {
        selectingImage.value = true
        const { useImageHandler } = await import('~/composables/useImageHandler')
        const { selectImageFile } = useImageHandler()
        const imageResult = await selectImageFile()
        if (imageResult?.dataUrl) {
            editFormData.value.img = imageResult.dataUrl
        }
    } catch (error) {
        console.error('选择图片失败:', error)
    } finally {
        selectingImage.value = false
    }
}

// 加载游戏信息
onMounted(async () => {
    if (gameId.value) {
        await loadGameInfo()
        initEditForm()
    }
})
</script>

<template>
    <div class="space-y-6">
        <!-- 危险操作警告 -->
        <NAlert type="warning" title="警告">
            <template #header>
                <div class="flex items-center gap-2">
                    <AlertTriangle :size="16" />
                    <span>危险操作</span>
                </div>
            </template>
            修改游戏设置可能导致游戏无法正常启动，请谨慎操作。
        </NAlert>

        <!-- 编辑游戏信息 -->
        <UCard>
            <template #header>
                <div class="flex items-center gap-2">
                    <Edit :size="18" />
                    <h3 class="font-semibold">编辑游戏信息</h3>
                </div>
            </template>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-2">游戏名称</label>
                    <NInput v-model:value="editFormData.name" placeholder="请输入游戏名称" />
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">游戏目录</label>
                    <div class="flex gap-2">
                        <NInput v-model:value="editFormData.dir" placeholder="点击按钮选择游戏安装目录" readonly class="flex-1" />
                        <NButton @click="handleSelectFolder" :loading="selectingFolder">
                            <template #icon>
                                <FolderOpen :size="16" />
                            </template>
                            选择目录
                        </NButton>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        修改游戏目录可能导致游戏无法正常启动，请谨慎操作
                    </p>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">启动程序</label>
                    <NInput v-model:value="editFormData.exe" placeholder="请输入启动程序名称（如：gta_sa.exe）" />
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">游戏封面</label>
                    <div class="flex gap-2">
                        <NInput v-model:value="editFormData.img" placeholder="点击按钮选择游戏封面图片" readonly class="flex-1" />
                        <NButton @click="handleSelectImage" :loading="selectingImage">
                            <template #icon>
                                <Image :size="16" />
                            </template>
                            选择图片
                        </NButton>
                    </div>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <NButton @click="handleCancelEdit">取消</NButton>
                    <NButton type="primary" @click="handleSaveEdit" :loading="actionLoading.saveEdit">
                        保存修改
                    </NButton>
                </div>
            </div>
        </UCard>

        <!-- 删除游戏 -->
        <UCard>
            <template #header>
                <div class="flex items-center gap-2">
                    <Trash2 :size="18" class="text-red-500" />
                    <h3 class="font-semibold text-red-500">删除游戏</h3>
                </div>
            </template>
            <div class="space-y-4">
                <p class="text-sm text-gray-600 dark:text-gray-400">
                    删除游戏将从列表中移除该游戏，但不会删除游戏文件本身。
                </p>
                <NButton type="error" @click="handleDelete">
                    <template #icon>
                        <Trash2 :size="16" />
                    </template>
                    删除游戏
                </NButton>
            </div>
        </UCard>
    </div>

    <!-- 编辑对话框 -->
    <NModal 
        v-model:show="editDialogVisible" 
        title="编辑游戏信息" 
        preset="card"
        style="width: 600px"
        :mask-closable="false"
    >
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-2">游戏名称</label>
                <NInput v-model:value="editFormData.name" placeholder="请输入游戏名称" />
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">游戏目录</label>
                <div class="flex gap-2">
                    <NInput v-model:value="editFormData.dir" placeholder="点击按钮选择游戏安装目录" readonly class="flex-1" />
                    <NButton @click="handleSelectFolder" :loading="selectingFolder">
                        <template #icon>
                            <FolderOpen :size="16" />
                        </template>
                        选择目录
                    </NButton>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    修改游戏目录可能导致游戏无法正常启动，请谨慎操作
                </p>
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">启动程序</label>
                <NInput v-model:value="editFormData.exe" placeholder="请输入启动程序名称（如：gta_sa.exe）" />
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">游戏封面</label>
                <div class="flex gap-2">
                    <NInput v-model:value="editFormData.img" placeholder="点击按钮选择游戏封面图片" readonly class="flex-1" />
                    <NButton @click="handleSelectImage" :loading="selectingImage">
                        <template #icon>
                            <Image :size="16" />
                        </template>
                        选择图片
                    </NButton>
                </div>
            </div>
            <div class="flex justify-end gap-2 pt-2">
                <NButton @click="handleCancelEdit">取消</NButton>
                <NButton type="primary" @click="handleSaveEdit" :loading="actionLoading.saveEdit">
                    保存修改
                </NButton>
            </div>
        </div>
    </NModal>

    <!-- 删除确认对话框 -->
    <NModal 
        v-model:show="deleteDialogVisible" 
        title="确认删除" 
        preset="card"
        style="width: 500px"
    >
        <div class="space-y-4">
            <p class="text-gray-600 dark:text-gray-400">
                确定要删除游戏 <strong>{{ gameData?.name }}</strong> 吗？此操作不可恢复。
            </p>
            <div class="flex justify-end gap-2">
                <NButton @click="deleteDialogVisible = false">取消</NButton>
                <NButton type="error" @click="handleConfirmDelete">
                    确认删除
                </NButton>
            </div>
        </div>
    </NModal>
</template>
