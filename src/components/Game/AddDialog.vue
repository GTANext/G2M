<script setup>
import { ref, watch } from 'vue'
import { CheckCircleOutlined, PictureOutlined, AppstoreOutlined, FolderOpenOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { useGameApi } from '@/composables/api/useGameApi'
import { useImageHandler } from '@/composables/useImageHandler'
import { useMessage } from '@/composables/ui/useMessage'

// Props
const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    loading: {
        type: Boolean,
        default: false
    }
})

// Emits
const emit = defineEmits(['update:visible', 'save', 'cancel', 'success'])

// Form data
const formData = ref({
    name: '',
    dir: '',
    exe: '',
    img: '',
    type: undefined
})

// Form ref
const formRef = ref()

// Detection state
const isDetecting = ref(false)
const detectionResult = ref(null)
const isAutoDetected = ref(false)

// Image selection state
const selectingImage = ref(false)
const imagePreview = ref('')

// Loading state
const saving = ref(false)

// Game API
const { saveGame, selectGameFolder, detectGame, checkDuplicateDirectory } = useGameApi()

// Image handler
const { selectImageFile } = useImageHandler()

// Message handler
const { showError, showSuccess, showInfo } = useMessage()

// Form validation rules
const rules = {
    name: [
        { required: true, message: '请输入游戏名称', trigger: 'blur' }
    ],
    dir: [
        { required: true, message: '请选择游戏目录', trigger: 'blur' }
    ]
}

// Watch for visible changes
watch(() => props.visible, (newVisible) => {
    if (newVisible) {
        resetForm()
    }
})

// Reset form data
const resetForm = () => {
    formData.value = {
        name: '',
        dir: '',
        exe: '',
        img: '',
        type: undefined
    }
    detectionResult.value = null
    isAutoDetected.value = false
    imagePreview.value = ''
}

// Select game folder
const selectFolder = async () => {
    try {
        const response = await selectGameFolder()
        if (response?.success && response?.data) {
            const selectedPath = response.data

            // Check for duplicate directory
            const duplicateCheck = await checkDuplicateDirectory(selectedPath)
            if (!duplicateCheck?.success) {
                showError('该目录已被其他游戏使用', { detail: duplicateCheck?.error })
                return
            }

            formData.value.dir = selectedPath
            await detectGameInFolder(selectedPath)
        } else {
            // 只有当有错误信息时才显示错误（用户取消时 error 为空）
            if (response?.error && response.error.trim() !== '') {
                showError('选择文件夹失败', { detail: response.error })
            }
        }
    } catch (error) {
        showError('选择文件夹失败')
    }
}

// Detect game in folder
const detectGameInFolder = async (folderPath) => {
    try {
        isDetecting.value = true
        const result = await detectGame(folderPath)
        detectionResult.value = result

        if (result?.success && result?.type && result?.game_name && result?.executable) {
            // Auto-fill form
            formData.value.name = result.game_name
            formData.value.exe = result.executable
            formData.value.type = result.type
            isAutoDetected.value = true

            showSuccess(`检测到游戏: ${result.game_name}`)
        } else {
            isAutoDetected.value = false
            showInfo('未检测到支持的游戏，请手动填写游戏信息')
        }
    } catch (error) {
        showError('检测游戏失败')
    } finally {
        isDetecting.value = false
    }
}

// Get game type name
const getGameTypeName = (gameType) => {
    if (!gameType) return '未知游戏'
    const GAME_TYPE_NAMES = {
        'gta3': 'GTA III',
        'gtavc': 'GTA Vice City',
        'gtasa': 'GTA San Andreas'
    }
    return GAME_TYPE_NAMES[gameType] || '未知游戏'
}

// Select image file
const selectImage = async () => {
    try {
        selectingImage.value = true

        // Use base64 image processing
        const imageResult = await selectImageFile()

        if (imageResult) {
            // Use complete data URL for preview and storage
            imagePreview.value = imageResult.dataUrl
            formData.value.img = imageResult.dataUrl

            showSuccess('图片选择成功')
        }
    } catch (error) {
        showError('选择图片失败')
    } finally {
        selectingImage.value = false
    }
}

// Clear selected image
const clearImage = () => {
    imagePreview.value = ''
    formData.value.img = ''
    showSuccess('已清除图片')
}

// Handle save
const handleSave = async () => {
    try {
        await formRef.value.validate()

        saving.value = true

        const result = await saveGame(formData.value)

        if (result.success) {
            showSuccess('游戏添加成功！')
            emit('success')
            emit('update:visible', false)
            resetForm()
        } else {
            showError('添加游戏失败', { detail: result.error })
        }
    } catch (error) {
        showError('保存游戏信息失败', { detail: error })
    } finally {
        saving.value = false
    }
}

// Handle cancel
const handleCancel = () => {
    resetForm()
    emit('cancel')
    emit('update:visible', false)
}
</script>

