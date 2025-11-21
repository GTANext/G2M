<script setup>
import { ref, onMounted } from 'vue'
import { DownloadOutlined, FileZipOutlined } from '@ant-design/icons-vue'
import { useMessage } from '@/composables/ui/useMessage'
import { isTauriEnvironment } from '@/utils/tauri'
import { invoke } from '@tauri-apps/api/core'

const { showSuccess } = useMessage()

const downloadDialogVisible = ref(false)
const extractDialogVisible = ref(false)
const selectedGameType = ref(null)
const downloadRecords = ref([])

const games = [
  {
    type: 'gta3',
    name: 'Grand Theft Auto III',
    description: 'GTA III - 经典开放世界游戏'
  },
  {
    type: 'gtavc',
    name: 'Grand Theft Auto Vice City',
    description: 'GTA Vice City - 80年代风格'
  },
  {
    type: 'gtasa',
    name: 'Grand Theft Auto San Andreas',
    description: 'GTA San Andreas - 最受欢迎的GTA游戏'
  }
]

// 获取游戏图标
const getGameIcon = (gameType) => {
  const iconMap = {
    'gta3': '/images/gta3.jpg',
    'GTA3': '/images/gta3.jpg',
    'gtavc': '/images/gtavc.jpg',
    'GTAVC': '/images/gtavc.jpg',
    'gtasa': '/images/gtasa.jpg',
    'GTASA': '/images/gtasa.jpg'
  }
  return iconMap[gameType] || '/images/null.svg'
}

// 处理图片加载错误
const handleImageError = (event) => {
  event.target.src = '/images/null.svg'
}

// 获取游戏下载状态
const getGameDownloadStatus = (gameType) => {
  const record = downloadRecords.value.find(r => r.game_type === gameType)
  if (!record) return 'not_downloaded' // 未下载
  return 'downloaded' // 已下载（可以多次解压）
}

// 获取游戏下载记录
const getDownloadRecord = (gameType) => {
  return downloadRecords.value.find(r => r.game_type === gameType)
}

// 加载下载记录
const loadDownloadRecords = async () => {
  if (!isTauriEnvironment()) return

  try {
    const response = await invoke('get_download_records')
    if (response?.success) {
      downloadRecords.value = response.data || []
    }
  } catch (error) {
    console.error('加载下载记录失败:', error)
  }
}

const handleDownload = (gameType) => {
  selectedGameType.value = gameType
  downloadDialogVisible.value = true
}

const handleExtract = (gameType) => {
  selectedGameType.value = gameType
  extractDialogVisible.value = true
}

const handleDownloadComplete = async () => {
  downloadDialogVisible.value = false
  selectedGameType.value = null
  await loadDownloadRecords()
  showSuccess('游戏下载完成！')
}

const handleExtractComplete = async () => {
  extractDialogVisible.value = false
  selectedGameType.value = null
  await loadDownloadRecords()
  showSuccess('游戏解压完成！')
}

const handleDownloadCancel = () => {
  downloadDialogVisible.value = false
  selectedGameType.value = null
}

const handleExtractCancel = () => {
  extractDialogVisible.value = false
  selectedGameType.value = null
}

onMounted(() => {
  if (isTauriEnvironment()) {
    loadDownloadRecords()
  }
})
</script>

<template>
  <G2MHeader title="游戏下载">
    <template #right>
      <a-typography-text type="secondary">从云端下载 GTA 游戏文件</a-typography-text>
    </template>
  </G2MHeader>

  <NGrid :cols="3" :x-gap="16" :y-gap="16" style="margin-top: 24px;">
    <NGridItem v-for="game in games" :key="game.type">
      <NCard class="game-card" hoverable>
        <div class="game-cover-container">
          <img :src="getGameIcon(game.type)" :alt="game.name" class="game-cover" @error="handleImageError" />
          <NTag type="info" class="game-type-badge" size="small">
            {{ game.name }}
          </NTag>
        </div>

        <div class="game-info">
          <h3 class="game-name" :title="game.name">{{ game.name }}</h3>
          <p class="game-description">{{ game.description }}</p>
        </div>

        <div class="game-actions">
          <NButton v-if="getGameDownloadStatus(game.type) === 'not_downloaded'" type="primary" block
            @click="handleDownload(game.type)" :disabled="!isTauriEnvironment()">
            <template #icon>
              <DownloadOutlined />
            </template>
            下载游戏
          </NButton>

          <NButton v-else type="primary" block @click="handleExtract(game.type)" :disabled="!isTauriEnvironment()">
            <template #icon>
              <FileZipOutlined />
            </template>
            解压游戏
          </NButton>
        </div>
      </NCard>
    </NGridItem>
  </NGrid>

  <GameDownloadDialog v-model:visible="downloadDialogVisible" :game-type="selectedGameType"
    @success="handleDownloadComplete" @cancel="handleDownloadCancel" />

  <GameExtractDialog v-model:visible="extractDialogVisible" :game-type="selectedGameType"
    :download-record="getDownloadRecord(selectedGameType)" @success="handleExtractComplete"
    @cancel="handleExtractCancel" />
</template>

<style scoped>
.game-card {
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.game-cover-container {
  position: relative;
  height: 180px;
  overflow: hidden;
  border-radius: 8px 8px 0 0;
  margin: -16px -16px 12px -16px;
}

.game-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.game-type-badge {
  position: absolute;
  top: 12px;
  right: 12px;
}

.game-info {
  flex: 1;
  margin-bottom: 12px;
}

.game-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.game-description {
  font-size: 12px;
  color: #999;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.game-actions {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}
</style>
