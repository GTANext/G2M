<script setup>
import { computed } from 'vue'
import { FolderOpenOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  // 游戏数据
  game: {
    type: Object,
    required: true
  },
  // 是否可点击
  clickable: {
    type: Boolean,
    default: true
  },
  // 游戏图标获取函数
  getGameIcon: {
    type: Function,
    default: null
  },
  // 游戏类型名称获取函数
  getGameTypeName: {
    type: Function,
    default: null
  },
  // 游戏类型颜色获取函数
  getGameTypeColor: {
    type: Function,
    default: null
  },
  // 格式化时间函数
  formatGameTime: {
    type: Function,
    default: null
  },
  // 显示模式：'list' 显示路径和时间，'simple' 只显示描述
  displayMode: {
    type: String,
    default: 'list', // 'list' 或 'simple'
    validator: (value) => ['list', 'simple'].includes(value)
  }
})

const emit = defineEmits(['click'])

// 默认获取游戏图标
const defaultGetGameIcon = (game) => {
  if (game.img) return game.img
  const iconMap = {
    'gta3': '/images/gta3.jpg',
    'GTA3': '/images/gta3.jpg',
    'gtavc': '/images/gtavc.jpg',
    'GTAVC': '/images/gtavc.jpg',
    'gtasa': '/images/gtasa.jpg',
    'GTASA': '/images/gtasa.jpg'
  }
  return iconMap[game.type || game.gameType] || '/images/null.svg'
}

// 默认获取游戏类型名称
const defaultGetGameTypeName = (game) => {
  const typeMap = {
    'gta3': 'GTA III',
    'GTA3': 'GTA III',
    'gtavc': 'GTA Vice City',
    'GTAVC': 'GTA Vice City',
    'gtasa': 'GTA San Andreas',
    'GTASA': 'GTA San Andreas'
  }
  return typeMap[game.type || game.gameType] || game.name || '未知游戏'
}

// 默认获取游戏类型颜色
const defaultGetGameTypeColor = (gameType) => {
  if (!gameType) return '#999999'
  const colorMap = {
    'gta3': '#108ee9',
    'GTA3': '#108ee9',
    'gtavc': '#ff6b9d',
    'GTAVC': '#ff6b9d',
    'gtasa': '#52c41a',
    'GTASA': '#52c41a',
    'other': '#999999'
  }
  return colorMap[gameType] || '#999999'
}

// 处理图片加载错误
const handleImageError = (event) => {
  event.target.src = '/images/null.svg'
}

// 处理卡片点击
const handleClick = () => {
  if (props.clickable) {
    emit('click', props.game)
  }
}

// 计算属性
const gameIcon = computed(() => {
  const getIcon = props.getGameIcon || defaultGetGameIcon
  return getIcon(props.game)
})

const gameTypeName = computed(() => {
  const getName = props.getGameTypeName || defaultGetGameTypeName
  return getName(props.game)
})

const gameTypeColor = computed(() => {
  const getColor = props.getGameTypeColor || defaultGetGameTypeColor
  return getColor(props.game.type || props.game.gameType)
})

const formattedTime = computed(() => {
  if (!props.formatGameTime || !props.game.time) return props.game.time
  return props.formatGameTime(props.game.time)
})
</script>

<template>
  <a-card class="game-card" :hoverable="clickable" :style="{ width: '100%', cursor: clickable ? 'pointer' : 'default' }"
    @click="handleClick">
    <template #cover>
      <div class="game-cover-container">
        <img :src="gameIcon" :alt="game.name" class="game-cover" @error="handleImageError" />
        <a-tag :color="gameTypeColor" class="game-type-badge">
          {{ gameTypeName }}
        </a-tag>
      </div>
    </template>
    <a-card-meta :title="game.name">
      <template #description>
        <div v-if="displayMode === 'list'" class="game-description">
          <p v-if="game.dir" class="game-path" :title="game.dir">
            <FolderOpenOutlined />
            {{ game.dir }}
          </p>
          <p v-if="game.time" class="game-date">添加时间: {{ formattedTime }}</p>
        </div>
        <div v-else-if="displayMode === 'simple'" class="game-description">
          <p v-if="game.description" class="game-desc-text">{{ game.description }}</p>
        </div>
      </template>
    </a-card-meta>
    <div v-if="$slots.actions" class="game-actions-wrapper">
      <slot name="actions" :game="game"></slot>
    </div>
  </a-card>
</template>

<style scoped>
.game-card {
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

.game-desc-text {
  font-size: 12px;
  color: #999;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.game-actions-wrapper {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}
</style>
