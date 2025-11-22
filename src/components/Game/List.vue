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
  ReloadOutlined
} from '@ant-design/icons-vue'
import { useGameListView, useGameUtils } from '@/composables'
import { useGameForm } from '@/composables'

// 导入对话框组件
import GameEditDialog from './EditDialog.vue'
import GameAddDialog from './AddDialog.vue'
import GameCard from './Card.vue'

// 游戏类型选项
const gameTypeOptions = [
  { label: '全部游戏', value: '' },
  { label: 'GTA III', value: 'gta3' },
  { label: 'GTA Vice City', value: 'gtavc' },
  { label: 'GTA San Andreas', value: 'gtasa' },
  { label: '其他', value: 'other' }
]

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
  getGameTypeName,

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

// 使用游戏工具函数
const { getGameTypeColor } = useGameUtils()

// 页面加载时获取游戏列表
onMounted(() => {
  if (isTauriEnvironment()) {
    loadGames()
  }
})
</script>

<template>
  <!-- <G2MHeader title="已添加游戏">
    <template #right>
      <NButton @click="refreshGames" :loading="loadingState.loading">
        <template #icon>
          <ReloadOutlined />
        </template>
刷新
</NButton>
<NButton type="primary" @click="showAddGame">
  <template #icon>
          <PlusOutlined />
        </template>
  添加游戏
</NButton>
</template>
</G2MHeader> -->

  <NCard v-if="!loadingState.loading && games.length > 0" class="filter-section" :bordered="false">
    <NGrid :cols="2" :x-gap="16">
      <NGridItem>
        <NInput v-model:value="searchQuery" placeholder="搜索游戏名称..." clearable>
          <template #prefix>
            <SearchOutlined />
          </template>
        </NInput>
      </NGridItem>
      <NGridItem>
        <NSelect v-model:value="selectedGameType" placeholder="筛选游戏类型" clearable :options="gameTypeOptions" />
      </NGridItem>
    </NGrid>
  </NCard>

  <div class="games-content">
    <NSpin v-if="loadingState.loading" size="large" style="display: flex; justify-content: center; padding: 40px;">
      <template #description>正在加载游戏列表...</template>
    </NSpin>

    <a-flex v-else-if="!games.length" vertical justify="center" align="center"
      :style="{ minHeight: '400px', padding: '40px' }">
      <NEmpty description="还没有添加任何游戏">
        <template #extra>
          <NButton type="primary" @click="showAddGame">
            <template #icon>
              <PlusOutlined />
            </template>
            添加第一个游戏
          </NButton>
        </template>
      </NEmpty>
    </a-flex>

    <a-flex v-else-if="!filteredGames.length" vertical justify="center" align="center"
      :style="{ minHeight: '400px', padding: '40px' }">
      <NEmpty description="没有找到匹配的游戏">
        <template #extra>
          <NButton @click="searchQuery = ''">清除筛选条件</NButton>
        </template>
      </NEmpty>
    </a-flex>

    <NGrid v-else :cols="3" :x-gap="16" :y-gap="16" class="games-grid">
      <NGridItem v-for="game in filteredGames" :key="game.id">
        <GameCard :game="game" display-mode="list" :get-game-icon="getGameIcon"
          :get-game-type-name="(game) => getGameTypeName(game.type) || getGameTypeFromExecutable(game.exe)"
          :get-game-type-color="getGameTypeColor" :format-game-time="formatGameTime" @click="goToGameInfo" />
      </NGridItem>

      <NGridItem>
        <a-card class="add-game-card" hoverable style="width: 100%" @click="showAddGame">
          <div class="add-game-content">
            <PlusOutlined class="add-game-icon" />
            <p class="add-game-text">添加游戏</p>
          </div>
        </a-card>
      </NGridItem>
    </NGrid>
  </div>

  <NAlert v-if="loadingState.error" type="error" :title="loadingState.error.message" closable
    style="margin-top: 16px;" />

  <GameEditDialog v-model:visible="editDialogVisible" :game-info="currentEditGame" @success="handleEditComplete" />

  <GameAddDialog v-model:visible="addGameVisible" @success="handleAddGameComplete" @cancel="handleAddGameCancel" />
</template>

<style scoped>
.filter-section {
  margin-bottom: 16px;
}

.games-content {
  min-height: 400px;
}

.game-card {
  cursor: pointer;
  height: 100%;
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

.game-type-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
}

.game-description {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.game-path {
  font-size: 12px;
  color: #999;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}

.game-date {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.game-actions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.add-game-card {
  cursor: pointer;
  height: 100%;
  border: 1px dashed #d9d9d9;
  transition: all 0.3s;
  background-color: #fafafa70;
}

.add-game-card:hover {
  border-color: #1890ff;
  background-color: #f0f7ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
}

.add-game-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  gap: 12px;
}

.add-game-icon {
  font-size: 48px;
  color: #bfbfbf;
  transition: all 0.3s;
}

.add-game-card:hover .add-game-icon {
  color: #1890ff;
}

.add-game-text {
  font-size: 16px;
  color: #8c8c8c;
  margin: 0;
  transition: color 0.3s;
  font-weight: 500;
}

.add-game-card:hover .add-game-text {
  color: #1890ff;
}
</style>
