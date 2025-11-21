<script setup>
import { ref, watch, computed, onUnmounted } from 'vue'
import { FileZipOutlined, FolderOpenOutlined } from '@ant-design/icons-vue'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useMessage } from '@/composables/ui/useMessage'
import { useGameApi } from '@/composables/api/useGameApi'

const { showError, showSuccess } = useMessage()
const { saveGame } = useGameApi()

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

const gameNames = {
  gta3: 'Grand Theft Auto III',
  gtavc: 'Grand Theft Auto Vice City',
  gtasa: 'Grand Theft Auto San Andreas'
}

const extractPath = ref('')
const isExtracting = ref(false)
const extractProgress = ref(0)
const currentFile = ref('')
const totalFiles = ref(0)
const extractedFiles = ref(0)

let progressListener = null

// 选择解压目录
const selectExtractFolder = async () => {
  try {
    const response = await invoke('select_extract_folder')
    if (response?.success && response?.data) {
      extractPath.value = response.data
    } else {
      if (response?.error) {
        showError('选择文件夹失败', { detail: response.error })
      }
    }
  } catch (error) {
    showError('选择文件夹失败', { detail: error })
  }
}

// 开始解压
const startExtract = async () => {
  try {
    if (!extractPath.value) {
      showError('请选择解压位置')
      return
    }

    if (!props.downloadRecord || !props.downloadRecord.zip_path) {
      showError('下载记录不存在')
      return
    }

    if (!props.gameType) {
      showError('游戏类型不存在')
      return
    }

    isExtracting.value = true
    extractProgress.value = 0
    currentFile.value = ''
    totalFiles.value = 0
    extractedFiles.value = 0

    // 监听解压进度事件
    if (!progressListener) {
      progressListener = await listen('extract-progress', (event) => {
        const progress = event.payload
        extractProgress.value = progress.percentage || 0
        extractedFiles.value = progress.current || 0
        totalFiles.value = progress.total || 0
        currentFile.value = progress.current_file || ''
      })
    }

    // 调用解压命令
    const extractResponse = await invoke('extract_game', {
      request: {
        zip_path: props.downloadRecord.zip_path,
        extract_to: extractPath.value,
        game_type: props.gameType
      }
    })

    if (extractResponse?.success) {
      // 获取返回的游戏信息
      const gameInfo = extractResponse.data

      // 解压成功后，自动添加游戏到列表
      try {
        const saveResponse = await saveGame({
          name: gameInfo.game_name || gameNames[props.gameType] || '',
          dir: gameInfo.game_dir || '',
          exe: gameInfo.game_exe || '',
          img: '',
          type: gameInfo.game_type || props.gameType
        })

        if (saveResponse?.success) {
          showSuccess('游戏解压并添加成功！')
          emit('success')
          emit('update:visible', false)
          resetDialog()
        } else {
          showError('游戏解压成功，但添加到列表失败', { detail: saveResponse?.error })
        }
      } catch (error) {
        showError('游戏解压成功，但添加到列表失败', { detail: error })
      }
    } else {
      throw new Error(extractResponse?.error || '解压失败')
    }
  } catch (error) {
    console.error('解压失败:', error)
    showError('解压失败', { detail: error.message || error })
  } finally {
    isExtracting.value = false
    if (progressListener) {
      progressListener()
      progressListener = null
    }
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
  resetDialog()
}

// 重置对话框
const resetDialog = () => {
  extractPath.value = ''
  extractProgress.value = 0
  currentFile.value = ''
  totalFiles.value = 0
  extractedFiles.value = 0
  if (progressListener) {
    progressListener()
    progressListener = null
  }
}

// 格式化文件大小
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

onUnmounted(() => {
  if (progressListener) {
    progressListener()
  }
})

// 监听 visible 变化
watch(() => props.visible, (newVisible) => {
  if (!newVisible) {
    resetDialog()
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
            将在选择的位置自动创建游戏文件夹（如：{{ gameNames[gameType] }}），如果文件夹已存在则创建为 {{ gameNames[gameType] }}-1、{{
              gameNames[gameType] }}-2 等
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
