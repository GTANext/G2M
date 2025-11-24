<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDialog, useMessage as useNaiveMessage } from 'naive-ui'
import {
  PlayCircleOutlined,
  FolderOpenOutlined,
  HomeOutlined
} from '@ant-design/icons-vue'

import { useGameInfo } from '@/composables/game/useGameInfo'
import { useGameActions } from '@/composables/game/useGameActions'
import { useGameApi } from '@/composables/api/useGameApi'
import { useGameListView } from '@/composables/ui/useGameListView'
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
const { confirmDelete } = useGameListView()

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

// 修改游戏目录
const handleChangeDir = async (game) => {
  if (!game) return

  dialog.warning({
    title: '修改游戏目录',
    content: '修改游戏目录可能导致游戏无法正常启动。建议重新添加游戏而不是修改目录。确定要继续吗？',
    positiveText: '确定修改',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        // 调用选择文件夹命令
        const { tauriInvoke } = await import('@/utils/tauri')
        const response = await tauriInvoke('select_game_folder')

        if (response?.success && response?.data) {
          const newDir = response.data

          // 检查是否有重复目录
          const duplicateCheck = await gameApi.checkDuplicateDirectory(newDir)
          if (!duplicateCheck?.success) {
            message.error('该目录已被其他游戏使用')
            return
          }

          // 更新游戏目录
          const updateResponse = await gameApi.updateGame(
            game.id,
            game.name,
            newDir,
            game.exe,
            game.img,
            game.type,
            game.deleted || false
          )

          if (updateResponse?.success) {
            message.success('游戏目录修改成功！')
            await loadGameInfo()
          } else {
            throw new Error(updateResponse?.error || '修改目录失败')
          }
        }
      } catch (error) {
        console.error('修改游戏目录失败:', error)
        message.error(`修改游戏目录失败: ${error instanceof Error ? error.message : '未知错误'}`)
      }
    }
  })
}

// 删除游戏复用 useGameListView 逻辑
const handleDeleteGame = (game) => {
  confirmDelete(game, {
    onDeleted: async () => {
      await loadGameInfo()
      router.push('/game/list')
    }
  })
}

const handleSaveEdit = async (editForm) => {
  const success = await saveEdit(gameId.value, editForm, gameInfo.value)
  if (success) {
    editDialogVisible.value = false
    await loadGameInfo()
  }
}

// 处理编辑成功事件
const handleEditSuccess = async () => {
  editDialogVisible.value = false
  await loadGameInfo()
}

// 页面加载时获取游戏信息
onMounted(async () => {
  if (isTauriEnvironment()) {
    await loadGameInfo()
  }
})
</script>

<template>
  <!-- <G2MHeader :title="gameInfo?.name || '游戏信息'">
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
</G2MHeader> -->

  <NSpin v-if="infoLoading" size="large" style="display: flex; justify-content: center; padding: 40px;">
    <template #description>正在加载游戏信息...</template>
  </NSpin>

  <div v-else-if="gameInfo">
    <a-breadcrumb style="margin-bottom: 16px;">
      <a-breadcrumb-item>
        <router-link to="/">
          <HomeOutlined />
          <span style="margin-left: 4px;">首页</span>
        </router-link>
      </a-breadcrumb-item>
      <a-breadcrumb-item>
        <router-link to="/game/list">游戏列表</router-link>
      </a-breadcrumb-item>
      <a-breadcrumb-item>{{ gameInfo.name }}</a-breadcrumb-item>
    </a-breadcrumb>
    <NAlert v-if="hasMissingModLoaders" type="warning" title="缺少必要的MOD加载器" description="请前往前置安装页面查看详情。"
      style="margin-bottom: 16px;" />
    <NAlert v-else-if="modLoaderLoading" type="info" title="正在检查 MOD 前置环境" style="margin-bottom: 16px;" />

    <NCard :bordered="false">
      <NTabs v-model:value="activeKey" type="line" animated>
        <NTabPane name="1" tab="基本信息">
          <GameInfoTab1 :game-info="gameInfo" :loading="actionLoading" @launch="handleLaunchGame"
            @open-folder="handleOpenFolder" @edit="startEdit" @delete="handleDeleteGame" />
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
    @save="handleSaveEdit" @success="handleEditSuccess" @cancel="cancelEdit" />
</template>

<style scoped></style>