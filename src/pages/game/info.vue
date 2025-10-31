
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  FolderOpenOutlined,
  EditOutlined
} from '@ant-design/icons-vue'

import { useGameInfo } from '@/composables/game/useGameInfo'
import { useGameActions } from '@/composables/game/useGameActions'
import { formatTime } from '@/utils/format'
import { isTauriEnvironment } from '@/utils/tauri'
import GameEditDialog from '@/components/Game/EditDialog.vue'

const route = useRoute()
const router = useRouter()

// 获取游戏ID
const gameId = computed(() => {
  const id = route.query.id
  return id ? parseInt(id, 10) : null
})

// 使用组合式函数
const {
  loading: infoLoading,
  gameInfo,
  getGameTypeName,
  getGameImage,
  handleImageError,
  loadGameInfo
} = useGameInfo(gameId)

const {
  loading: actionLoading,
  launchGame,
  openGameFolder,
  saveEdit
} = useGameActions()

// 编辑对话框状态和函数
const editDialogVisible = ref(false)

const startEdit = () => {
  editDialogVisible.value = true
}

const cancelEdit = () => {
  editDialogVisible.value = false
}

// 页面操作
const goBack = () => {
  router.push('/')
}

const handleLaunchGame = () => {
  launchGame(gameInfo.value)
}

const handleOpenFolder = () => {
  openGameFolder(gameInfo.value)
}

const handleStartEdit = () => {
  startEdit()
}

const handleCancelEdit = () => {
  cancelEdit()
}

const handleSaveEdit = async (editForm) => {
  const success = await saveEdit(gameId.value, editForm, gameInfo.value)
  if (success) {
    editDialogVisible.value = false
    // 重新加载游戏信息以获取最新数据
    loadGameInfo()
  }
}

// 页面加载时获取游戏信息
onMounted(() => {
  if (isTauriEnvironment()) {
    loadGameInfo()
  }
})
</script>

<template>
  <div class="game-info-container">
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <a-button type="text" @click="goBack" class="back-button">
            <template #icon>
              <ArrowLeftOutlined />
            </template>
            返回游戏列表
          </a-button>
        </div>
        <div class="header-right" v-if="gameInfo && !infoLoading">
          <a-space>
            <a-button type="primary" @click="handleLaunchGame" :loading="actionLoading.launch">
              <template #icon>
                <PlayCircleOutlined />
              </template>
              启动游戏
            </a-button>
            <a-button @click="handleOpenFolder" :loading="actionLoading.openFolder">
              <template #icon>
                <FolderOpenOutlined />
              </template>
              打开目录
            </a-button>
          </a-space>
        </div>
      </div>
    </div>

    <div v-if="infoLoading" class="loading-container">
      <a-spin size="large" tip="正在加载游戏信息..." />
    </div>

    <div v-else-if="gameInfo" class="game-info-content">
      <a-card class="game-summary-card">
        <div class="game-cover-section">
          <div class="game-cover-container">
            <img :src="getGameImage" :alt="gameInfo.name" class="game-cover-large" @error="handleImageError" />
            <div class="cover-gradient">
              <div class="cover-info">
                <h1 class="game-title">{{ gameInfo.name }}</h1>
                <div class="game-badges">
                  <a-tag color="blue" class="game-type-tag">
                    {{ getGameTypeName }}
                  </a-tag>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="game-meta-section">
          <div class="meta-item">
            <span class="meta-label">添加时间:</span>
            <span class="meta-value">{{ formatTime(gameInfo.time) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">游戏目录:</span>
            <span class="meta-value" :title="gameInfo.dir">{{ gameInfo.dir }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">启动程序:</span>
            <span class="meta-value">{{ gameInfo.exe }}</span>
          </div>
        </div>
      </a-card>

      <a-card class="info-content-card">
        <div class="info-content">
          <a-descriptions :column="1" bordered size="large">
            <a-descriptions-item label="游戏名称">
              {{ gameInfo.name }}
            </a-descriptions-item>
            <a-descriptions-item label="游戏类型">
              {{ getGameTypeName }}
            </a-descriptions-item>
            <a-descriptions-item label="安装目录">
              <div class="path-item">
                <span class="path-text" :title="gameInfo.dir">
                  {{ gameInfo.dir }}
                </span>
                <a-button type="link" size="small" @click="handleOpenFolder" :loading="actionLoading.openFolder">
                  <template #icon>
                    <FolderOpenOutlined />
                  </template>
                  打开
                </a-button>
              </div>
            </a-descriptions-item>
            <a-descriptions-item label="启动程序">
              {{ gameInfo.exe }}
            </a-descriptions-item>
            <a-descriptions-item label="添加时间">
              {{ formatTime(gameInfo.time) }}
            </a-descriptions-item>
          </a-descriptions>

          <div class="action-buttons">
            <a-space>
              <a-button type="primary" size="large" @click="handleLaunchGame" :loading="actionLoading.launch">
                <template #icon>
                  <PlayCircleOutlined />
                </template>
                启动游戏
              </a-button>
              <a-button size="large" @click="handleStartEdit">
                <template #icon>
                  <EditOutlined />
                </template>
                编辑信息
              </a-button>
            </a-space>
          </div>
        </div>
      </a-card>
    </div>

    <!-- 编辑对话框 -->
    <GameEditDialog
      v-model:visible="editDialogVisible"
      :game-info="gameInfo"
      :loading="actionLoading"
      @save="handleSaveEdit"
      @cancel="handleCancelEdit"
    />
  </div>
</template>

<style scoped>
.game-info-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

/* 页面头部样式 */
.page-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.back-button {
  font-size: 16px;
  padding: 8px 16px;
  height: auto;
}

/* 游戏信息内容样式 */
.game-info-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.game-summary-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.game-cover-section {
  position: relative;
  height: 300px;
  overflow: hidden;
}

.game-cover-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.game-cover-large {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.cover-gradient {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  display: flex;
  align-items: flex-end;
  padding: 24px;
}

.cover-info {
  color: white;
}

.game-title {
  color: white;
  font-size: 32px;
  font-weight: bold;
  margin: 0 0 12px 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.game-badges {
  display: flex;
  gap: 8px;
}

.game-type-tag {
  font-size: 14px;
  padding: 4px 12px;
  border-radius: 16px;
}

.game-meta-section {
  padding: 20px 24px;
  background: #f8f9fa;
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 200px;
}

.meta-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.meta-value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  word-break: break-all;
}

.info-content-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.info-content {
  padding: 24px;
}

.path-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.path-text {
  flex: 1;
  word-break: break-all;
  font-family: 'Courier New', monospace;
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
}

.action-buttons {
  margin-top: 32px;
  text-align: center;
}

@media (max-width: 768px) {
  .game-info-container {
    padding: 16px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .game-title {
    font-size: 24px;
  }
  
  .game-meta-section {
    flex-direction: column;
    gap: 16px;
  }
  
  .meta-item {
    min-width: auto;
  }
}
</style>