<template>
    <a-modal :open="visible" @update:open="$emit('update:visible', $event)" title="添加游戏" :width="800"
        :maskClosable="false" :keyboard="false" @ok="handleSave" @cancel="handleCancel">
        <template #footer>
            <a-space>
                <a-button @click="handleCancel">
                    取消
                </a-button>
                <a-button type="primary" :loading="saving" @click="handleSave">
                    <template #icon>
                        <CheckCircleOutlined />
                    </template>
                    添加游戏
                </a-button>
            </a-space>
        </template>

        <div class="add-dialog-content">
            <div class="add-game-header">
                <h3 class="add-game-title">
                    <AppstoreOutlined class="title-icon" />
                    添加新游戏
                </h3>
                <p class="add-game-description">
                    选择游戏文件夹，系统将自动检测支持的 GTA 游戏并填充信息
                </p>
            </div>

            <a-form ref="formRef" :model="formData" :rules="rules" layout="vertical">
                <a-form-item label="游戏目录" name="dir" class="form-item">
                    <a-input-group compact>
                        <a-input v-model:value="formData.dir" placeholder="请选择游戏安装目录" readonly class="folder-input" />
                        <a-button type="primary" @click="selectFolder" :loading="isDetecting" class="folder-button">
                            <template #icon>
                                <FolderOpenOutlined />
                            </template>
                            选择文件夹
                        </a-button>
                    </a-input-group>
                </a-form-item>

                <div v-if="formData.dir" class="detection-section">
                    <a-spin :spinning="isDetecting" tip="正在检测游戏...">
                        <a-alert v-if="isAutoDetected" type="success" show-icon class="detection-alert">
                            <template #icon>
                                <CheckCircleOutlined />
                            </template>
                            <template #message>
                                <span class="detection-title">自动检测成功</span>
                            </template>
                            <template #description>
                                <div class="detection-info">
                                    <p><strong>游戏类型:</strong> {{ getGameTypeName(detectionResult?.type) }}</p>
                                    <p><strong>主程序:</strong> {{ detectionResult?.executable }}</p>
                                    <p class="detection-note">系统已自动填充游戏信息，您可以根据需要进行修改</p>
                                </div>
                            </template>
                        </a-alert>

                        <a-alert v-else-if="detectionResult && !isAutoDetected" type="info" show-icon
                            class="detection-alert">
                            <template #message>
                                <span class="detection-title">未检测到支持的游戏</span>
                            </template>
                            <template #description>
                                <div class="detection-info">
                                    <p>在所选目录中未找到支持的 GTA 游戏，请手动填写游戏信息</p>
                                </div>
                            </template>
                        </a-alert>
                    </a-spin>
                </div>

                <a-row :gutter="16">
                    <a-col :span="12">
                        <a-form-item label="游戏名称" name="name">
                            <a-input v-model:value="formData.name" placeholder="请输入游戏名称" size="large" />
                        </a-form-item>
                    </a-col>
                    <a-col :span="12">
                        <a-form-item label="启动程序" name="exe">
                            <a-input v-model:value="formData.exe" placeholder="例如: gta3.exe" size="large" />
                            <div class="form-help">
                                <a-typography-text type="secondary" :style="{ fontSize: '12px' }">
                                    支持的游戏主程序：gta3.exe, gtavc.exe, gta_sa.exe 等
                                </a-typography-text>
                            </div>
                        </a-form-item>
                    </a-col>
                </a-row>

                <a-form-item label="游戏封面" class="image-form-item">
                    <div class="image-upload-section">
                        <div v-if="imagePreview" class="image-preview-container">
                            <img :src="imagePreview" alt="游戏封面预览" class="image-preview" />
                            <div class="image-actions">
                                <a-button type="text" @click="selectImage" :loading="selectingImage">
                                    <template #icon>
                                        <UploadOutlined />
                                    </template>
                                    更换图片
                                </a-button>
                                <a-button type="text" danger @click="clearImage">
                                    <template #icon>
                                        <DeleteOutlined />
                                    </template>
                                    删除图片
                                </a-button>
                            </div>
                        </div>
                        <div v-else class="image-upload-placeholder" @click="selectImage">
                            <div class="upload-content">
                                <PictureOutlined class="upload-icon" />
                                <p class="upload-text">点击选择游戏封面</p>
                                <p class="upload-hint" style="text-align: center;">支持常见的图片格式</p>
                            </div>
                        </div>
                    </div>
                </a-form-item>
            </a-form>
        </div>
    </a-modal>
</template>

<style scoped>
.add-dialog-content {
    padding: 16px 0;
}

.add-game-header {
    text-align: center;
    margin-bottom: 24px;
}

.add-game-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 18px;
    font-weight: 600;
}

.title-icon {
    color: #1890ff;
}

.add-game-description {
    color: #666;
    margin: 0;
}

.detection-section {
    margin-bottom: 20px;
}

.detection-alert {
    margin-bottom: 0;
}

.detection-title {
    font-weight: 500;
}

.detection-info p {
    margin: 4px 0;
}

.detection-note {
    font-size: 12px;
    color: #666;
}

.image-upload-section {
    border: 1px dashed #d9d9d9;
    border-radius: 6px;
    padding: 16px;
    transition: border-color 0.3s;
}

.image-upload-section:hover {
    border-color: #1890ff;
}

.image-preview-container {
    display: flex;
    align-items: center;
    gap: 16px;
}

.image-preview {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: 4px;
}

.image-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.image-upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    cursor: pointer;
    color: #666;
    transition: color 0.3s;
}

.image-upload-placeholder:hover {
    color: #1890ff;
}

.upload-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    margin-bottom: 8px;
}

.upload-text {
    font-size: 14px;
    margin: 0 0 4px 0;
}

.upload-hint {
    font-size: 12px;
    margin: 0;
    color: #999;
}

.form-help {
    margin-top: 4px;
}

.form-help .ant-typography {
    margin: 0;
}

:deep(.ant-modal-body) {
    padding: 24px;
}

:deep(.ant-form-item) {
    margin-bottom: 20px;
}

:deep(.ant-form-item-label) {
    font-weight: 500;
}

:deep(.ant-input) {
    border-radius: 6px;
}

:deep(.ant-btn) {
    border-radius: 6px;
}

.folder-input {
    width: calc(100% - 120px);
}

.folder-button {
    width: 120px;
}
</style>