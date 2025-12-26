<script setup>
import { useGameInfo } from '~/composables/game/useGameInfo'
import { useModPrerequisites } from '~/composables/game/useModPrerequisites'
import { CheckCircle2, XCircle, Download, Settings, Info } from 'lucide-vue-next'

const route = useRoute()
const gameId = computed(() => route.params.id)

const { gameData, loadGameInfo } = useGameInfo(gameId)
const gameInfoRef = computed(() => gameData.value)

const {
    // 状态
    modStatus,
    modLoaderDetails,
    isLoading,
    selectedComponents,
    isInstalling,
    installResult,
    showResult,
    customPrerequisites,
    showCustomPrerequisiteDialog,
    customPrerequisiteForm,
    selectingCustomPrerequisiteFiles,
    availableTargetDirs,

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
    handleInstallSingle,
    closeResult,
    handleManualSelect,
    handleUnmarkManual,
    isManualBinding,
    loadCustomPrerequisites,
    selectCustomPrerequisiteFiles,
    handleInstallCustomPrerequisite,
    handleDeleteCustomPrerequisite,
    getCustomPrerequisiteStatus
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

// 组件描述映射
const componentDescriptions = {
    dinput8: '基础输入库，ASI 插件加载器',
    cleo: '经典脚本执行引擎，支持 .cs 脚本文件',
    cleo_redux: '现代脚本引擎，支持 JavaScript 和其他现代脚本语言',
    modloader: 'MOD 加载器，用于加载 .dff、.txd 等资源文件'
}

// 加载数据
onMounted(async () => {
    if (gameId.value) {
        await loadGameInfo()
        if (gameData.value?.dir) {
            await loadModStatus()
            await loadCustomPrerequisites()
        }
    }
})
</script>

<template>
    <div class="space-y-6">
        <!-- 标题 -->
        <div>
            <h2 class="text-2xl font-bold mb-2">前置安装</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
                安装必要的 MOD 加载器和前置组件，以便游戏能够正常运行 MOD
            </p>
        </div>

        <!-- 加载状态 -->
        <NSpin v-if="isLoading" size="large">
            <template #description>正在检查 MOD 环境状态...</template>
        </NSpin>

        <!-- 前置组件列表 -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- dinput8.dll -->
            <UCard>
                <div class="text-center space-y-3">
                    <div class="font-semibold text-base">dinput8.dll</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                        {{ componentDescriptions.dinput8 }}
                    </div>

                    <div class="flex items-center justify-center gap-2 flex-wrap">
                        <NTag v-if="modStatus.dinput8" type="success" size="small">
                            <CheckCircle2 class="w-3 h-3 mr-1" />
                            已安装
                        </NTag>
                        <NTag v-if="modStatus.dinput8 && isManualBinding('dinput8')" type="warning" size="small">
                            <Settings class="w-3 h-3 mr-1" />
                            自定义
                        </NTag>
                        <NTag v-if="modStatus.dinput8 && isManualBinding('dinput8')" type="default" size="small"
                            class="cursor-pointer" @click="handleUnmarkManual('dinput8')">
                            取消选择
                        </NTag>
                        <NTag v-if="modStatus.dinput8 && !isManualBinding('dinput8')" type="default" size="small"
                            class="cursor-pointer" @click="handleManualSelect('dinput8')">
                            手动选择
                        </NTag>
                    </div>

                    <div v-if="!modStatus.dinput8" class="pt-2">
                        <NDropdown trigger="click" :options="getInstallOptions('dinput8')"
                            @select="handleInstallOptionSelect">
                            <NButton size="small" type="primary" :loading="isInstalling">
                                <Download class="w-4 h-4 mr-1" />
                                立即安装
                            </NButton>
                        </NDropdown>
                    </div>

                    <!-- 安装位置信息 -->
                    <div v-if="modStatus.dinput8 && getComponentLocation('dinput8')" class="pt-2">
                        <NTooltip trigger="hover" placement="top">
                            <template #trigger>
                                <Info class="w-4 h-4 text-gray-400 mx-auto cursor-help" />
                            </template>
                            <div class="max-w-xs">
                                <div class="font-semibold mb-1">安装位置</div>
                                <div class="text-xs text-gray-600 dark:text-gray-400">
                                    {{ getComponentLocation('dinput8') }}
                                </div>
                            </div>
                        </NTooltip>
                    </div>
                </div>
            </UCard>

            <!-- CLEO -->
            <UCard v-if="availableComponents.find(c => c.key === 'cleo')">
                <div class="text-center space-y-3">
                    <div class="font-semibold text-base">CLEO</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                        {{ componentDescriptions.cleo }}
                    </div>

                    <div class="flex items-center justify-center gap-2 flex-wrap">
                        <NTag v-if="modStatus.cleo" type="success" size="small">
                            <CheckCircle2 class="w-3 h-3 mr-1" />
                            已安装
                        </NTag>
                        <NTag v-if="modStatus.cleo && isManualBinding('cleo')" type="warning" size="small">
                            <Settings class="w-3 h-3 mr-1" />
                            自定义
                        </NTag>
                        <NTag v-if="modStatus.cleo && isManualBinding('cleo')" type="default" size="small"
                            class="cursor-pointer" @click="handleUnmarkManual('cleo')">
                            取消选择
                        </NTag>
                        <NTag v-if="modStatus.cleo && !isManualBinding('cleo')" type="default" size="small"
                            class="cursor-pointer" @click="handleManualSelect('cleo')">
                            手动选择
                        </NTag>
                    </div>

                    <div v-if="!modStatus.cleo" class="pt-2">
                        <NDropdown trigger="click" :options="getInstallOptions('cleo')"
                            @select="handleInstallOptionSelect">
                            <NButton size="small" type="primary" :loading="isInstalling">
                                <Download class="w-4 h-4 mr-1" />
                                立即安装
                            </NButton>
                        </NDropdown>
                    </div>

                    <div v-if="modStatus.cleo && getComponentLocation('cleo')" class="pt-2">
                        <NTooltip trigger="hover" placement="top">
                            <template #trigger>
                                <Info class="w-4 h-4 text-gray-400 mx-auto cursor-help" />
                            </template>
                            <div class="max-w-xs">
                                <div class="font-semibold mb-1">安装位置</div>
                                <div class="text-xs text-gray-600 dark:text-gray-400">
                                    {{ getComponentLocation('cleo') }}
                                </div>
                            </div>
                        </NTooltip>
                    </div>
                </div>
            </UCard>

            <!-- CLEO Redux -->
            <UCard>
                <div class="text-center space-y-3">
                    <div class="font-semibold text-base">CLEO Redux</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                        {{ componentDescriptions.cleo_redux }}
                    </div>

                    <div class="flex items-center justify-center gap-2 flex-wrap">
                        <NTag v-if="modStatus.cleo_redux" type="success" size="small">
                            <CheckCircle2 class="w-3 h-3 mr-1" />
                            已安装
                        </NTag>
                        <NTag v-if="modStatus.cleo_redux && isManualBinding('cleo_redux')" type="warning" size="small">
                            <Settings class="w-3 h-3 mr-1" />
                            自定义
                        </NTag>
                        <NTag v-if="modStatus.cleo_redux && isManualBinding('cleo_redux')" type="default" size="small"
                            class="cursor-pointer" @click="handleUnmarkManual('cleo_redux')">
                            取消选择
                        </NTag>
                        <NTag v-if="modStatus.cleo_redux && !isManualBinding('cleo_redux')" type="default" size="small"
                            class="cursor-pointer" @click="handleManualSelect('cleo_redux')">
                            手动选择
                        </NTag>
                    </div>

                    <div v-if="!modStatus.cleo_redux" class="pt-2">
                        <NDropdown trigger="click" :options="getInstallOptions('cleo_redux')"
                            @select="handleInstallOptionSelect">
                            <NButton size="small" type="primary" :loading="isInstalling">
                                <Download class="w-4 h-4 mr-1" />
                                立即安装
                            </NButton>
                        </NDropdown>
                    </div>

                    <div v-if="modStatus.cleo_redux && getComponentLocation('cleo_redux')" class="pt-2">
                        <NTooltip trigger="hover" placement="top">
                            <template #trigger>
                                <Info class="w-4 h-4 text-gray-400 mx-auto cursor-help" />
                            </template>
                            <div class="max-w-xs">
                                <div class="font-semibold mb-1">安装位置</div>
                                <div class="text-xs text-gray-600 dark:text-gray-400">
                                    {{ getComponentLocation('cleo_redux') }}
                                </div>
                            </div>
                        </NTooltip>
                    </div>
                </div>
            </UCard>

            <!-- ModLoader -->
            <UCard>
                <div class="text-center space-y-3">
                    <div class="font-semibold text-base">ModLoader</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                        {{ componentDescriptions.modloader }}
                    </div>

                    <div class="flex items-center justify-center gap-2 flex-wrap">
                        <NTag v-if="modStatus.modloader" type="success" size="small">
                            <CheckCircle2 class="w-3 h-3 mr-1" />
                            已安装
                        </NTag>
                        <NTag v-if="modStatus.modloader && isManualBinding('modloader')" type="warning" size="small">
                            <Settings class="w-3 h-3 mr-1" />
                            自定义
                        </NTag>
                        <NTag v-if="modStatus.modloader && isManualBinding('modloader')" type="default" size="small"
                            class="cursor-pointer" @click="handleUnmarkManual('modloader')">
                            取消选择
                        </NTag>
                        <NTag v-if="modStatus.modloader && !isManualBinding('modloader')" type="default" size="small"
                            class="cursor-pointer" @click="handleManualSelect('modloader')">
                            手动选择
                        </NTag>
                    </div>

                    <div v-if="!modStatus.modloader" class="pt-2">
                        <NDropdown trigger="click" :options="getInstallOptions('modloader')"
                            @select="handleInstallOptionSelect">
                            <NButton size="small" type="primary" :loading="isInstalling">
                                <Download class="w-4 h-4 mr-1" />
                                立即安装
                            </NButton>
                        </NDropdown>
                    </div>

                    <div v-if="modStatus.modloader && getComponentLocation('modloader')" class="pt-2">
                        <NTooltip trigger="hover" placement="top">
                            <template #trigger>
                                <Info class="w-4 h-4 text-gray-400 mx-auto cursor-help" />
                            </template>
                            <div class="max-w-xs">
                                <div class="font-semibold mb-1">安装位置</div>
                                <div class="text-xs text-gray-600 dark:text-gray-400">
                                    <template v-if="Array.isArray(getComponentLocation('modloader'))">
                                        <div v-for="(location, index) in getComponentLocation('modloader')" :key="index"
                                            class="mb-1">
                                            {{ location }}
                                        </div>
                                    </template>
                                    <template v-else>
                                        {{ getComponentLocation('modloader') }}
                                    </template>
                                </div>
                            </div>
                        </NTooltip>
                    </div>
                </div>
            </UCard>
        </div>

        <!-- 全部已安装提示 -->
        <NAlert v-if="allComponentsInstalled" type="success" title="所有前置组件已安装">
            所有必要的前置组件都已安装完成，您可以开始安装 MOD 了。
        </NAlert>

        <!-- 安装结果对话框 -->
        <NModal v-model:show="showResult" preset="card" title="安装结果" style="width: 600px">
            <div v-if="installResult" class="space-y-4">
                <NResult :status="installResult.success ? 'success' : 'error'"
                    :title="installResult.success ? '安装成功' : '安装失败'" :description="installResult.message" />

                <div v-if="installResult.details && installResult.details.length > 0" class="text-left">
                    <h4 class="mb-3 text-sm font-semibold">详细信息：</h4>
                    <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1">
                        <div v-for="(detail, index) in installResult.details" :key="index" class="text-xs"
                            :class="detail.includes('失败') ? 'text-red-500' : 'text-green-500'">
                            {{ detail }}
                        </div>
                    </div>
                </div>

                <div class="text-center">
                    <NButton type="primary" @click="closeResult">确定</NButton>
                </div>
            </div>
        </NModal>
    </div>
</template>
