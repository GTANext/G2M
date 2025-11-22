<script setup>
import { formatTime } from '@/utils/format'
import { useGameUtils } from '@/composables'
import {
  PlayCircleOutlined,
  FolderOpenOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined
} from '@ant-design/icons-vue'

const props = defineProps({
  gameInfo: {
    type: Object,
    default: null
  },
  loading: {
    type: Object,
    default: () => ({
      launch: false,
      openFolder: false
    })
  }
})

const emit = defineEmits(['launch', 'open-folder', 'edit', 'delete', 'change-dir'])

// 使用 composable
const { getGameTypeName, getGameTypeColor, getGameIcon, handleImageError } = useGameUtils()

// 格式化时间
const formatGameTime = (timeString) => {
  if (!timeString) return '未知时间'
  return formatTime(timeString)
}

// 操作按钮事件
const handleLaunch = () => {
  emit('launch', props.gameInfo)
}

const handleOpenFolder = () => {
  emit('open-folder', props.gameInfo)
}

const handleEdit = () => {
  emit('edit', props.gameInfo)
}

const handleDelete = () => {
  emit('delete', props.gameInfo)
}

const handleChangeDir = () => {
  emit('change-dir', props.gameInfo)
}
</script>

<template>
  <div v-if="gameInfo" class="game-info-tab1">
    <a-row :gutter="24">
      <!-- 左侧：游戏封面 -->
      <a-col :span="8">
        <div class="game-cover-section">
          <div class="game-cover-wrapper">
            <img
              :src="getGameIcon(gameInfo)"
              :alt="gameInfo.name"
              class="game-cover-image"
              @error="handleImageError"
            />
            <a-tag :color="getGameTypeColor(gameInfo.type)" class="game-type-tag">
              {{ getGameTypeName(gameInfo.type) }}
            </a-tag>
          </div>
        </div>
      </a-col>

      <!-- 右侧：游戏详情和操作 -->
      <a-col :span="16">
        <div class="game-details-section">
          <!-- 游戏名称 -->
          <div class="detail-item">
            <h2 class="game-title">{{ gameInfo.name }}</h2>
          </div>

          <!-- 游戏信息列表 -->
          <a-descriptions :column="1" bordered size="small" class="game-descriptions">
            <a-descriptions-item label="游戏类型">
              <a-tag :color="getGameTypeColor(gameInfo.type)">
                {{ getGameTypeName(gameInfo.type) }}
              </a-tag>
            </a-descriptions-item>

            <a-descriptions-item label="游戏目录">
              <div class="path-text" :title="gameInfo.dir">
                <FolderOpenOutlined />
                <span>{{ gameInfo.dir }}</span>
              </div>
            </a-descriptions-item>

            <a-descriptions-item label="启动程序">
              <div class="exe-text">
                <FileTextOutlined />
                <span>{{ gameInfo.exe || '未设置' }}</span>
              </div>
            </a-descriptions-item>

            <a-descriptions-item label="添加时间">
              {{ formatGameTime(gameInfo.time) }}
            </a-descriptions-item>

            <a-descriptions-item v-if="gameInfo.version" label="游戏版本">
              <a-tag color="blue">{{ gameInfo.version }}</a-tag>
            </a-descriptions-item>
          </a-descriptions>

          <!-- 操作按钮 -->
          <div class="action-buttons">
            <a-space size="middle">
              <a-button
                type="primary"
                size="large"
                :loading="loading?.launch"
                @click="handleLaunch"
              >
                <template #icon>
                  <PlayCircleOutlined />
                </template>
                启动游戏
              </a-button>

              <a-button
                size="large"
                :loading="loading?.openFolder"
                @click="handleOpenFolder"
              >
                <template #icon>
                  <FolderOpenOutlined />
                </template>
                打开文件夹
              </a-button>

              <a-button size="large" @click="handleEdit">
                <template #icon>
                  <EditOutlined />
                </template>
                编辑信息
              </a-button>

              <a-button type="primary" danger size="large" @click="handleDelete">
                <template #icon>
                  <DeleteOutlined />
                </template>
                删除游戏
              </a-button>
            </a-space>
          </div>
        </div>
      </a-col>
    </a-row>
  </div>

  <div v-else class="empty-state">
    <a-empty description="游戏信息不存在" />
  </div>
</template>

<style scoped>
.game-info-tab1 {
  padding: 24px 0;
}

.game-cover-section {
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.game-cover-wrapper {
  position: relative;
  width: 100%;
  max-width: 300px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.game-cover-image {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
}

.game-type-tag {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
}

.game-details-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.game-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  color: #333;
}

.game-descriptions {
  background: #fff;
}

.path-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.path-text,
.exe-text {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
}

.path-text {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.path-actions {
  display: flex;
  align-items: center;
}

.path-tip {
  margin-top: 4px;
}

.action-buttons {
  margin-top: 8px;
}

.empty-state {
  padding: 60px 0;
  text-align: center;
}
</style>
