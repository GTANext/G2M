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
  isManualBinding
} = useModPrerequisites(gameInfoRef)
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
                  <div style="display: flex; align-items: center; justify-content: center; gap: 4px; margin-top: 8px;">
                    <NTag :type="modStatus.dinput8 ? 'success' : 'error'" size="small">
                      {{ modStatus.dinput8 ? '已安装' : '缺少' }}
                    </NTag>
                    <NTag v-if="modStatus.dinput8 && isManualBinding('dinput8')" type="warning" size="small">
                      自定义
                    </NTag>
                  </div>
                  <div v-if="modStatus.dinput8 && isManualBinding('dinput8')" style="margin-top: 8px;">
                    <a-typography-link type="secondary" @click="handleUnmarkManual('dinput8')" style="font-size: 12px;">
                      取消选择
                    </a-typography-link>
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
              <NTag :type="modStatus.dinput8 ? 'success' : 'error'" size="small" style="margin-top: 8px;">
                {{ modStatus.dinput8 ? '已安装' : '缺少' }}
              </NTag>
              <div v-if="!modStatus.dinput8"
                style="margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 4px;">
                <a-typography-link type="secondary" @click="handleManualSelect('dinput8')" style="font-size: 12px;">
                  手动选择
                </a-typography-link>
                <a-tooltip title="如果您的文件使用了自定义名称（如 kfc.asi），可以点击此链接选择文件并绑定到此前置插件">
                  <InfoCircleOutlined style="font-size: 12px; color: #999; cursor: help;" />
                </a-tooltip>
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
                  <div style="display: flex; align-items: center; justify-content: center; gap: 4px; margin-top: 8px;">
                    <NTag :type="modStatus.cleo ? 'success' : 'error'" size="small">
                      {{ modStatus.cleo ? '已安装' : '缺少' }}
                    </NTag>
                    <NTag v-if="modStatus.cleo && isManualBinding('cleo')" type="warning" size="small">
                      自定义
                    </NTag>
                  </div>
                  <div v-if="modStatus.cleo && isManualBinding('cleo')" style="margin-top: 8px;">
                    <a-typography-link type="secondary" @click="handleUnmarkManual('cleo')" style="font-size: 12px;">
                      取消选择
                    </a-typography-link>
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
              <NTag :type="modStatus.cleo ? 'success' : 'error'" size="small" style="margin-top: 8px;">
                {{ modStatus.cleo ? '已安装' : '缺少' }}
              </NTag>
              <div v-if="!modStatus.cleo"
                style="margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 4px;">
                <a-typography-link type="secondary" @click="handleManualSelect('cleo')" style="font-size: 12px;">
                  手动选择
                </a-typography-link>
                <a-tooltip title="如果您的文件使用了自定义名称（如 kfc.asi），可以点击此链接选择文件并绑定到此前置插件">
                  <InfoCircleOutlined style="font-size: 12px; color: #999; cursor: help;" />
                </a-tooltip>
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
                  <div style="display: flex; align-items: center; justify-content: center; gap: 4px; margin-top: 8px;">
                    <NTag :type="modStatus.cleo_redux ? 'success' : 'error'" size="small">
                      {{ modStatus.cleo_redux ? '已安装' : '缺少' }}
                    </NTag>
                    <NTag v-if="modStatus.cleo_redux && isManualBinding('cleo_redux')" type="warning" size="small">
                      自定义
                    </NTag>
                  </div>
                  <div v-if="modStatus.cleo_redux && isManualBinding('cleo_redux')" style="margin-top: 8px;">
                    <a-typography-link type="secondary" @click="handleUnmarkManual('cleo_redux')"
                      style="font-size: 12px;">
                      取消选择
                    </a-typography-link>
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
              <NTag :type="modStatus.cleo_redux ? 'success' : 'error'" size="small" style="margin-top: 8px;">
                {{ modStatus.cleo_redux ? '已安装' : '缺少' }}
              </NTag>
              <div v-if="!modStatus.cleo_redux"
                style="margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 4px;">
                <a-typography-link type="secondary" @click="handleManualSelect('cleo_redux')" style="font-size: 12px;">
                  手动选择
                </a-typography-link>
                <a-tooltip title="如果您的文件使用了自定义名称（如 kfc.asi），可以点击此链接选择文件并绑定到此前置插件">
                  <InfoCircleOutlined style="font-size: 12px; color: #999; cursor: help;" />
                </a-tooltip>
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
                  <div style="display: flex; align-items: center; justify-content: center; gap: 4px; margin-top: 8px;">
                    <NTag :type="modStatus.modloader ? 'success' : 'error'" size="small">
                      {{ modStatus.modloader ? '已安装' : '缺少' }}
                    </NTag>
                    <NTag v-if="modStatus.modloader && isManualBinding('modloader')" type="warning" size="small">
                      自定义
                    </NTag>
                  </div>
                  <div v-if="modStatus.modloader && isManualBinding('modloader')" style="margin-top: 8px;">
                    <a-typography-link type="secondary" @click="handleUnmarkManual('modloader')"
                      style="font-size: 12px;">
                      取消选择
                    </a-typography-link>
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
              <NTag :type="modStatus.modloader ? 'success' : 'error'" size="small" style="margin-top: 8px;">
                {{ modStatus.modloader ? '已安装' : '缺少' }}
              </NTag>
              <div v-if="!modStatus.modloader"
                style="margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 4px;">
                <a-typography-link type="secondary" @click="handleManualSelect('modloader')" style="font-size: 12px;">
                  手动选择
                </a-typography-link>
                <a-tooltip title="如果您的文件使用了自定义名称（如 kfc.asi），可以点击此链接选择文件并绑定到此前置插件">
                  <InfoCircleOutlined style="font-size: 12px; color: #999; cursor: help;" />
                </a-tooltip>
              </div>
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
            <div style="color: #666; font-size: 13px; line-height: 1.5; margin-top: 8px; margin-bottom: 8px;">
              {{ component.description }}
            </div>
            <div v-if="!component.installed" style="display: flex; justify-content: flex-end; margin-top: 8px;">
              <NButton size="small" @click="handleManualSelect(component.key)">
                手动选择文件
              </NButton>
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