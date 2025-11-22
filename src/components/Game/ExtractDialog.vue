<script setup>
import { computed, watch } from 'vue'
import { FileZipOutlined, FolderOpenOutlined } from '@ant-design/icons-vue'
import { useMessage } from '@/composables/ui/useMessage'
import { useGameExtract } from '@/composables'

const { showError } = useMessage()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  gameType: {
    type: String,
    default: null
  },
  downloadRecord: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'success', 'cancel'])

// 使用 computed 来同步 visible
const visibleModel = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 使用 composable - 传递 computed ref，composable 内部会处理
const {
  extractPath,
  isExtracting,
  extractProgress,
  currentFile,
  totalFiles,
  extractedFiles,
  gameNames,
  formatBytes,
  selectExtractFolder: selectExtractFolderHandler,
  startExtract: startExtractHandler,
  reset
} = useGameExtract(computed(() => props.gameType), computed(() => props.downloadRecord))

// 选择解压目录
const selectExtractFolder = async () => {
  await selectExtractFolderHandler()
}

// 开始解压
const startExtract = async () => {
  const result = await startExtractHandler()
  if (result?.success) {
    emit('success')
    emit('update:visible', false)
    reset()
  }
}

// 取消
const handleCancel = () => {
  if (isExtracting.value) {
    showError('解压进行中，无法取消')
    return
  }
  emit('cancel')
  emit('update:visible', false)
  reset()
}

// 监听 visible 变化
watch(() => props.visible, (newVisible) => {
  if (!newVisible) {
    reset()
  }
})
</script>

<template>
  <a-modal v-model:open="visibleModel" :title="`解压 ${gameNames[gameType] || '游戏'}`" :width="600" :maskClosable="false"
    :keyboard="false" :footer="null">
    <div class="extract-dialog-content">
      <a-alert v-if="downloadRecord" type="info" :message="`ZIP 文件: ${downloadRecord.zip_path.split(/[/\\]/).pop()}`"
        :description="`下载日期: ${new Date(downloadRecord.download_date).toLocaleString()}`" show-icon
        style="margin-bottom: 16px;" />

      <a-form layout="vertical">
        <a-form-item label="解压位置">
          <div class="path-selector">
            <a-input v-model:value="extractPath" placeholder="请选择解压位置" readonly style="flex: 1" />
            <a-button @click="selectExtractFolder" :disabled="isExtracting">
              <template #icon>
                <FolderOpenOutlined />
              </template>
              选择位置
            </a-button>
          </div>
          <a-typography-text type="secondary" style="font-size: 12px; display: block; margin-top: 4px;">
            将在选择的位置自动创建游戏文件夹（如：{{ gameNames[props.gameType] }}），如果文件夹已存在则创建为 {{ gameNames[props.gameType] }}-1、{{
              gameNames[props.gameType] }}-2 等
          </a-typography-text>
        </a-form-item>
      </a-form>

      <a-alert v-if="isExtracting" type="info"
        :message="`正在解压游戏文件... (${extractedFiles}${totalFiles > 0 ? ' / ' + totalFiles : ''})`"
        :description="currentFile ? `当前文件: ${currentFile.split(/[/\\]/).pop()}` : ''" show-icon
        style="margin-top: 16px;" />

      <div v-if="isExtracting" style="margin-top: 16px;">
        <a-progress :percent="Math.round(extractProgress)" :status="isExtracting ? 'active' : 'success'" :stroke-color="{
          '0%': '#108ee9',
          '100%': '#87d068',
        }" />
        <div style="text-align: center; margin-top: 8px;">
          <a-typography-text type="secondary" style="font-size: 12px;">
            {{ Math.round(extractProgress) }}% - {{ extractedFiles }}{{ totalFiles > 0 ? ' / ' + totalFiles : '' }} 个文件
          </a-typography-text>
        </div>
      </div>

      <div class="dialog-footer">
        <a-space>
          <a-button @click="handleCancel" :disabled="isExtracting">
            取消
          </a-button>
          <a-button type="primary" @click="startExtract" :loading="isExtracting" :disabled="!extractPath">
            <template #icon>
              <FileZipOutlined />
            </template>
            解压并添加游戏
          </a-button>
        </a-space>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.extract-dialog-content {
  padding: 8px 0;
}

.path-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  margin-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>
