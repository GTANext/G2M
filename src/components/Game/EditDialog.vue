<script setup>
import { ref, watch, nextTick } from 'vue'
import { CheckCircleOutlined, PictureOutlined } from '@ant-design/icons-vue'
import { useGameApi } from '@/composables/api/useGameApi'
import { useImageHandler } from '@/composables/useImageHandler'
import { useMessage } from '@/composables/ui/useMessage'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  gameInfo: {
    type: Object,
    default: () => ({})
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
  img: ''
})

// Form ref
const formRef = ref()

// Image selection state
const selectingImage = ref(false)

// Loading state
const saving = ref(false)

// Game API
const { saveBase64Image } = useGameApi()

// Image handler
const { selectImageFile, createPreviewUrl } = useImageHandler()

// Message handler
const { showError, showSuccess } = useMessage()

// Form validation rules
const rules = {
  name: [
    { required: true, message: '请输入游戏名称', trigger: 'blur' }
  ],
  dir: [
    { required: true, message: '请选择游戏目录', trigger: 'blur' }
  ],
  exe: [
    { required: true, message: '请输入启动程序', trigger: 'blur' }
  ]
}

// Watch for gameInfo changes to initialize form
watch(() => props.gameInfo, (newGameInfo) => {
  if (newGameInfo && props.visible) {
    initFormData()
  }
}, { immediate: true })

// Watch for visible changes
watch(() => props.visible, (newVisible) => {
  if (newVisible && props.gameInfo) {
    initFormData()
  }
})

// Initialize form data
const initFormData = () => {
  if (props.gameInfo) {
    formData.value = {
      name: props.gameInfo.name || '',
      dir: props.gameInfo.dir || '',
      exe: props.gameInfo.exe || '',
      img: props.gameInfo.img || ''
    }
  }
}

// Handle save
const handleSave = async () => {
  try {
    await formRef.value.validate()

    // 调用更新游戏API
    const { updateGame } = useGameApi()

    saving.value = true

    const result = await updateGame(
      props.gameInfo.id,
      formData.value.name,
      formData.value.dir,
      formData.value.exe,
      formData.value.img,
      props.gameInfo.type,
      props.gameInfo.deleted
    )

    if (result.success) {
      showSuccess('游戏信息更新成功')
      emit('success')
      emit('update:visible', false)
    } else {
      showError('更新游戏信息失败', { detail: result.error })
    }
  } catch (error) {
    showError('保存游戏信息失败', { detail: error })
  } finally {
    saving.value = false
  }
}

// Handle cancel
const handleCancel = () => {
  // Reset form data to original values
  initFormData()
  emit('cancel')
  emit('update:visible', false)
}

// Handle image file selection
const selectImageFileHandler = async () => {
  try {
    selectingImage.value = true

    // 使用 base64 图片处理
    const imageResult = await selectImageFile()

    if (imageResult) {
      // 直接使用完整的 data URL
      formData.value.img = imageResult.dataUrl
      showSuccess('图片选择成功')
    }
  } catch (error) {
    console.error('选择图片失败:', error)
    showError('选择图片失败，请重试', { detail: error })
  } finally {
    selectingImage.value = false
  }
}

// Handle form finish
const handleFinish = (values) => {
  emit('save', values)
}
</script>

<template>
  <a-modal :open="visible" @update:open="$emit('update:visible', $event)" title="编辑游戏信息" :width="600"
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
          保存修改
        </a-button>
      </a-space>
    </template>

    <div class="edit-dialog-content">
      <a-form ref="formRef" :model="formData" :rules="rules" layout="vertical" @finish="handleFinish">
        <a-form-item label="游戏名称" name="name">
          <a-input v-model:value="formData.name" placeholder="请输入游戏名称" size="large" />
        </a-form-item>

        <a-form-item label="游戏目录" name="dir">
          <a-input v-model:value="formData.dir" placeholder="请输入游戏安装目录" size="large" readonly />
          <div class="form-help">
            <a-typography-text type="secondary" :style="{ fontSize: '12px' }">
              游戏目录通常不建议修改，如需修改请重新添加游戏
            </a-typography-text>
          </div>
        </a-form-item>

        <a-form-item label="启动程序" name="exe">
          <a-input v-model:value="formData.exe" placeholder="请输入游戏主程序文件名" size="large" />
          <div class="form-help">
            <a-typography-text type="secondary" :style="{ fontSize: '12px' }">
              支持的游戏主程序：gta3.exe, gtavc.exe, gta_sa.exe 等
            </a-typography-text>
          </div>
        </a-form-item>

        <a-form-item label="游戏封面" name="img">
          <a-input-group compact>
            <a-input v-model:value="formData.img" placeholder="点击按钮选择自定义游戏封面" size="large"
              style="width: calc(100% - 120px)" />
            <a-button type="primary" size="large" :loading="selectingImage" @click="selectImageFileHandler"
              style="width: 120px">
              <template #icon>
                <PictureOutlined />
              </template>
              选择图片
            </a-button>
          </a-input-group>
          <div class="form-help">
            <a-typography-text type="secondary" :style="{ fontSize: '12px' }">
              支持的图片格式：JPG、PNG、GIF、BMP、WebP 等
            </a-typography-text>
          </div>
        </a-form-item>
      </a-form>
    </div>
  </a-modal>
</template>

<style scoped>
.edit-dialog-content {
  padding: 16px 0;
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
</style>