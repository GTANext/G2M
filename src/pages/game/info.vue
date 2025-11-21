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
  loadGameInfo,
  modLoaderStatus,
  modLoaderLoading,
  hasMissingModLoaders
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
onMounted(async () => {
  if (isTauriEnvironment()) {
    await loadGameInfo()
  }
})
</script>

<template>
  <G2MHeader :title="gameInfo?.name || '游戏信息'">
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
    <a-alert v-if="hasMissingModLoaders" message="缺少必要的MOD加载器，请前往前置安装页面查看详情。" type="warning" show-icon
      style="margin-bottom: 24px;" />
    <a-alert v-else-if="modLoaderLoading" message="正在检查 MOD 前置环境" type="info" show-icon style="margin-bottom: 24px;" />

    <a-card size="small">
      <a-tabs v-model:activeKey="activeKey" :tab-position="tabPosition" animated>
        <a-tab-pane key="1" tab="基本信息">

        </a-tab-pane>
        <a-tab-pane key="2" tab="前置安装">
          <GameInfoTab2 :game-info="gameInfo" />
        </a-tab-pane>
        <a-tab-pane key="3" tab="MOD管理">
          <a-skeleton active />
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>

  <GameEditDialog v-model:visible="editDialogVisible" :game-info="gameInfo" :loading="actionLoading"
    @save="handleSaveEdit" @cancel="handleCancelEdit" />
</template>

<style scoped>
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.mod-warning-content p {
  margin-bottom: 8px;
}

/* MOD 安装界面样式 */
.mod-install-container {
  padding: 0;
}

.status-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.status-overview {
  padding: 8px 0;
}

.status-empty {
  padding: 20px;
}

.component-selection {
  padding: 8px 0;
}
</style>