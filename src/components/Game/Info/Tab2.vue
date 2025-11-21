<script setup>
import { useGameInfo } from '@/composables/game/useGameInfo'

// Props
const props = defineProps({
  gameInfo: {
    type: Object,
    default: null
  }
})

// Composables
const { checkModLoaders, installModPrerequisitesMethod } = useGameInfo()

// Reactive state
const modStatus = ref({
  dinput8: false,
  cleo: false,
  cleo_redux: false,
  modloader: false
})

const isLoading = ref(false)
const selectedComponents = ref([])
const isInstalling = ref(false)
const installResult = ref(null)
const showResult = ref(false)

// 根据游戏类型定义可用组件
const availableComponents = computed(() => {
  if (!props.gameInfo) return []

  const gameType = props.gameInfo.type
  const components = [
    {
      key: 'dinput8',
      name: 'dinput8.dll',
      description: '基础输入库，大多数 MOD 的必需组件',
      installed: modStatus.value.dinput8
    }
  ]

  // 根据游戏类型添加 CLEO 相关组件
  if (['gta3', 'gtavc', 'gtasa'].includes(gameType)) {
    components.push({
      key: 'cleo',
      name: 'CLEO',
      description: '经典脚本执行引擎，支持 .cs 脚本文件',
      installed: modStatus.value.cleo
    })
  }

  // CLEO Redux
  components.push({
    key: 'cleo_redux',
    name: 'CLEO Redux',
    description: '现代脚本引擎，支持 JavaScript 和其他现代脚本语言',
    installed: modStatus.value.cleo_redux
  })

  // ModLoader
  components.push({
    key: 'modloader',
    name: 'ModLoader',
    description: 'MOD 加载器，用于加载 .dff、.txd 等资源文件',
    installed: modStatus.value.modloader
  })

  return components
})

// 计算选中组件数量
const selectedCount = computed(() => selectedComponents.value.length)

// 计算是否所有组件都已安装
const allComponentsInstalled = computed(() => {
  return availableComponents.value.length > 0 &&
    availableComponents.value.every(component => component.installed)
})

// 方法
const toggleComponent = (key) => {
  const index = selectedComponents.value.indexOf(key)
  if (index > -1) {
    selectedComponents.value.splice(index, 1)
  } else {
    selectedComponents.value.push(key)
  }
}

const getComponentName = (key) => {
  const component = availableComponents.value.find(c => c.key === key)
  return component ? component.name : key
}

const loadModStatus = async () => {
  console.log('loadModStatus 调用，gameInfo:', props.gameInfo)

  if (!props.gameInfo || !props.gameInfo.dir) {
    console.warn('游戏信息或目录为空，无法检查 MOD 状态', {
      gameInfo: props.gameInfo,
      hasGameInfo: !!props.gameInfo,
      hasDir: props.gameInfo?.dir
    })
    return
  }

  isLoading.value = true
  try {
    console.log('开始检查 MOD 状态，游戏目录:', props.gameInfo.dir)
    const status = await checkModLoaders(props.gameInfo.dir)

    // 确保 status 是一个有效对象
    if (status && typeof status === 'object') {
      modStatus.value = {
        dinput8: status.dinput8 || false,
        cleo: status.cleo || false,
        cleo_redux: status.cleo_redux || false,
        modloader: status.modloader || false
      }

      // 根据安装状态更新 selectedComponents，移除已安装的组件
      selectedComponents.value = selectedComponents.value.filter(key => {
        const isInstalled = modStatus.value[key] === true
        if (isInstalled) {
          console.log(`组件 ${key} 已安装，从选择列表中移除`)
        }
        return !isInstalled
      })
    } else {
      // 如果返回的状态无效，使用默认状态
      console.warn('检查 MOD 状态返回无效结果，使用默认状态')
      modStatus.value = {
        dinput8: false,
        cleo: false,
        cleo_redux: false,
        modloader: false
      }
    }
  } catch (error) {
    console.error('检查 MOD 状态失败:', error)
    // 出错时设置默认状态
    modStatus.value = {
      dinput8: false,
      cleo: false,
      cleo_redux: false,
      modloader: false
    }
  } finally {
    isLoading.value = false
  }
}

