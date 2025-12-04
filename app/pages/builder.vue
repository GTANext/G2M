<script setup>
import { ref } from 'vue'
import { useBuildModConfig } from '~/composables/mod/useBuildModConfig'
import { useMessage } from '~/composables/ui/useMessage'
import { Eye } from 'lucide-vue-next'

const { showError, showSuccess } = useMessage()

const {
    formData,
    formRef,
    rules,
    saving,
    selectingModDir,
    loadingFileTree,
    fileTree,
    selectModDirectory,
    addModFile,
    removeModFile,
    saveConfig,
    resetForm,
    handleFileDrop,
    handleTargetChange,
    initTargetTree
} = useBuildModConfig()

// 处理从文件列表中移除文件
const handleRemoveFromModfiles = (fileData) => {
    const sourcePath = fileData?.source || fileData?.path
    if (!sourcePath) {
        return
    }
    const index = formData.value.modfiles.findIndex(f => f.source === sourcePath)
    if (index > -1) {
        removeModFile(index)
    }
}

// 处理更新目标路径
const handleUpdateTargetPath = (fileData, targetNode) => {
    const sourcePath = fileData?.source || fileData?.path
    if (!sourcePath) {
        return
    }
    const index = formData.value.modfiles.findIndex(f => f.source === sourcePath)
    if (index === -1) {
        return
    }

    let newTarget = targetNode?.path || ''
    const fileName = fileData.name || sourcePath.split('/').pop()

    if (newTarget) {
        newTarget = `${newTarget}/${fileName}`
    } else {
        newTarget = fileName
    }

    const updatedFiles = [...formData.value.modfiles]
    updatedFiles[index] = {
        ...updatedFiles[index],
        target: newTarget
    }

    updatedFiles.sort((a, b) => {
        const depthA = a.target.split('/').length
        const depthB = b.target.split('/').length
        if (depthA !== depthB) {
            return depthA - depthB
        }
        return a.target.localeCompare(b.target)
    })

    formData.value.modfiles = updatedFiles
}

// 查看文件路径对话框
const filePathDialogVisible = ref(false)

// 初始化目标树
onMounted(() => {
    initTargetTree()
})
</script>

<template>
    <UPage>
        <UPageBody>
            <UCard v-if="!formData.modDir">
                <div class="flex flex-col items-center justify-center py-20">
                    <UPageSection title="G2M Builder" description="选择 MOD 根目录以开始构建配置文件">
                        <template #links>
                            <NButton type="primary" :loading="selectingModDir" @click="selectModDirectory" size="large">
                                <template #icon>
                                    <UIcon name="i-lucide-folder-open" />
                                </template>
                                选择 MOD 文件夹
                            </NButton>
                        </template>
                    </UPageSection>
                </div>
            </UCard>

            <template v-else>
                <UCard>
                    <template #header>
                        <h3 class="text-lg font-semibold">基本信息</h3>
                    </template>

                    <NForm ref="formRef" :model="formData" :rules="rules" label-placement="left" label-width="120px"
                        size="large">
                        <NFormItem label="MOD目录" path="modDir" required>
                            <div class="flex gap-2 w-full">
                                <NInput v-model:value="formData.modDir" placeholder="请选择 MOD 根目录"
                                    :disabled="selectingModDir" readonly class="flex-1" />
                                <NButton type="primary" @click="selectModDirectory" :loading="selectingModDir">
                                    选择目录
                                </NButton>
                            </div>
                        </NFormItem>

                        <div class="grid grid-cols-2 gap-4">
                            <NFormItem label="MOD 名称" path="name" required>
                                <NInput v-model:value="formData.name" placeholder="请输入 MOD 名称" />
                            </NFormItem>

                            <NFormItem label="作者" path="author">
                                <NInput v-model:value="formData.author" placeholder="请输入作者名称（可选）" />
                            </NFormItem>
                        </div>
                    </NForm>
                </UCard>

                <UCard class="mt-4">
                    <template #header>
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-semibold">文件映射</h3>
                            <div class="flex gap-2">
                                <NButton size="small" @click="addModFile(false)" :disabled="loadingFileTree">
                                    添加文件
                                </NButton>
                                <NButton size="small" quaternary @click="addModFile(true)" :disabled="loadingFileTree">
                                    添加文件夹
                                </NButton>
                            </div>
                        </div>
                    </template>

                    <div v-if="loadingFileTree" class="flex items-center justify-center py-8">
                        <NSpin size="small" />
                        <span class="ml-2 text-muted-foreground">加载文件树...</span>
                    </div>

                    <div v-else class="grid grid-cols-2 gap-4 min-h-[420px]">
                        <UCard class="flex flex-col h-full">
                            <template #header>
                                <div class="flex items-center gap-2">
                                    <UIcon name="i-lucide-folder-tree" class="w-5 h-5 text-primary" />
                                    <h4 class="text-base font-semibold">MOD 文件</h4>
                                </div>
                            </template>
                            <div class="flex-1 overflow-auto overflow-x-hidden min-h-[350px] mt-[-14px]">
                                <ModFileTree :tree="fileTree" :added-files="formData.modfiles" @drag-start="() => { }"
                                    @remove="handleRemoveFromModfiles" />
                            </div>
                        </UCard>
                        <UCard class="flex flex-col h-full">
                            <template #header>
                                <div class="flex items-center gap-2">
                                    <UIcon name="i-lucide-folder-open" class="w-5 h-5 text-primary" />
                                    <h4 class="text-base font-semibold">游戏目录</h4>
                                </div>
                            </template>
                            <div class="flex-1 overflow-auto overflow-x-hidden min-h-[350px] mt-[-14px]">
                                <ModDropTarget :mod-name="formData.name" :added-files="formData.modfiles"
                                    :mod-tree="fileTree" @drop="handleFileDrop" @remove="handleRemoveFromModfiles"
                                    @update-target="handleUpdateTargetPath" />
                            </div>
                        </UCard>
                    </div>
                </UCard>

                <div class="mt-6 flex justify-end gap-3">
                    <NButton quaternary @click="filePathDialogVisible = true">
                        <template #icon>
                            <Eye :size="16" />
                        </template>
                        查看文件路径
                    </NButton>
                    <NButton quaternary @click="resetForm">
                        重置
                    </NButton>
                    <NButton type="primary" :loading="saving" @click="saveConfig">
                        保存配置
                    </NButton>
                </div>
            </template>
        </UPageBody>
    </UPage>

    <NModal v-model:show="filePathDialogVisible" title="文件路径映射" preset="card" style="width: 800px">
        <div class="overflow-auto max-h-[500px]">
            <table class="w-full border-collapse">
                <thead class="sticky top-0 bg-gray-50 dark:bg-gray-800">
                    <tr>
                        <th
                            class="border border-gray-200 dark:border-gray-700 px-4 py-2 text-left text-sm font-semibold w-[40%]">
                            源路径(MOD根目录)</th>
                        <th
                            class="border border-gray-200 dark:border-gray-700 px-4 py-2 text-left text-sm font-semibold w-[50%]">
                            目标路径(游戏目录)</th>
                        <th
                            class="border border-gray-200 dark:border-gray-700 px-4 py-2 text-left text-sm font-semibold w-[10%]">
                            类型</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(file, index) in formData.modfiles" :key="index"
                        class="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td class="border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm">{{ file.source }}</td>
                        <td class="border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm">{{ file.target }}</td>
                        <td class="border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm">{{ file.isDirectory ?
                            '文件夹' : '文件' }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </NModal>
</template>
