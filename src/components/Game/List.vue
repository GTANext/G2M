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
import { NCard, NButton, NInput, NSelect, NGrid, NGridItem, NSpin, NEmpty, NTag, NTooltip, NAlert } from 'naive-ui'
import { useGameListView } from '@/composables'
import { useGameForm } from '@/composables'

// 导入对话框组件
import GameEditDialog from './EditDialog.vue'
import GameAddDialog from './AddDialog.vue'

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
  <G2MHeader title="已添加游戏">
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
  </G2MHeader>

  <NCard class="filter-section" :bordered="false">
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

    <NEmpty v-else-if="!games.length" description="还没有添加任何游戏" style="padding: 40px;">
      <template #extra>
        <NButton type="primary" @click="showAddGame">
          <template #icon>
            <PlusOutlined />
          </template>
          添加第一个游戏
        </NButton>
      </template>
    </NEmpty>

    <NEmpty v-else-if="!filteredGames.length" description="没有找到匹配的游戏" style="padding: 40px;">
      <template #extra>
        <NButton @click="searchQuery = ''">清除筛选条件</NButton>
      </template>
    </NEmpty>

    <NGrid v-else :cols="3" :x-gap="16" :y-gap="16" class="games-grid">
      <NGridItem v-for="game in filteredGames" :key="game.id">
        <NCard class="game-card" hoverable @click="goToGameInfo(game)">
          <div class="game-cover-container">
            <img :src="getGameIcon(game)" :alt="game.name" class="game-cover" @error="handleImageError" />
            <NTag type="info" class="game-type-badge" size="small">
              {{ getGameTypeFromExecutable(game.exe) }}
            </NTag>
          </div>

          <div class="game-info">
            <h3 class="game-name" :title="game.name">{{ game.name }}</h3>
            <p class="game-path" :title="game.dir">
              <FolderOpenOutlined />
              {{ game.dir }}
            </p>
            <p class="game-date">添加时间: {{ formatGameTime(game.time) }}</p>
          </div>

          <!-- <div class="game-actions" @click.stop>
            <NSpace>
              <NTooltip>
                <template #trigger>
                  <NButton circle type="primary" @click="launchGame(game)" :loading="loadingState.loading">
                    <template #icon>
                      <PlayCircleOutlined />
                    </template>
                  </NButton>
                </template>
                启动游戏
              </NTooltip>

              <NTooltip>
                <template #trigger>
                  <NButton circle @click="openGameFolder(game)">
                    <template #icon>
                      <FolderOpenOutlined />
                    </template>
                  </NButton>
                </template>
                打开游戏目录
              </NTooltip>

              <NTooltip>
                <template #trigger>
                  <NButton circle @click="editGame(game)">
                    <template #icon>
                      <EditOutlined />
                    </template>
                  </NButton>
                </template>
                编辑游戏信息
              </NTooltip>

              <NTooltip>
                <template #trigger>
                  <NButton circle type="error" @click="confirmDelete(game)">
                    <template #icon>
                      <DeleteOutlined />
                    </template>
                  </NButton>
                </template>
                删除游戏
              </NTooltip>
            </NSpace>
          </div> -->
        </NCard>
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

.game-path {
  font-size: 12px;
  color: #999;
  margin: 4px 0;
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
  margin: 4px 0 0 0;
}

.game-actions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}
</style>
