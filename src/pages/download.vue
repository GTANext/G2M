<script setup>
import { ref } from 'vue'
import { notification } from 'ant-design-vue'
import { DownloadOutlined, FileZipOutlined } from '@ant-design/icons-vue'
import { useMessage } from '@/composables/ui/useMessage'
import { useCommon } from '@/composables/ui/useCommon'
import { useDownloadRecords, useGameUtils } from '@/composables'
import { isTauriEnvironment } from '@/utils/tauri'

const { qqGroups, externalLinks } = useCommon()

const { showSuccess } = useMessage()
const { downloadRecords, loadDownloadRecords, getGameDownloadStatus, getDownloadRecord } = useDownloadRecords()
const { getGameIcon, handleImageError } = useGameUtils()

const downloadDialogVisible = ref(false)
const extractDialogVisible = ref(false)
const selectedGameType = ref(null)

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

const openNotification = () => {
  notification.open({
    duration: 6,
    placement: 'bottomRight',
    message: '提示',
    description:
      '游戏存储在cloudflare r2亚太节点, 国内优化较差如果下载慢或下载未完成我也莫得办法~',
  });
};

openNotification()
</script>

<template>
  <!-- <G2MHeader title="游戏下载">
    <template #right>
      <a-typography-text type="secondary">从云端下载 GTA 游戏文件</a-typography-text>
    </template>
  </G2MHeader> -->
  <a-alert
    :message="`如果游戏下载失败请加群：${qqGroups.map(group => group.name).join(', ')}`"
    type="warning"
    show-icon
  />
  <NGrid :cols="3" :x-gap="16" :y-gap="16" style="margin-top: 24px;">
    <NGridItem v-for="game in games" :key="game.type">
      <GameCard :game="game" display-mode="simple" :get-game-icon="(game) => getGameIcon(game)" :clickable="false">
        <template #actions="{ game }">
          <NButton v-if="getGameDownloadStatus(game.type) === 'not_downloaded'" type="info" block
            @click.stop="handleDownload(game.type)" :disabled="!isTauriEnvironment()">
            <template #icon>
              <DownloadOutlined />
            </template>
            下载游戏
          </NButton>

          <NButton v-else type="primary" block @click.stop="handleExtract(game.type)" :disabled="!isTauriEnvironment()">
            <template #icon>
              <FileZipOutlined />
            </template>
            解压游戏
          </NButton>
        </template>
      </GameCard>
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
