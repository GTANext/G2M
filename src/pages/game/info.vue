<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { 
  ArrowLeftOutlined,
  PlayCircleOutlined,
  FolderOpenOutlined,
  EditOutlined,
  AppstoreOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons-vue'
import { useGameApi } from '@/composables'
import { message } from 'ant-design-vue'

const router = useRouter()
const route = useRoute()
const { getGameById, updateGame } = useGameApi()

// 页面状态
const loading = ref(false)
const gameInfo = ref(null)
const activeTab = ref('info')

// 编辑表单数据
const editForm = ref({
  name: '',
  dir: '',
  exe: '',
  img: ''
})

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入游戏名称', trigger: 'blur' }
  ],
  dir: [
    { required: true, message: '请选择游戏目录', trigger: 'blur' }
  ],
  exe: [
    { required: true, message: '请输入启动程序', trigger: 'blur' }
  ]
}

// 编辑状态
const isEditing = ref(false)
const editFormRef = ref()

// 获取游戏ID
const gameId = computed(() => {
  const id = route.query.id
  return id ? parseInt(id, 10) : null
})

// 获取游戏类型名称
const getGameTypeName = (game) => {
  // 优先使用 game_type 字段
  if (game.game_type) {
    const typeMap = {
      'gta3': 'GTA III',
      'gtavc': 'GTA Vice City',
      'gtasa': 'GTA San Andreas'
    }
    return typeMap[game.game_type] || '未知'
  }
  
  // 兼容旧数据，根据可执行文件推断
  if (!game.exe) return '未知'
  const lowerExe = game.exe.toLowerCase()
  if (lowerExe.includes('gta3') || lowerExe.includes('gta_3')) return 'GTA III'
  if (lowerExe.includes('gtavc') || lowerExe.includes('vice')) return 'GTA Vice City'
  if (lowerExe.includes('gtasa') || lowerExe.includes('san')) return 'GTA San Andreas'
  return '其他'
}

