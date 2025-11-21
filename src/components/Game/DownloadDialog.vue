<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { DownloadOutlined } from '@ant-design/icons-vue'
import { Modal, Button, Space, Progress, Typography, Alert } from 'ant-design-vue'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useMessage } from '@/composables/ui/useMessage'

const { Text } = Typography
const { showError, showSuccess } = useMessage()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  gameType: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'success', 'cancel'])

const gameNames = {
  gta3: 'Grand Theft Auto III',
  gtavc: 'Grand Theft Auto Vice City',
  gtasa: 'Grand Theft Auto San Andreas'
}

const isDownloading = ref(false)
const downloadProgress = ref(0)
const downloadedBytes = ref(0)
const totalBytes = ref(0)

let progressListener = null

// 开始下载
const startDownload = async () => {
  try {
    isDownloading.value = true
    downloadProgress.value = 0

    // 监听下载进度事件
    if (!progressListener) {
      progressListener = await listen('download-progress', (event) => {
        const progress = event.payload
        downloadProgress.value = progress.percentage || 0
        downloadedBytes.value = progress.downloaded || 0
        totalBytes.value = progress.total || 0
      })
    }

    // 调用下载命令（自动下载到 G2M/Download）
    const response = await invoke('download_game', {
      request: {
        game_type: props.gameType
      }
    })

    if (response?.success) {
      showSuccess('游戏下载完成！')
      emit('success')
      emit('update:visible', false)
      resetDialog()
    } else {
      throw new Error(response?.error || '下载失败')
    }
  } catch (error) {
    console.error('下载失败:', error)
    showError('下载失败', { detail: error.message || error })
  } finally {
    isDownloading.value = false
    if (progressListener) {
      progressListener()
      progressListener = null
    }
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

// 取消
const handleCancel = () => {
  if (isDownloading.value) {
    showError('下载进行中，无法取消')
    return
  }
  emit('cancel')
  emit('update:visible', false)
  resetDialog()
}

// 重置对话框
const resetDialog = () => {
  downloadProgress.value = 0
  downloadedBytes.value = 0
  totalBytes.value = 0
  if (progressListener) {
    progressListener()
    progressListener = null
  }
}

// 监听 visible 变化
watch(() => props.visible, (newVisible) => {
  if (!newVisible) {
    resetDialog()
  }
})

onUnmounted(() => {
  if (progressListener) {
    progressListener()
  }
})
</script>

<template>
  <Modal
    :open="visible"
    @update:open="$emit('update:visible', $event)"
    :title="`下载 ${gameNames[gameType] || '游戏'}`"
    :width="600"
    :maskClosable="false"
    :keyboard="false"
    :footer="null"
  >
    <div class="download-dialog-content">
      <Alert
        v-if="isDownloading"
        type="info"
        message="正在下载游戏文件到 G2M/Download 目录..."
        :description="`已下载: ${formatBytes(downloadedBytes)}${totalBytes > 0 ? ' / ' + formatBytes(totalBytes) : ''}`"
        show-icon
        style="margin-bottom: 16px;"
      />

      <div v-if="isDownloading" class="progress-section">
        <Progress
          :percent="Math.round(downloadProgress)"
          :status="isDownloading ? 'active' : 'success'"
          :stroke-color="{
            '0%': '#108ee9',
            '100%': '#87d068',
          }"
        />
        <div class="progress-info">
          <Text type="secondary" style="font-size: 12px;">
            {{ Math.round(downloadProgress) }}% - {{ formatBytes(downloadedBytes) }}
            <span v-if="totalBytes > 0">/ {{ formatBytes(totalBytes) }}</span>
          </Text>
        </div>
      </div>

      <div v-else class="info-section">
        <Text type="secondary">
          游戏将下载到 G2M/Download 目录，下载完成后可以在下载页面选择解压。
        </Text>
      </div>

      <div class="dialog-footer">
        <Space>
          <Button @click="handleCancel" :disabled="isDownloading">
            取消
          </Button>
          <Button
            type="primary"
            @click="startDownload"
            :loading="isDownloading"
          >
            <template #icon>
              <DownloadOutlined />
            </template>
            开始下载
          </Button>
        </Space>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.download-dialog-content {
  padding: 8px 0;
}

.info-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 4px;
}

.progress-section {
  margin-top: 16px;
}

.progress-info {
  text-align: center;
  margin-top: 8px;
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
