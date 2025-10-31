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
  resetForm()
  addGameVisible.value = true
}

// 提交添加游戏表单
const handleAddGameSubmit = async () => {
  const success = await submitForm()
  if (success) {
    addGameVisible.value = false
    refreshGames()
  }
}

// 取消添加游戏
const handleAddGameCancel = () => {
  addGameVisible.value = false
  resetForm()
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
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            已添加游戏
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
            <a-button type="primary" size="large" @click="showAddGame">
              <template #icon>
                <PlusOutlined />
              </template>
              添加游戏
            </a-button>
          </a-space>
        </div>
      </div>
    </div>

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

    <!-- 编辑游戏对话框 -->
    <GameEditDialog
      v-model:visible="editDialogVisible"
      :game-info="currentEditGame"
      @success="handleEditComplete"
    />

    <!-- 添加游戏对话框 -->
    <a-modal
      v-model:open="addGameVisible"
      title="添加游戏"
      width="800px"
      :footer="null"
      @cancel="handleAddGameCancel"
    >
      <div class="add-game-content">
        <div class="add-game-header">
          <h3 class="add-game-title">
            <AppstoreOutlined class="title-icon" />
            添加新游戏
          </h3>
          <p class="add-game-description">
            选择游戏文件夹，系统将自动检测支持的 GTA 游戏并填充信息
          </p>
        </div>

        <a-form ref="formRef" :model="formData" :rules="rules" layout="vertical" @finish="handleAddGameSubmit">
          <a-form-item label="游戏目录" name="dir" class="form-item">
            <a-input-group compact>
              <a-input v-model:value="formData.dir" placeholder="请选择游戏安装目录" readonly class="folder-input" />
              <a-button type="primary" @click="selectFolder" :loading="formLoadingState.loading" class="folder-button">
                <template #icon>
                  <FolderOpenOutlined />
                </template>
                选择文件夹
              </a-button>
            </a-input-group>
          </a-form-item>

          <div v-if="formData.dir" class="detection-section">
            <a-spin :spinning="isDetecting" tip="正在检测游戏...">
              <a-alert v-if="isAutoDetected" type="success" show-icon class="detection-alert">
                <template #icon>
                  <CheckCircleOutlined />
                </template>
                <template #message>
                  <span class="detection-title">自动检测成功</span>
                </template>
                <template #description>
                  <div class="detection-info">
                    <p><strong>游戏类型:</strong> {{ getGameTypeName(detectionResult?.type || '') }}</p>
                    <p><strong>主程序:</strong> {{ detectionResult?.executable }}</p>
                    <p class="detection-note">系统已自动填充游戏信息，您可以根据需要进行修改</p>
                  </div>
                </template>
              </a-alert>

              <a-alert v-else-if="detectionResult && !isAutoDetected" type="info" show-icon class="detection-alert">
                <template #message>
                  <span class="detection-title">未检测到支持的游戏</span>
                </template>
                <template #description>
                  <div class="detection-info">
                    <p>在所选目录中未找到支持的 GTA 游戏，请手动填写游戏信息</p>
                  </div>
                </template>
              </a-alert>
            </a-spin>
          </div>

          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="游戏名称" name="name">
                <a-input v-model:value="formData.name" placeholder="请输入游戏名称" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="启动程序" name="exe">
                <a-input v-model:value="formData.exe" placeholder="例如: gta3.exe" />
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item label="游戏封面" class="image-form-item">
            <div class="image-upload-section">
              <div v-if="imagePreview" class="image-preview-container">
                <img :src="imagePreview" alt="游戏封面预览" class="image-preview" />
                <div class="image-actions">
                  <a-button type="text" @click="selectImage" :loading="uploadingImage">
                    <template #icon>
                      <UploadOutlined />
                    </template>
                    更换图片
                  </a-button>
                  <a-button type="text" danger @click="clearImage">
                    <template #icon>
                      <DeleteOutlined />
                    </template>
                    删除图片
                  </a-button>
                </div>
              </div>
              <div v-else class="image-upload-placeholder" @click="selectImage">
                <div class="upload-content">
                  <PictureOutlined class="upload-icon" />
                  <p class="upload-text">点击选择游戏封面</p>
                  <p class="upload-hint">支持 JPG、PNG 格式</p>
                </div>
              </div>
            </div>
          </a-form-item>

          <div class="form-actions">
            <a-space>
              <a-button @click="handleAddGameCancel">
                取消
              </a-button>
              <a-button type="primary" html-type="submit" :loading="formLoadingState.loading">
                <template #icon>
                  <CheckCircleOutlined />
                </template>
                添加游戏
              </a-button>
            </a-space>
          </div>
        </a-form>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.game-list-container {
  padding: 24px;
}

.page-header {
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
}

.page-description {
  color: #666;
  margin: 0;
  font-size: 16px;
}

.action-section {
  flex-shrink: 0;
}

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
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  backdrop-filter: blur(4px);
}

.game-info {
  padding: 16px;
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
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.game-path,
.game-exe,
.game-date {
  font-size: 13px;
  color: #666;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.game-path {
  font-family: 'Courier New', monospace;
}

.game-actions {
  position: absolute;
  bottom: 16px;
  right: 16px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.game-card:hover .game-actions {
  opacity: 1;
}

.error-alert {
  margin-top: 24px;
}

/* 添加游戏对话框样式 */
.add-game-content {
  padding: 8px 0;
}

.add-game-header {
  margin-bottom: 24px;
  text-align: center;
}

.add-game-title {
  font-size: 20px;
  font-weight: 600;
  color: #1890ff;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.title-icon {
  font-size: 24px;
}

.add-game-description {
  color: #666;
  margin: 0;
  font-size: 14px;
}

.form-item {
  margin-bottom: 20px;
}

.folder-input {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.folder-button {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.detection-section {
  margin: 20px 0;
}

.detection-alert {
  border-radius: 8px;
}

.detection-title {
  font-weight: 600;
}

.detection-info p {
  margin: 4px 0;
}

.detection-note {
  color: #666;
  font-style: italic;
}

.image-form-item {
  margin-bottom: 24px;
}

.image-upload-section {
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.3s ease;
}

.image-upload-section:hover {
  border-color: #1890ff;
}

.image-preview-container {
  position: relative;
}

.image-preview {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
}

.image-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  padding: 16px;
  display: flex;
  justify-content: center;
  gap: 12px;
}

.image-actions .ant-btn {
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}

.image-actions .ant-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
}

.image-upload-placeholder {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.image-upload-placeholder:hover {
  background-color: #fafafa;
}

.upload-content {
  text-align: center;
}

.upload-icon {
  font-size: 48px;
  color: #d9d9d9;
  margin-bottom: 16px;
}

.upload-text {
  font-size: 16px;
  color: #666;
  margin: 0 0 4px 0;
}

.upload-hint {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.form-actions {
  text-align: right;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

@media (max-width: 768px) {
  .game-list-container {
    padding: 16px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .games-grid {
    grid-template-columns: 1fr;
  }
  
  .game-actions {
    position: static;
    opacity: 1;
    margin-top: 12px;
  }
}
</style>