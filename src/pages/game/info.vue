<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal } from 'ant-design-vue'
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  FolderOpenOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons-vue'

import { useGameInfo } from '@/composables/game/useGameInfo'
import { useGameActions } from '@/composables/game/useGameActions'
import { useGameApi } from '@/composables/api/useGameApi'
import { useMessage } from '@/composables/ui/useMessage'
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

const tabPosition = ref('left');
const activeKey = ref('1');

// 游戏API和消息提示
const gameApi = useGameApi()
const { showSuccess, showError } = useMessage()

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

// 删除游戏确认
const confirmDelete = (game) => {
  Modal.confirm({
    title: '确认删除游戏',
    content: `确定要删除游戏 "${game.name}" 吗？此操作不可撤销。`,
    okText: '确认删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        const response = await gameApi.deleteGame(game.id);
        if (response.success) {
          showSuccess(`游戏 "${game.name}" 删除成功！`);
          // 删除成功后跳转回游戏列表
          router.push('/');
        } else {
          throw new Error(response.error || '删除游戏失败');
        }
      } catch (error) {
        console.error('删除游戏失败:', error);
        showError(`删除游戏失败: ${error instanceof Error ? error.message : '未知错误'}`, {
          detail: error
        });
      }
    }
  });
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
    <G2MHeader>
      <template #left>
        <a-button class="back-button" @click="goBack">
          <template #icon>
            <ArrowLeftOutlined />
          </template>
          返回游戏列表
        </a-button>
      </template>
      <template #right>
        <a-space v-if="gameInfo && !infoLoading">
          <a-button @click="handleOpenFolder" :loading="actionLoading.openFolder">
            <template #icon>
              <FolderOpenOutlined />
            </template>
            打开目录
          </a-button>
          <a-button type="primary" size="large" @click="handleLaunchGame" :loading="actionLoading.launch">
            <template #icon>
              <PlayCircleOutlined />
            </template>
            启动游戏
          </a-button>
        </a-space>
      </template>
    </G2MHeader>

    <div v-if="infoLoading" class="loading-container">
      <a-spin size="large" tip="正在加载游戏信息..." />
    </div>

    <div v-else-if="gameInfo" class="game-info-content">
      <a-card size="small">
        <a-tabs v-model:activeKey="activeKey" :tab-position="tabPosition" animated>
          <a-tab-pane key="1" tab="基本信息">
            Content of Tab Pane 1
          </a-tab-pane>
          <a-tab-pane key="2" tab="前置安装">
            Content of Tab Pane 2
          </a-tab-pane>
          <a-tab-pane key="3" tab="MOD管理">
            Content of Tab Pane 3
          </a-tab-pane>
        </a-tabs>
      </a-card>
    </div>

    <GameEditDialog v-model:visible="editDialogVisible" :game-info="gameInfo" :loading="actionLoading"
      @save="handleSaveEdit" @cancel="handleCancelEdit" />
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
</style>