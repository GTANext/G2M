<script setup>
import { onMounted, ref } from 'vue'
import { isTauriEnvironment } from '@/utils/tauri'
import {
  PlusOutlined,
  PlayCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
    SearchOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  PictureOutlined,
  UploadOutlined
} from '@ant-design/icons-vue'
import { Empty } from 'ant-design-vue'
import { useGameListView } from '@/composables'
import { useGameForm } from '@/composables'

// 导入对话框组件
import GameEditDialog from './EditDialog.vue'
import GameAddDialog from './AddDialog.vue'

// 编辑对话框状态
const editDialogVisible = ref(false)
const currentEditGame = ref(null)

// 添加游戏对话框状态
const addGameVisible = ref(false)

// 使用游戏列表 composable
const {
  // 状态
  selectedGameType,
  gameList: games,
  filteredGameList: filteredGames,
  searchKeyword: searchQuery,
  loadingState,
  
  // 数据操作方法
  loadGameList: loadGames,
  refreshGameList: refreshGames,
  formatGameTime,
  getGameTypeFromExecutable,
  
  // 路由导航方法
  goToGameInfo,
  
  // 游戏操作方法
  launchGame,
  confirmDelete,
  openGameFolder,
  
  // 图片处理方法
  getGameIcon,
  handleImageError
} = useGameListView()

// 使用游戏表单 composable
const {
  formData,
  rules,
  formRef,
  isDetecting,
  detectionResult,
  isAutoDetected,
  loadingState: formLoadingState,
  selectFolder,
  submitForm,
  resetForm,
  getGameTypeName,
  imagePreview,
  uploadingImage,
  selectImage,
  clearImage
} = useGameForm()

// 编辑游戏功能
const editGame = (game) => {
  currentEditGame.value = { ...game }
  editDialogVisible.value = true
}

// 编辑完成后刷新列表
const handleEditComplete = () => {
  editDialogVisible.value = false
  currentEditGame.value = null
  refreshGames()
}

// 显示添加游戏对话框
const showAddGame = () => {
  addGameVisible.value = true
}

// 添加游戏完成后刷新列表
const handleAddGameComplete = () => {
  addGameVisible.value = false
  refreshGames()
}

// 取消添加游戏
const handleAddGameCancel = () => {
  addGameVisible.value = false
}

// 页面加载时获取游戏列表
onMounted(() => {
  if (isTauriEnvironment()) {
    loadGames()
  }
})
</script>