const handleInstall = async () => {
  if (!props.gameInfo || selectedComponents.value.length === 0) return

  console.log('开始安装 MOD 前置，参数:', {
    game_path: props.gameInfo.dir,
    game_type: props.gameInfo.type,
    components: selectedComponents.value
  })

  isInstalling.value = true
  try {
    const result = await installModPrerequisitesMethod({
      game_path: props.gameInfo.dir,
      game_type: props.gameInfo.type,
      components: selectedComponents.value
    })

    installResult.value = result
    showResult.value = true

    // 安装完成后重新检查状态
    // loadModStatus 会自动从 selectedComponents 中移除已安装的组件
    if (result.success) {
      await loadModStatus()
    }
  } catch (error) {
    console.error('安装失败:', error)
    installResult.value = {
      success: false,
      message: '安装过程中发生错误',
      details: [error.message || '未知错误']
    }
    showResult.value = true
  } finally {
    isInstalling.value = false
  }
}

const closeResult = () => {
  showResult.value = false
  installResult.value = null
}

// 监听游戏信息变化
watch(() => props.gameInfo, (newGameInfo) => {
  if (newGameInfo) {
    loadModStatus()
  }
}, { immediate: true })

// 组件挂载时加载状态
onMounted(() => {
  console.log('Tab2 组件挂载，gameInfo:', props.gameInfo)
  if (props.gameInfo) {
    console.log('gameInfo 存在，开始加载 MOD 状态')
    loadModStatus()
  } else {
    console.log('gameInfo 不存在，等待数据传入')
  }
})
</script>

<template>
  <div class="mod-installer">
    <!-- MOD 环境状态概览 -->
    <div class="status-overview">
      <h3>前置安装</h3>
      <div class="status-grid">
        <div class="status-item" :class="{ 'status-ok': modStatus.dinput8, 'status-missing': !modStatus.dinput8 }">
          <div class="status-icon">
            <i class="fas fa-cog"></i>
          </div>
          <div class="status-content">
            <div class="status-title">dinput8.dll</div>
            <div class="status-desc">基础输入库</div>
            <div class="status-badge">
              <span v-if="modStatus.dinput8" class="badge-ok">已安装</span>
              <span v-else class="badge-missing">缺少</span>
            </div>
          </div>
        </div>

        <div class="status-item" :class="{ 'status-ok': modStatus.cleo, 'status-missing': !modStatus.cleo }">
          <div class="status-icon">
            <i class="fas fa-code"></i>
          </div>
          <div class="status-content">
            <div class="status-title">CLEO</div>
            <div class="status-desc">脚本执行引擎</div>
            <div class="status-badge">
              <span v-if="modStatus.cleo" class="badge-ok">已安装</span>
              <span v-else class="badge-missing">缺少</span>
            </div>
          </div>
        </div>

        <div class="status-item"
          :class="{ 'status-ok': modStatus.cleo_redux, 'status-missing': !modStatus.cleo_redux }">
          <div class="status-icon">
            <i class="fas fa-rocket"></i>
          </div>
          <div class="status-content">
            <div class="status-title">CLEO Redux</div>
            <div class="status-desc">现代脚本引擎</div>
            <div class="status-badge">
              <span v-if="modStatus.cleo_redux" class="badge-ok">已安装</span>
              <span v-else class="badge-missing">缺少</span>
            </div>
          </div>
        </div>

        <div class="status-item" :class="{ 'status-ok': modStatus.modloader, 'status-missing': !modStatus.modloader }">
          <div class="status-icon">
            <i class="fas fa-puzzle-piece"></i>
          </div>
          <div class="status-content">
            <div class="status-title">ModLoader</div>
            <div class="status-desc">MOD 加载器</div>
            <div class="status-badge">
              <span v-if="modStatus.modloader" class="badge-ok">已安装</span>
              <span v-else class="badge-missing">缺少</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="loading-status">
        <a-spin size="small" />
        <span>检查 MOD 环境状态...</span>
      </div>
    </div>

    <!-- MOD 组件选择 -->
    <div v-if="!allComponentsInstalled" class="component-selection">
      <h4>选择要安装的组件</h4>
      <div class="component-list">
        <div v-for="component in availableComponents" :key="component.key" class="component-card" :class="{
          'installed': component.installed,
          'selected': selectedComponents.includes(component.key)
        }">
          <div class="component-header">
            <a-checkbox :checked="selectedComponents.includes(component.key)" @change="toggleComponent(component.key)"
              :disabled="component.installed">
              <strong>{{ component.name }}</strong>
            </a-checkbox>
            <div class="component-status">
              <a-tag v-if="component.installed" color="success">已安装</a-tag>
              <a-tag v-else color="default">未安装</a-tag>
            </div>
          </div>
          <div class="component-description">
            {{ component.description }}
          </div>
        </div>
      </div>

      <div class="install-actions">
        <div class="install-summary">
          <p>已选择 {{ selectedCount }} 个组件进行安装</p>
          <div v-if="selectedCount > 0" class="selected-components">
            <a-tag v-for="key in selectedComponents" :key="key" color="blue">
              {{ getComponentName(key) }}
            </a-tag>
          </div>
        </div>

        <div class="install-buttons">
          <a-button type="primary" :loading="isInstalling" :disabled="selectedCount === 0" @click="handleInstall">
            <template #icon>
              <i class="fas fa-download"></i>
            </template>
            安装选中组件
          </a-button>
        </div>
      </div>
    </div>

    <!-- 安装结果模态框 -->
    <a-modal v-model:open="showResult" title="安装结果" :footer="null" width="600px">
      <div v-if="installResult" class="install-result">
        <div class="result-header">
          <a-result :status="installResult.success ? 'success' : 'error'"
            :title="installResult.success ? '安装成功' : '安装失败'" :sub-title="installResult.message" />
        </div>

        <div v-if="installResult.details && installResult.details.length > 0" class="result-details">
          <h4>详细信息：</h4>
          <div class="detail-list">
            <div v-for="(detail, index) in installResult.details" :key="index" class="detail-item"
              :class="{ 'success': detail.includes('成功'), 'error': detail.includes('失败') }">
              <i class="fas" :class="detail.includes('成功') ? 'fa-check-circle' : 'fa-times-circle'"></i>
              {{ detail }}
            </div>
          </div>
        </div>

        <div class="result-actions">
          <a-button type="primary" @click="closeResult">
            确定
          </a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.mod-installer {
  padding: 16px;
}

