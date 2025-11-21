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
      description: 'plugins scripts 加载器',
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
  // dinput8 不能取消选择
  if (key === 'dinput8') {
    return
  }

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

      // 如果 dinput8 未安装，确保它在选中列表中（且不能取消）
      if (!modStatus.value.dinput8) {
        if (!selectedComponents.value.includes('dinput8')) {
          selectedComponents.value.unshift('dinput8')
        }
      } else {
        // 如果 dinput8 已安装，从选中列表中移除
        const dinput8Index = selectedComponents.value.indexOf('dinput8')
        if (dinput8Index > -1) {
          selectedComponents.value.splice(dinput8Index, 1)
        }
      }
    } else {
      // 如果返回的状态无效，使用默认状态
      console.warn('检查 MOD 状态返回无效结果，使用默认状态')
      modStatus.value = {
        dinput8: false,
        cleo: false,
        cleo_redux: false,
        modloader: false
      }
      // 确保 dinput8 默认选中
      if (!selectedComponents.value.includes('dinput8')) {
        selectedComponents.value.unshift('dinput8')
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
    // 确保 dinput8 默认选中
    if (!selectedComponents.value.includes('dinput8')) {
      selectedComponents.value.unshift('dinput8')
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
  <div style="display: flex; flex-direction: column; gap: 24px;">
    <div>
      <h3 style="margin-bottom: 16px; font-size: 18px; font-weight: 600; color: #333;">
        前置安装
      </h3>
      <NGrid :cols="4" :x-gap="12" :y-gap="12">
        <NGridItem>
          <NCard :bordered="true" :style="{ borderColor: modStatus.dinput8 ? '#18a058' : '#d03050' }">
            <div style="text-align: center;">
              <div style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">dinput8.dll</div>
              <div style="font-size: 12px; color: #999; margin-bottom: 8px;">基础输入库</div>
              <NTag :type="modStatus.dinput8 ? 'success' : 'error'" size="small" style="margin-top: 8px;">
                {{ modStatus.dinput8 ? '已安装' : '缺少' }}
              </NTag>
            </div>
          </NCard>
        </NGridItem>

        <NGridItem>
          <NCard :bordered="true" :style="{ borderColor: modStatus.cleo ? '#18a058' : '#d03050' }">
            <div style="text-align: center;">
              <div style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">CLEO</div>
              <div style="font-size: 12px; color: #999; margin-bottom: 8px;">脚本执行引擎</div>
              <NTag :type="modStatus.cleo ? 'success' : 'error'" size="small" style="margin-top: 8px;">
                {{ modStatus.cleo ? '已安装' : '缺少' }}
              </NTag>
            </div>
          </NCard>
        </NGridItem>

        <NGridItem>
          <NCard :bordered="true" :style="{ borderColor: modStatus.cleo_redux ? '#18a058' : '#d03050' }">
            <div style="text-align: center;">
              <div style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">CLEO Redux</div>
              <div style="font-size: 12px; color: #999; margin-bottom: 8px;">现代脚本引擎</div>
              <NTag :type="modStatus.cleo_redux ? 'success' : 'error'" size="small" style="margin-top: 8px;">
                {{ modStatus.cleo_redux ? '已安装' : '缺少' }}
              </NTag>
            </div>
          </NCard>
        </NGridItem>

        <NGridItem>
          <NCard :bordered="true" :style="{ borderColor: modStatus.modloader ? '#18a058' : '#d03050' }">
            <div style="text-align: center;">
              <div style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">ModLoader</div>
              <div style="font-size: 12px; color: #999; margin-bottom: 8px;">MOD 加载器</div>
              <NTag :type="modStatus.modloader ? 'success' : 'error'" size="small" style="margin-top: 8px;">
                {{ modStatus.modloader ? '已安装' : '缺少' }}
              </NTag>
            </div>
          </NCard>
        </NGridItem>
      </NGrid>

      <NSpin v-if="isLoading" size="small" style="margin-top: 16px;">
        <template #description>检查 MOD 环境状态...</template>
      </NSpin>
    </div>

    <div v-if="!allComponentsInstalled">
      <NGrid :cols="1" :x-gap="12" :y-gap="12">
        <NGridItem v-for="component in availableComponents" :key="component.key">
          <NCard :bordered="true" :style="component.installed ? { opacity: 0.7 } : undefined">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <NCheckbox :checked="selectedComponents.includes(component.key)"
                @update:checked="toggleComponent(component.key)"
                :disabled="component.installed || component.key === 'dinput8'">
                <strong>{{ component.name }}</strong>
                <span v-if="component.key === 'dinput8'"
                  style="color: #999; font-size: 12px; margin-left: 4px;">(必需)</span>
              </NCheckbox>
              <NTag v-if="component.installed" type="success" size="small">已安装</NTag>
              <NTag v-else type="default" size="small">未安装</NTag>
            </div>
            <div style="color: #666; font-size: 13px; line-height: 1.5; margin-top: 8px;">
              {{ component.description }}
            </div>
          </NCard>
        </NGridItem>
      </NGrid>

      <div
        style="margin-top: 24px; padding: 16px; background: #fafafa; border-radius: 8px; display: flex; flex-direction: column; gap: 16px;">
        <div>
          <p style="margin: 0 0 8px 0; font-weight: 500; color: #333;">已选择 {{ selectedCount }} 个组件进行安装</p>
          <NSpace v-if="selectedCount > 0" size="small" style="margin-top: 8px;">
            <NTag v-for="key in selectedComponents" :key="key" type="info" size="small">
              {{ getComponentName(key) }}
            </NTag>
          </NSpace>
        </div>

        <div style="display: flex; justify-content: flex-end;">
          <NButton type="primary" :loading="isInstalling" :disabled="selectedCount === 0" @click="handleInstall">
            安装选中组件
          </NButton>
        </div>
      </div>
    </div>

    <NModal v-model:show="showResult" preset="card" title="安装结果" style="width: 600px">
      <div v-if="installResult" style="display: flex; flex-direction: column; gap: 16px;">
        <NResult :status="installResult.success ? 'success' : 'error'" :title="installResult.success ? '安装成功' : '安装失败'"
          :description="installResult.message" />

        <div v-if="installResult.details && installResult.details.length > 0" style="text-align: left;">
          <h4 style="margin-bottom: 12px; font-size: 14px; font-weight: 600;">详细信息：</h4>
          <div style="background: #fafafa; border-radius: 6px; padding: 12px;">
            <div v-for="(detail, index) in installResult.details" :key="index"
              :style="{ padding: '4px 0', fontSize: '13px', color: detail.includes('失败') ? '#d03050' : '#18a058' }">
              {{ detail }}
            </div>
          </div>
        </div>

        <div style="text-align: center;">
          <NButton type="primary" @click="closeResult">确定</NButton>
        </div>
      </div>
    </NModal>
  </div>
</template>