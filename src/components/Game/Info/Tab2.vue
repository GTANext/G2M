<script setup>
import { computed } from 'vue'
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import { useModPrerequisites } from '@/composables'

// Props
const props = defineProps({
  gameInfo: {
    type: Object,
    default: null
  }
})

// 使用 composable
const gameInfoRef = computed(() => props.gameInfo)

const {
  // 状态
  modStatus,
  modLoaderDetails,
  isLoading,
  selectedComponents,
  isInstalling,
  installResult,
  showResult,

  // 计算属性
  availableComponents,
  selectedCount,
  allComponentsInstalled,

  // 方法
  toggleComponent,
  getComponentName,
  getComponentLocation,
  loadModStatus,
  handleInstall,
  closeResult,
  handleManualSelect,
  handleUnmarkManual,
  isManualBinding,
  handleInstallSingle
} = useModPrerequisites(gameInfoRef)

// 获取安装选项
const getInstallOptions = (loaderType) => {
  return [
    {
      label: '自动安装',
      key: `auto_${loaderType}`
    },
    {
      label: '选择已安装',
      key: `manual_${loaderType}`
    }
  ]
}

// 处理安装选项选择
const handleInstallOptionSelect = (key) => {
  const [action, loaderType] = key.split('_', 2)
  if (action === 'auto') {
    handleInstallSingle(loaderType)
  } else if (action === 'manual') {
    handleManualSelect(loaderType)
  }
}
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 24px;">
    <div>
      <h3 style="margin-bottom: 16px; font-size: 18px; font-weight: 600; color: #333;">
        前置安装
      </h3>
      <NGrid :cols="4" :x-gap="12" :y-gap="12">
        <NGridItem>
          <NPopover v-if="modStatus.dinput8 && getComponentLocation('dinput8')" trigger="hover" placement="top">
            <template #trigger>
              <NCard :bordered="true"
                :style="{ borderColor: modStatus.dinput8 ? '#18a058' : '#d03050', cursor: modStatus.dinput8 ? 'pointer' : 'default' }">
                <div style="text-align: center;">
                  <div style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">dinput8.dll</div>
                  <div style="font-size: 12px; color: #999; margin-bottom: 8px;">基础输入库</div>
                  <div
                    style="margin: 15px 0px 8px 0px; display: flex; align-items: center; justify-content: center; gap: 4px; flex-wrap: wrap;">
                    <NTag v-if="modStatus.dinput8" type="success" size="small">
                      已安装
                    </NTag>
                    <NTag v-if="modStatus.dinput8 && isManualBinding('dinput8')" type="warning" size="small">
                      自定义
                    </NTag>
                    <NTag v-if="modStatus.dinput8" type="default" size="small" style="cursor: pointer;"
                      @click.stop="handleManualSelect('dinput8')">
                      手动选择
                    </NTag>
                  </div>
                  <div v-if="!modStatus.dinput8" style="margin-top: 8px;">
                    <NDropdown trigger="click" :options="getInstallOptions('dinput8')"
                      @select="handleInstallOptionSelect">
                      <NButton size="small" type="primary" @click.stop>
                        立即安装
                      </NButton>
                    </NDropdown>
                  </div>
                </div>
              </NCard>
            </template>
            <div style="max-width: 300px;">
              <div style="font-weight: 600; margin-bottom: 8px;">安装信息</div>
              <div style="font-size: 13px; color: #666; line-height: 1.6;">
                {{ getComponentLocation('dinput8') }}
              </div>
            </div>
          </NPopover>
          <NCard v-else :bordered="true" :style="{ borderColor: modStatus.dinput8 ? '#18a058' : '#d03050' }">
            <div style="text-align: center;">
              <div style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">dinput8.dll</div>
              <div style="font-size: 12px; color: #999; margin-bottom: 8px;">基础输入库</div>
              <div
                style="margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 4px; flex-wrap: wrap;">
                <NTag v-if="modStatus.dinput8" type="success" size="small">
                  已安装
                </NTag>
                <NTag v-if="modStatus.dinput8 && isManualBinding('dinput8')" type="warning" size="small">
                  自定义
                </NTag>
                <NTag v-if="modStatus.dinput8" type="default" size="small" style="cursor: pointer;"
                  @click="handleManualSelect('dinput8')">
                  手动选择
                </NTag>
              </div>
              <div v-if="!modStatus.dinput8" style="margin-top: 8px;">
                <NDropdown trigger="click" :options="getInstallOptions('dinput8')" @select="handleInstallOptionSelect">
                  <NButton size="small" type="primary">
                    立即安装
                  </NButton>
                </NDropdown>
              </div>
            </div>
          </NCard>
        </NGridItem>

        <NGridItem>
          <NPopover v-if="modStatus.cleo && getComponentLocation('cleo')" trigger="hover" placement="top">
            <template #trigger>
              <NCard :bordered="true"
                :style="{ borderColor: modStatus.cleo ? '#18a058' : '#d03050', cursor: modStatus.cleo ? 'pointer' : 'default' }">
                <div style="text-align: center;">
                  <div style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">CLEO</div>
                  <div style="font-size: 12px; color: #999; margin-bottom: 8px;">脚本执行引擎</div>
                  <div
                    style="margin: 15px 0px 8px 0px; display: flex; align-items: center; justify-content: center; gap: 4px; flex-wrap: wrap;">
                    <NTag v-if="modStatus.cleo" type="success" size="small">
                      已安装
                    </NTag>
                    <NTag v-if="modStatus.cleo && isManualBinding('cleo')" type="warning" size="small">
                      自定义
                    </NTag>
                    <NTag v-if="modStatus.cleo" type="default" size="small" style="cursor: pointer;"
                      @click.stop="handleManualSelect('cleo')">
                      手动选择
                    </NTag>
                  </div>
                  <div v-if="!modStatus.cleo" style="margin-top: 8px;">
                    <NDropdown trigger="click" :options="getInstallOptions('cleo')" @select="handleInstallOptionSelect">
                      <NButton size="small" type="primary" @click.stop>
                        立即安装
                      </NButton>
                    </NDropdown>
                  </div>
                </div>
              </NCard>
            </template>
            <div style="max-width: 300px;">
              <div style="font-weight: 600; margin-bottom: 8px;">安装信息</div>
              <div style="font-size: 13px; color: #666; line-height: 1.6;">
                {{ getComponentLocation('cleo') }}
              </div>
            </div>
          </NPopover>
          <NCard v-else :bordered="true" :style="{ borderColor: modStatus.cleo ? '#18a058' : '#d03050' }">
            <div style="text-align: center;">
              <div style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">CLEO</div>
              <div style="font-size: 12px; color: #999; margin-bottom: 8px;">脚本执行引擎</div>
              <div
                style="margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 4px; flex-wrap: wrap;">
                <NTag v-if="modStatus.cleo" type="success" size="small">
                  已安装
                </NTag>
                <NTag v-if="modStatus.cleo && isManualBinding('cleo')" type="warning" size="small">
                  自定义
                </NTag>
                <NTag v-if="modStatus.cleo" type="default" size="small" style="cursor: pointer;"
                  @click="handleManualSelect('cleo')">
                  手动选择
                </NTag>
              </div>
              <div v-if="!modStatus.cleo" style="margin-top: 8px;">
                <NDropdown trigger="click" :options="getInstallOptions('cleo')" @select="handleInstallOptionSelect">
                  <NButton size="small" type="primary">
                    立即安装
                  </NButton>
                </NDropdown>
              </div>
            </div>
          </NCard>
        </NGridItem>

        <NGridItem>
          <NPopover v-if="modStatus.cleo_redux && getComponentLocation('cleo_redux')" trigger="hover" placement="top">
            <template #trigger>
              <NCard :bordered="true"
                :style="{ borderColor: modStatus.cleo_redux ? '#18a058' : '#d03050', cursor: modStatus.cleo_redux ? 'pointer' : 'default' }">
                <div style="text-align: center;">
                  <div style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">CLEO Redux</div>
                  <div style="font-size: 12px; color: #999; margin-bottom: 8px;">现代脚本引擎</div>
                  <div
                    style="margin: 15px 0px 8px 0px; display: flex; align-items: center; justify-content: center; gap: 4px; flex-wrap: wrap;">
                    <NTag v-if="modStatus.cleo_redux" type="success" size="small">
                      已安装
                    </NTag>
                    <NTag v-if="modStatus.cleo_redux && isManualBinding('cleo_redux')" type="warning" size="small">
                      自定义
                    </NTag>
                    <NTag v-if="modStatus.cleo_redux" type="default" size="small" style="cursor: pointer;"
                      @click.stop="handleManualSelect('cleo_redux')">
                      手动选择
                    </NTag>
                  </div>
                  <div v-if="!modStatus.cleo_redux" style="margin-top: 8px;">
                    <NDropdown trigger="click" :options="getInstallOptions('cleo_redux')"
                      @select="handleInstallOptionSelect">
                      <NButton size="small" type="primary" @click.stop>
                        立即安装
                      </NButton>
                    </NDropdown>
                  </div>
                </div>
              </NCard>
            </template>
            <div style="max-width: 300px;">
              <div style="font-weight: 600; margin-bottom: 8px;">安装信息</div>
              <div style="font-size: 13px; color: #666; line-height: 1.6;">
                {{ getComponentLocation('cleo_redux') }}
              </div>
            </div>
          </NPopover>
          <NCard v-else :bordered="true" :style="{ borderColor: modStatus.cleo_redux ? '#18a058' : '#d03050' }">
            <div style="text-align: center;">
              <div style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">CLEO Redux</div>
              <div style="font-size: 12px; color: #999; margin-bottom: 8px;">现代脚本引擎</div>
              <div
                style="margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 4px; flex-wrap: wrap;">
                <NTag v-if="modStatus.cleo_redux" type="success" size="small">
                  已安装
                </NTag>
                <NTag v-if="modStatus.cleo_redux && isManualBinding('cleo_redux')" type="warning" size="small">
                  自定义
                </NTag>
                <NTag v-if="modStatus.cleo_redux" type="default" size="small" style="cursor: pointer;"
                  @click="handleManualSelect('cleo_redux')">
                  手动选择
                </NTag>
              </div>
              <div v-if="!modStatus.cleo_redux" style="margin-top: 8px;">
                <NDropdown trigger="click" :options="getInstallOptions('cleo_redux')"
                  @select="handleInstallOptionSelect">
                  <NButton size="small" type="primary">
                    立即安装
                  </NButton>
                </NDropdown>
              </div>
            </div>
          </NCard>
        </NGridItem>

        <NGridItem>
          <NPopover v-if="modStatus.modloader && getComponentLocation('modloader')" trigger="hover" placement="top">
            <template #trigger>
              <NCard :bordered="true"
                :style="{ borderColor: modStatus.modloader ? '#18a058' : '#d03050', cursor: modStatus.modloader ? 'pointer' : 'default' }">
                <div style="text-align: center;">
                  <div style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">ModLoader</div>
                  <div style="font-size: 12px; color: #999; margin-bottom: 8px;">MOD 加载器</div>
                  <div
                    style="margin: 15px 0px 8px 0px; display: flex; align-items: center; justify-content: center; gap: 4px; flex-wrap: wrap;">
                    <NTag v-if="modStatus.modloader" type="success" size="small">
                      已安装
                    </NTag>
                    <NTag v-if="modStatus.modloader && isManualBinding('modloader')" type="warning" size="small">
                      自定义
                    </NTag>
                    <NTag v-if="modStatus.modloader" type="default" size="small" style="cursor: pointer;"
                      @click.stop="handleManualSelect('modloader')">
                      手动选择
                    </NTag>
                  </div>
                  <div v-if="!modStatus.modloader" style="margin-top: 8px;">
                    <NDropdown trigger="click" :options="getInstallOptions('modloader')"
                      @select="handleInstallOptionSelect">
                      <NButton size="small" type="primary" @click.stop>
                        立即安装
                      </NButton>
                    </NDropdown>
                  </div>
                </div>
              </NCard>
            </template>
            <div style="max-width: 300px;">
              <div style="font-weight: 600; margin-bottom: 8px;">安装信息</div>
              <div style="font-size: 13px; color: #666; line-height: 1.6;">
                <template v-if="Array.isArray(getComponentLocation('modloader'))">
                  <div v-for="(location, index) in getComponentLocation('modloader')" :key="index"
                    style="margin-bottom: 4px;">
                    {{ location }}
                  </div>
                </template>
                <template v-else>
                  {{ getComponentLocation('modloader') }}
                </template>
              </div>
            </div>
          </NPopover>
          <NCard v-else :bordered="true" :style="{ borderColor: modStatus.modloader ? '#18a058' : '#d03050' }">
            <div style="text-align: center;">
              <div style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">ModLoader</div>
              <div style="font-size: 12px; color: #999; margin-bottom: 8px;">MOD 加载器</div>
              <div
                style="margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 4px; flex-wrap: wrap;">
                <NTag v-if="modStatus.modloader" type="success" size="small">
                  已安装
                </NTag>
                <NTag v-if="modStatus.modloader && isManualBinding('modloader')" type="warning" size="small">
                  自定义
                </NTag>
                <NTag v-if="modStatus.modloader" type="default" size="small" style="cursor: pointer;"
                  @click="handleManualSelect('modloader')">
                  手动选择
                </NTag>
              </div>
              <div v-if="!modStatus.modloader" style="margin-top: 8px;">
                <NDropdown trigger="click" :options="getInstallOptions('modloader')"
                  @select="handleInstallOptionSelect">
                  <NButton size="small" type="primary">
                    立即安装
                  </NButton>
                </NDropdown>
              </div>
            </div>
          </NCard>
        </NGridItem>
      </NGrid>

      <NSpin v-if="isLoading" size="small" style="margin-top: 16px;">
        <template #description>检查 MOD 环境状态...</template>
      </NSpin>
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
