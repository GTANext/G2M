<script setup>
import { computed, watch } from 'vue'
import { CheckCircleOutlined, PictureOutlined, FolderOpenOutlined } from '@ant-design/icons-vue'
import { useGameEdit } from '@/composables'

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

// 使用 composable
const gameInfoRef = computed(() => props.gameInfo)

const {
  formData,
  formRef,
  selectingImage,
  selectingFolder,
  saving,
  rules,
  handleSave: saveHandler,
  selectImageFileHandler,
  selectFolderHandler,
  resetForm
} = useGameEdit(gameInfoRef)

// Watch for visible changes
watch(() => props.visible, (newVisible) => {
  if (newVisible && props.gameInfo) {
    resetForm()
  }
})

// Handle save
const handleSave = async () => {
  const result = await saveHandler()
  if (result?.success) {
    emit('success')
    emit('update:visible', false)
  }
}

// Handle cancel
const handleCancel = () => {
  resetForm()
  emit('cancel')
  emit('update:visible', false)
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
          <a-input-group compact>
            <a-input v-model:value="formData.dir" placeholder="点击按钮选择游戏安装目录" size="large"
              style="width: calc(100% - 120px)" />
            <a-button type="primary" size="large" :loading="selectingFolder" @click="selectFolderHandler"
              style="width: 120px">
              <template #icon>
                <FolderOpenOutlined />
              </template>
              选择目录
            </a-button>
          </a-input-group>
          <div class="form-help">
            <a-typography-text type="secondary" :style="{ fontSize: '12px' }">
              修改游戏目录可能导致游戏无法正常启动，请谨慎操作
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