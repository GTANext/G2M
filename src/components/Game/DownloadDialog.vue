<script setup>
import { computed, watch } from 'vue'
import { DownloadOutlined } from '@ant-design/icons-vue'
import { useGameDownload } from '@/composables'

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

// 使用 computed 来同步 visible
const visibleModel = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 使用 composable - 传递 computed ref，composable 内部会处理
const {
  isDownloading,
  downloadProgress,
  downloadedBytes,
  totalBytes,
  gameNames,
  formatBytes,
  startDownload: startDownloadHandler,
  cancelDownload: cancelDownloadHandler,
  reset
} = useGameDownload(computed(() => props.gameType))

// 开始下载
const startDownload = async () => {
  const result = await startDownloadHandler()
  if (result?.success) {
    emit('success')
    emit('update:visible', false)
    reset()
  } else if (result?.cancelled) {
    emit('cancel')
    emit('update:visible', false)
    reset()
  }
}

// 取消下载
const cancelDownload = async () => {
  await cancelDownloadHandler()
  emit('cancel')
  emit('update:visible', false)
  reset()
}

// 取消对话框
const handleCancel = () => {
  if (isDownloading.value) {
    // 如果正在下载，调用取消下载
    cancelDownload()
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
  <a-modal v-model:open="visibleModel" :title="`下载 ${gameNames[props.gameType] || '游戏'}`" :width="600" :maskClosable="false"
    :keyboard="false" :footer="null">
    <div class="download-dialog-content">
      <a-alert v-if="isDownloading" type="info" message="正在下载游戏文件到 G2M/Download 目录..."
        :description="`已下载: ${formatBytes(downloadedBytes)}${totalBytes > 0 ? ' / ' + formatBytes(totalBytes) : ''}`"
        show-icon style="margin-bottom: 16px;" />

      <div v-if="isDownloading" class="progress-section">
        <a-progress :percent="Math.round(downloadProgress)" :status="isDownloading ? 'active' : 'success'"
          :stroke-color="{
            '0%': '#108ee9',
            '100%': '#87d068',
          }" />
        <div class="progress-info">
          <a-typography-text type="secondary" style="font-size: 12px;">
            {{ Math.round(downloadProgress) }}% - {{ formatBytes(downloadedBytes) }}
            <span v-if="totalBytes > 0">/ {{ formatBytes(totalBytes) }}</span>
          </a-typography-text>
        </div>
      </div>

      <div v-else class="info-section">
        <a-typography-text type="secondary">
          游戏将下载到 G2M/Download 目录，下载完成后选择游戏，点击解压。
        </a-typography-text>
      </div>

      <div class="dialog-footer">
        <a-space>
          <a-button @click="handleCancel" :danger="isDownloading">
            {{ isDownloading ? '取消下载' : '取消' }}
          </a-button>
          <a-button v-if="!isDownloading" type="primary" @click="startDownload">
            <template #icon>
              <DownloadOutlined />
            </template>
            开始下载
          </a-button>
        </a-space>
      </div>
    </div>
  </a-modal>
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