// 格式化时间
const formatTime = (timeStr) => {
  if (!timeStr) return '未知'
  try {
    return new Date(timeStr).toLocaleString('zh-CN')
  } catch {
    return timeStr
  }
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

// 根据可执行文件获取游戏类型
const getGameTypeFromExecutable = (exe) => {
  if (!exe) return 'unknown'
  const lowerExe = exe.toLowerCase()
  if (lowerExe.includes('gta3') || lowerExe.includes('gta_3')) return 'gta3'
  if (lowerExe.includes('gtavc') || lowerExe.includes('vice')) return 'gtavc'
  if (lowerExe.includes('gtasa') || lowerExe.includes('san')) return 'gtasa'
  return 'unknown'
}

// 处理图片加载错误
const handleImageError = (event) => {
  // 如果图片加载失败，显示默认图片
  event.target.src = '/images/null.svg'
}

// 加载游戏信息
const loadGameInfo = async () => {
  if (!gameId.value) {
    message.error('游戏ID不能为空')
    router.push('/')
    return
  }

  loading.value = true
  try {
    const response = await getGameById(gameId.value)
    if (response.success && response.data) {
      gameInfo.value = response.data
      // 初始化编辑表单
      editForm.value = {
        name: response.data.name || '',
        dir: response.data.dir || '',
        exe: response.data.exe || '',
        img: response.data.img || ''
      }
    } else {
      message.error(response.error || '获取游戏信息失败')
      router.push('/')
    }
  } catch (error) {
    console.error('加载游戏信息失败:', error)
    message.error('加载游戏信息失败')
    router.push('/')
  } finally {
    loading.value = false
  }
}

// 返回游戏列表
const goBack = () => {
  router.push('/')
}

// 启动游戏
const launchGame = () => {
  if (!gameInfo.value) return
  // TODO: 实现启动游戏逻辑
  message.info(`启动游戏: ${gameInfo.value.name}`)
}

// 打开游戏目录
const openGameFolder = () => {
  if (!gameInfo.value) return
  // TODO: 实现打开文件夹逻辑
  message.info(`打开目录: ${gameInfo.value.dir}`)
}

// 开始编辑
const startEdit = () => {
  isEditing.value = true
  activeTab.value = 'edit'
}

// 取消编辑
const cancelEdit = () => {
  isEditing.value = false
  // 重置表单数据
  if (gameInfo.value) {
    editForm.value = {
      name: gameInfo.value.name || '',
      dir: gameInfo.value.dir || '',
      exe: gameInfo.value.exe || '',
      img: gameInfo.value.img || ''
    }
  }
}

// 保存编辑
const saveEdit = async () => {
  if (!editFormRef.value) return
  
  try {
    await editFormRef.value.validate()
    
    loading.value = true
    const response = await updateGame(gameId.value, editForm.value)
    
    if (response.success) {
      message.success('游戏信息更新成功')
      // 更新本地数据
      gameInfo.value = { ...gameInfo.value, ...editForm.value }
      isEditing.value = false
      activeTab.value = 'info'
    } else {
      message.error(response.error || '更新游戏信息失败')
    }
  } catch (error) {
    console.error('保存游戏信息失败:', error)
    message.error('保存游戏信息失败')
  } finally {
    loading.value = false
  }
}

// 页面加载时获取游戏信息
onMounted(() => {
  loadGameInfo()
})
</script>

<template>
  <div class="game-info-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <a-button 
            type="text" 
            @click="goBack"
            class="back-button"
          >
            <template #icon>
              <ArrowLeftOutlined />
            </template>
            返回游戏列表
          </a-button>
        </div>
        <div class="header-right" v-if="gameInfo && !loading">
          <a-space>
            <a-button 
              type="primary" 
              @click="launchGame"
              :loading="loading"
            >
              <template #icon>
                <PlayCircleOutlined />
              </template>
              启动游戏
            </a-button>
            <a-button 
              @click="openGameFolder"
            >
              <template #icon>
                <FolderOpenOutlined />
              </template>
              打开目录
            </a-button>
          </a-space>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <a-spin size="large" tip="正在加载游戏信息..." />
    </div>

    <!-- 游戏信息内容 -->
    <div v-else-if="gameInfo" class="game-content">
      <!-- 游戏封面和基本信息卡片 -->
      <a-card class="game-summary-card">
        <!-- 游戏封面 -->
        <div class="game-cover-section">
          <div class="game-cover-container">
            <img
              :src="getGameImage(gameInfo)"
              :alt="gameInfo.name"
              class="game-cover-large"
              @error="handleImageError"
            />
            <div class="cover-gradient">
              <div class="cover-info">
                <h1 class="game-title">{{ gameInfo.name }}</h1>
                <div class="game-badges">
                  <a-tag color="blue" class="game-type-tag">
                    {{ getGameTypeName(gameInfo) }}
                  </a-tag>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 游戏元信息 -->
        <div class="game-meta-section">
          <div class="meta-item">
            <span class="meta-label">添加时间:</span>
            <span class="meta-value">{{ formatTime(gameInfo.time) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">游戏目录:</span>
            <span class="meta-value" :title="gameInfo.dir">{{ gameInfo.dir }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">启动程序:</span>
            <span class="meta-value">{{ gameInfo.exe }}</span>
          </div>
        </div>
      </a-card>

      <!-- Tab 内容 -->
      <a-card class="tab-content-card">
        <a-tabs v-model:activeKey="activeTab" type="card">
          <!-- 游戏信息 Tab -->
          <a-tab-pane key="info" tab="游戏信息">
            <template #tab>
              <InfoCircleOutlined />
              游戏信息
            </template>
            
            <div class="info-content">
              <a-descriptions 
                :column="1" 
                bordered
                size="large"
              >
                <a-descriptions-item label="游戏名称">
                  {{ gameInfo.name }}
                </a-descriptions-item>
                <a-descriptions-item label="游戏类型">
                  {{ getGameTypeName(gameInfo) }}
                </a-descriptions-item>
                <a-descriptions-item label="安装目录">
                  <div class="path-item">
                    <span class="path-text" :title="gameInfo.dir">
                      {{ gameInfo.dir }}
                    </span>
                    <a-button 
                      type="link" 
                      size="small"
                      @click="openGameFolder"
                    >
                      <template #icon>
                        <FolderOpenOutlined />
                      </template>
                      打开
                    </a-button>
                  </div>
                </a-descriptions-item>
                <a-descriptions-item label="启动程序">
                  {{ gameInfo.exe }}
                </a-descriptions-item>
                <a-descriptions-item label="添加时间">
                  {{ formatTime(gameInfo.time) }}
                </a-descriptions-item>
              </a-descriptions>

              <div class="action-buttons">
                <a-space>
                  <a-button 
                    type="primary" 
                    size="large"
                    @click="launchGame"
                  >
                    <template #icon>
                      <PlayCircleOutlined />
                    </template>
                    启动游戏
                  </a-button>
                  <a-button 
                    size="large"
                    @click="startEdit"
                  >
                    <template #icon>
                      <EditOutlined />
                    </template>
                    编辑信息
                  </a-button>
                </a-space>
              </div>
            </div>
          </a-tab-pane>

          <!-- 编辑信息 Tab -->
          <a-tab-pane key="edit" tab="编辑信息">
            <template #tab>
              <EditOutlined />
              编辑信息
            </template>
            
            <div class="edit-content">
              <a-form
                ref="editFormRef"
                :model="editForm"
                :rules="rules"
                layout="vertical"
                @finish="saveEdit"
              >
                <a-form-item label="游戏名称" name="name">
                  <a-input
                    v-model:value="editForm.name"
                    placeholder="请输入游戏名称"
                    size="large"
                  />
                </a-form-item>

                <a-form-item label="游戏目录" name="dir">
                  <a-input
                    v-model:value="editForm.dir"
                    placeholder="请输入游戏安装目录"
                    size="large"
                    readonly
                  />
                  <div class="form-help">
                    <p>游戏目录通常不建议修改，如需修改请重新添加游戏</p>
                  </div>
                </a-form-item>

                <a-form-item label="启动程序" name="exe">
                  <a-input
                    v-model:value="editForm.exe"
                    placeholder="请输入游戏主程序文件名"
                    size="large"
                  />
                  <div class="form-help">
                    <p>支持的游戏主程序：gta3.exe, gtavc.exe, gta_sa.exe 等</p>
                  </div>
                </a-form-item>

                <a-form-item label="游戏图标" name="img">
                  <a-input
                    v-model:value="editForm.img"
                    placeholder="请输入游戏图标路径（可选）"
                    size="large"
                  />
                </a-form-item>

                <div class="form-actions">
                  <a-space>
                    <a-button 
                      type="primary" 
                      html-type="submit"
                      size="large"
                      :loading="loading"
                    >
                      <template #icon>
                        <CheckCircleOutlined />
                      </template>
                      保存修改
                    </a-button>
                    <a-button 
                      size="large"
                      @click="cancelEdit"
                    >
                      取消
                    </a-button>
                  </a-space>
                </div>
              </a-form>
            </div>
          </a-tab-pane>
        </a-tabs>
      </a-card>
    </div>
  </div>
</template>

<style scoped>
.game-info-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.back-button {
  font-size: 16px;
  padding: 8px 16px;
  height: auto;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.game-summary-card {
  margin-bottom: 24px;
  overflow: hidden;
  border-radius: 16px;
}

.game-cover-section {
  margin: -24px -24px 0 -24px;
}

.game-cover-container {
  position: relative;
  width: 100%;
  height: 300px;
  overflow: hidden;
}

.game-cover-large {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.game-cover-large:hover {
  transform: scale(1.02);
}

.cover-gradient {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.8) 0%,
    rgba(0, 0, 0, 0.4) 50%,
    rgba(0, 0, 0, 0) 100%
  );
  padding: 32px 24px 24px 24px;
}

.cover-info {
  color: white;
}

.game-title {
  margin: 0 0 12px 0;
  font-size: 32px;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.game-badges {
  display: flex;
  gap: 8px;
}

.game-type-tag {
  background: rgba(24, 144, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
}

.game-meta-section {
  padding: 24px 0 0 0;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.meta-item:last-child {
  border-bottom: none;
}

.meta-label {
  font-weight: 600;
  color: #666;
  min-width: 100px;
}

.meta-value {
  color: #333;
  flex: 1;
  text-align: right;
  word-break: break-all;
}

.tab-content-card {
  min-height: 500px;
}

.info-content {
  padding: 16px 0;
}

.path-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.path-text {
  flex: 1;
  word-break: break-all;
}

.action-buttons {
  margin-top: 32px;
  text-align: center;
}

.edit-content {
  padding: 16px 0;
  max-width: 600px;
}

.form-help {
  margin-top: 8px;
}

.form-help p {
  margin: 0;
  color: #666;
  font-size: 12px;
}

.form-actions {
  margin-top: 32px;
  text-align: center;
}
</style>