<template>
  <div class="game-list-container">
    <G2MHeader title="已添加游戏">
      <template #right>
        <a-space>
          <a-button type="default" @click="refreshGames" :loading="loadingState.loading">
            <template #icon>
              <ReloadOutlined />
            </template>
            刷新
          </a-button>
          <a-button type="primary" size="large" @click="showAddGame">
            <template #icon>
              <PlusOutlined />
            </template>
            添加游戏
          </a-button>
        </a-space>
      </template>
    </G2MHeader>

    <div class="filter-section">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-input v-model:value="searchQuery" placeholder="搜索游戏名称..." size="large" allow-clear>
            <template #prefix>
              <SearchOutlined />
            </template>
          </a-input>
        </a-col>
        <a-col :span="12">
          <a-select v-model:value="selectedGameType" placeholder="筛选游戏类型" size="large" allow-clear style="width: 100%">
            <a-select-option value="">全部游戏</a-select-option>
            <a-select-option value="gta3">GTA III</a-select-option>
            <a-select-option value="gtavc">GTA Vice City</a-select-option>
            <a-select-option value="gtasa">GTA San Andreas</a-select-option>
            <a-select-option value="other">其他</a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </div>

    <div class="games-content">
      <div v-if="loadingState.loading" class="loading-container">
        <a-spin size="large" tip="正在加载游戏列表..." />
      </div>

      <div v-else-if="!games.length" class="empty-container">
        <a-empty description="还没有添加任何游戏" :image="Empty.PRESENTED_IMAGE_SIMPLE">
          <a-button type="primary" @click="showAddGame">
            <template #icon>
              <PlusOutlined />
            </template>
            添加第一个游戏
          </a-button>
        </a-empty>
      </div>

      <div v-else-if="!filteredGames.length" class="empty-container">
        <a-empty description="没有找到匹配的游戏" :image="Empty.PRESENTED_IMAGE_SIMPLE">
          <a-button @click="searchQuery = ''">
            清除筛选条件
          </a-button>
        </a-empty>
      </div>

      <div v-else class="games-grid">
        <div v-for="game in filteredGames" :key="game.id" class="game-card" @click="goToGameInfo(game)">
          <div class="game-cover-container">
            <img :src="getGameIcon(game)" :alt="game.name" class="game-cover" @error="handleImageError" />
            <div class="cover-overlay">
              <div class="game-type-badge">
                {{ getGameTypeFromExecutable(game.exe) }}
              </div>
            </div>
          </div>

          <div class="game-info">
            <div class="game-header">
              <h3 class="game-name" :title="game.name">
                {{ game.name }}
              </h3>
            </div>

            <div class="game-details">
              <p class="game-path" :title="game.dir">
                <FolderOpenOutlined />
                {{ game.dir }}
              </p>
              <p class="game-exe">
                <strong>启动程序:</strong> {{ game.exe }}
              </p>
              <p class="game-date">
                <strong>添加时间:</strong> {{ formatGameTime(game.time) }}
              </p>
            </div>
          </div>

          <div class="game-actions" @click.stop>
            <a-space>
              <a-tooltip title="启动游戏">
                <a-button type="primary" shape="circle" @click="launchGame(game)" :loading="loadingState.loading">
                  <template #icon>
                    <PlayCircleOutlined />
                  </template>
                </a-button>
              </a-tooltip>

              <a-tooltip title="打开游戏目录">
                <a-button shape="circle" @click="openGameFolder(game)">
                  <template #icon>
                    <FolderOpenOutlined />
                  </template>
                </a-button>
              </a-tooltip>

              <a-tooltip title="编辑游戏信息">
                <a-button shape="circle" @click="editGame(game)">
                  <template #icon>
                    <EditOutlined />
                  </template>
                </a-button>
              </a-tooltip>

              <a-tooltip title="删除游戏">
                <a-button danger shape="circle" @click="confirmDelete(game)">
                  <template #icon>
                    <DeleteOutlined />
                  </template>
                </a-button>
              </a-tooltip>
            </a-space>
          </div>
        </div>
      </div>
    </div>

    <a-alert v-if="loadingState.error" type="error" show-icon :message="loadingState.error.message" closable
      class="error-alert" />

    <GameEditDialog
      v-model:visible="editDialogVisible"
      :game-info="currentEditGame"
      @success="handleEditComplete"
    />

    <GameAddDialog
      v-model:visible="addGameVisible"
      @success="handleAddGameComplete"
      @cancel="handleAddGameCancel"
    />
  </div>
</template>

<style scoped>
.game-list-container {
  padding: 24px;
}

/* 页面头部样式已移至 base.scss */

.filter-section {
  margin-bottom: 24px;
}

.games-content {
  min-height: 400px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.game-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
}

.game-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.game-cover-container {
  position: relative;
  height: 180px;
  overflow: hidden;
}

.game-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.cover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.3) 100%);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 12px;
}

.game-type-badge {
  background: rgba(24, 144, 255, 0.9);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.game-info {
  padding: 16px;
}

.game-header {
  margin-bottom: 12px;
}

.game-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.game-details {
  font-size: 12px;
  color: #666;
}

.game-details p {
  margin: 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.game-actions {
  padding: 0 16px 16px;
  display: flex;
  justify-content: center;
}

.error-alert {
  margin-top: 16px;
}
</style>
