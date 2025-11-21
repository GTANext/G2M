<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDialog, useMessage as useNaiveMessage } from 'naive-ui'
import {
  PlayCircleOutlined,
  FolderOpenOutlined
} from '@ant-design/icons-vue'

import { useGameInfo } from '@/composables/game/useGameInfo'
import { useGameActions } from '@/composables/game/useGameActions'
import { useGameApi } from '@/composables/api/useGameApi'
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

const activeKey = ref('1');



// 游戏API和消息提示
const gameApi = useGameApi()
const dialog = useDialog()
const message = useNaiveMessage()

// 编辑对话框状态和函数
const editDialogVisible = ref(false)

const startEdit = () => {
  editDialogVisible.value = true
}

const cancelEdit = () => {
  editDialogVisible.value = false
}

// 页面操作
const handleLaunchGame = () => {
  launchGame(gameInfo.value)
}

const handleOpenFolder = () => {
  openGameFolder(gameInfo.value)
}

// 删除游戏确认
const confirmDelete = (game) => {
  dialog.warning({
    title: '确认删除游戏',
    content: `确定要删除游戏 "${game.name}" 吗？此操作不可撤销。`,
    positiveText: '确认删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const response = await gameApi.deleteGame(game.id);
        if (response.success) {
          message.success(`游戏 "${game.name}" 删除成功！`);
          router.push('/');
        } else {
          throw new Error(response.error || '删除游戏失败');
        }
      } catch (error) {
        console.error('删除游戏失败:', error);
        message.error(`删除游戏失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }
  });
}

const handleSaveEdit = async (editForm) => {
  const success = await saveEdit(gameId.value, editForm, gameInfo.value)
  if (success) {
    editDialogVisible.value = false
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
      <NSpace v-if="gameInfo && !infoLoading">
        <NButton @click="handleOpenFolder" :loading="actionLoading.openFolder">
          <template #icon>
            <FolderOpenOutlined />
          </template>
          打开目录
        </NButton>
        <NButton type="primary" @click="handleLaunchGame" :loading="actionLoading.launch">
          <template #icon>
            <PlayCircleOutlined />
          </template>
          启动游戏
        </NButton>
      </NSpace>
    </template>
  </G2MHeader>

  <NSpin v-if="infoLoading" size="large" style="display: flex; justify-content: center; padding: 40px;">
    <template #description>正在加载游戏信息...</template>
  </NSpin>

  <div v-else-if="gameInfo">
    <NAlert v-if="hasMissingModLoaders" type="warning" title="缺少必要的MOD加载器" description="请前往前置安装页面查看详情。"
      style="margin-bottom: 16px;" />
    <NAlert v-else-if="modLoaderLoading" type="info" title="正在检查 MOD 前置环境" style="margin-bottom: 16px;" />

    <NCard :bordered="false">
      <NTabs v-model:value="activeKey" type="line" animated>
        <NTabPane name="1" tab="基本信息">
          <GameInfoTab1 :game-info="gameInfo" />
        </NTabPane>
        <NTabPane name="2" tab="前置安装">
          <GameInfoTab2 :game-info="gameInfo" />
        </NTabPane>
        <NTabPane name="3" tab="MOD管理">
          <GameInfoTab3 :game-info="gameInfo" />
        </NTabPane>
      </NTabs>
    </NCard>
  </div>

  <GameEditDialog v-model:visible="editDialogVisible" :game-info="gameInfo" :loading="actionLoading"
    @save="handleSaveEdit" @cancel="cancelEdit" />
</template>

<style scoped>

</style>