.status-overview {
  margin-bottom: 24px;
}

.status-overview h3 {
  margin-bottom: 16px;
  color: #1890ff;
  font-size: 18px;
  font-weight: 600;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.status-item.status-ok {
  background-color: #f6ffed;
  border-color: #b7eb8f;
}

.status-item.status-missing {
  background-color: #fff2f0;
  border-color: #ffccc7;
}

.status-icon {
  font-size: 24px;
  margin-right: 12px;
  width: 32px;
  text-align: center;
}

.status-ok .status-icon {
  color: #52c41a;
}

.status-missing .status-icon {
  color: #ff4d4f;
}

.status-content {
  flex: 1;
}

.status-title {
  font-weight: 600;
  margin-bottom: 2px;
}

.status-desc {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.status-badge {
  margin-top: 4px;
}

.badge-ok {
  color: #52c41a;
  background-color: #f6ffed;
  border: 1px solid #b7eb8f;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.badge-missing {
  color: #ff4d4f;
  background-color: #fff2f0;
  border: 1px solid #ffccc7;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.loading-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 14px;
}

.component-selection h4 {
  margin-bottom: 16px;
  color: #262626;
  font-size: 16px;
}

.component-list {
  margin-bottom: 16px;
}

.component-card {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
}

.component-card:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
}

.component-card.installed {
  background-color: #f6ffed;
  border-color: #b7eb8f;
}

.component-card.selected {
  border-color: #1890ff;
  background-color: #f0f9ff;
}

.component-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.component-description {
  color: #666;
  font-size: 13px;
  line-height: 1.4;
  margin-left: 24px;
}

.install-actions {
  padding: 16px;
  background-color: #fafafa;
  border-radius: 6px;
}

.install-summary {
  margin-bottom: 16px;
}

.install-summary p {
  margin-bottom: 8px;
  font-weight: 500;
}

.selected-components {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.install-buttons {
  display: flex;
  justify-content: flex-end;
}

.install-result {
  text-align: center;
}

.result-details {
  margin-top: 16px;
  text-align: left;
}

.result-details h4 {
  margin-bottom: 12px;
  color: #262626;
}

.detail-list {
  background-color: #fafafa;
  border-radius: 6px;
  padding: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 14px;
}

.detail-item.success {
  color: #52c41a;
}

.detail-item.error {
  color: #ff4d4f;
}

.result-actions {
  margin-top: 16px;
}
</style>