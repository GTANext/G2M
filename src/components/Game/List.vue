<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  PlusOutlined,
  PlayCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  SearchOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons-vue'
import { useGameList } from '@/composables'
import { Modal, Empty } from 'ant-design-vue'
import { h } from 'vue'

const router = useRouter()

// 添加游戏类型筛选
const selectedGameType = ref('')

const {
  gameList: games,
  filteredGameList: filteredGames,
  searchKeyword: searchQuery,
  loadingState,
  loadGameList: loadGames,
  refreshGameList: refreshGames,
  launchGame,
  deleteGame,
  editGame,
  getGameTypeFromExecutable,
  formatGameTime
} = useGameList(selectedGameType)

// 页面加载时获取游戏列表
onMounted(() => {
  loadGames()
})

// 跳转到添加游戏页面
const goToAddGame = () => {
  router.push('/game/add')
}

// 跳转到游戏详情页面
const goToGameInfo = (game) => {
  router.push(`/game/info?id=${game.id}`)
}

// 确认删除游戏
const confirmDelete = (game) => {
  Modal.confirm({
    title: '确认删除',
    icon: h(ExclamationCircleOutlined),
    content: `确定要删除游戏 "${game.name}" 吗？此操作不可撤销。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      deleteGame(game.id)
    }
  })
}

// 打开游戏目录
const openGameFolder = (game) => {
  // 这里可以调用 Tauri API 打开文件夹
  console.log('打开游戏目录:', game.dir)
}

// 获取游戏图片
const getGameImage = (game) => {
  // 如果游戏有自定义图片，优先使用
  if (game.img) {
    return game.img
  }

  // 优先使用 game_type 字段，其次根据可执行文件推断
  const gameType = game.game_type || getGameTypeFromExecutable(game.exe)
  const imageMap = {
    'gta3': '/images/gta3.jpg',
    'gtavc': '/images/gtavc.jpg',
    'gtasa': '/images/gtasa.jpg'
  }

  return imageMap[gameType] || '/images/null.svg'
}

// 处理图片加载错误
const handleImageError = (event) => {
  // 如果图片加载失败，显示默认图片
  event.target.src = '/images/null.svg'
}
</script>

<template>
  <div class="game-list-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <AppstoreOutlined class="title-icon" />
            我的游戏
          </h1>
          <p class="page-description">
            管理您的 GTA 游戏收藏
          </p>
        </div>
        <div class="action-section">
          <a-space>
            <a-button type="default" @click="refreshGames" :loading="loadingState.loading">
              <template #icon>
                <ReloadOutlined />
              </template>
              刷新
            </a-button>
            <a-button type="primary" size="large" @click="goToAddGame">
              <template #icon>
                <PlusOutlined />
              </template>
              添加游戏
            </a-button>
          </a-space>
        </div>
      </div>
    </div>

    <!-- 搜索和筛选 -->
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
          </a-select>
        </a-col>
      </a-row>
    </div>

    <!-- 游戏列表 -->
    <div class="games-content">
      <!-- 加载状态 -->
      <div v-if="loadingState.loading" class="loading-container">
        <a-spin size="large" tip="正在加载游戏列表..." />
      </div>

      <!-- 空状态 -->
      <div v-else-if="!games.length" class="empty-container">
        <a-empty description="还没有添加任何游戏" :image="Empty.PRESENTED_IMAGE_SIMPLE">
          <a-button type="primary" @click="goToAddGame">
            <template #icon>
              <PlusOutlined />
            </template>
            添加第一个游戏
          </a-button>
        </a-empty>
      </div>

      <!-- 无搜索结果 -->
      <div v-else-if="!filteredGames.length" class="empty-container">
        <a-empty description="没有找到匹配的游戏" :image="Empty.PRESENTED_IMAGE_SIMPLE">
          <a-button @click="searchQuery = ''">
            清除筛选条件
          </a-button>
        </a-empty>
      </div>

      <!-- 游戏卡片列表 -->
      <div v-else class="games-grid">
        <div v-for="game in filteredGames" :key="game.id" class="game-card" @click="goToGameInfo(game)">
          <!-- 游戏封面图片 -->
          <div class="game-cover-container">
            <img :src="getGameImage(game)" :alt="game.name" class="game-cover" @error="handleImageError" />
            <div class="cover-overlay">
              <div class="game-type-badge">
                {{ getGameTypeFromExecutable(game.exe) }}
              </div>
            </div>
          </div>

          <!-- 游戏信息 -->
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

          <!-- 操作按钮 -->
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

    <!-- 错误提示 -->
    <a-alert v-if="loadingState.error" type="error" show-icon :message="loadingState.error.message" closable
      class="error-alert" />
  </div>
</template>

<style scoped>
.game-list-container {
  padding: 24px;
  min-height: 100vh;
  background: #f5f5f5;
}

.page-header {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section {
  flex: 1;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #1890ff;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 32px;
}

.page-description {
  color: #666;
  font-size: 16px;
  margin: 0;
}

.action-section {
  flex-shrink: 0;
}

.filter-section {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.games-content {
  min-height: 400px;
}

.loading-container,
.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
}

.game-card {
  background: #fff;
  border-radius: 16px;
  padding: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f0f0;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  overflow: hidden;
}

.game-card:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  transform: translateY(-4px);
  border-color: #1890ff;
}

.game-cover-container {
  position: relative;
  width: 100%;
  height: 200px;
  border-radius: 16px 16px 0 0;
  overflow: hidden;
}

.game-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.game-card:hover .game-cover {
  transform: scale(1.05);
}

.cover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom,
      rgba(0, 0, 0, 0.1) 0%,
      rgba(0, 0, 0, 0) 30%,
      rgba(0, 0, 0, 0) 70%,
      rgba(0, 0, 0, 0.6) 100%);
  display: flex;
  align-items: flex-end;
  padding: 16px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.game-card:hover .cover-overlay {
  opacity: 1;
}

.game-type-badge {
  background: rgba(24, 144, 255, 0.9);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.game-info {
  flex: 1;
  padding: 20px;
}

.game-header {
  margin-bottom: 12px;
}

.game-name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.game-details {
  color: #666;
  font-size: 14px;
}

.game-details p {
  margin: 6px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.game-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.game-actions {
  display: flex;
  justify-content: center;
  padding: 16px 20px 20px 20px;
  border-top: 1px solid #f0f0f0;
  margin-top: auto;
}

.error-alert {
  margin-top: 24px;
  border-radius: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .game-list-container {
    padding: 16px;
  }

  .header-content {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .games-grid {
    grid-template-columns: 1fr;
  }

  .game-card {
    padding: 16px;
  }

  .page-title {
    font-size: 24px;
    justify-content: center;
  }
}

@media (max-width: 1200px) {
  .games-grid {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  }
}
</style>