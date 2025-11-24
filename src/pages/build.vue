<script setup>
import { ref } from 'vue'
import { FolderOpenOutlined, SaveOutlined, EyeOutlined } from '@ant-design/icons-vue'
import { useBuildModConfig } from '@/composables/mod/useBuildModConfig'

const {
    formData,
    formRef,
    rules,
    saving,
    selectingModDir,
    loadingFileTree,
    fileTree,
    selectModDirectory,
    removeModFile,
    saveConfig,
    resetForm,
    handleFileDrop
} = useBuildModConfig()

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
</script>

<template>
    <a-card>
        <template #title>
            <span>构建 g2m.json</span>
        </template>

        <div v-if="!formData.modDir" :style="{ textAlign: 'center', padding: '80px 20px' }">
            <a-empty description="请先选择 MOD 文件夹">
                <template #image>
                    <FolderOpenOutlined :style="{ fontSize: '64px', color: '#d9d9d9' }" />
                </template>
                <a-button type="primary" :loading="selectingModDir" @click="selectModDirectory" size="large">
                    <template #icon>
                        <FolderOpenOutlined />
                    </template>
                    选择 MOD 文件夹
                </a-button>
            </a-empty>
        </div>

        <a-form v-else ref="formRef" :model="formData" :rules="rules" layout="vertical">
            <a-form-item label="MOD文件夹" name="modDir" required>
                <a-input-group compact>
                    <a-input v-model:value="formData.modDir" placeholder="请选择 MOD 文件夹" :readonly="true"
                        :style="{ width: 'calc(100% - 120px)' }" />
                    <a-button type="primary" :loading="selectingModDir" @click="selectModDirectory"
                        :style="{ width: '120px' }">
                        <template #icon>
                            <FolderOpenOutlined />
                        </template>
                        选择目录
                    </a-button>
                </a-input-group>
            </a-form-item>
            <a-row :gutter="16">
                <a-col :span="12">
                    <a-form-item label="MOD 名称" name="name" required>
                        <a-input v-model:value="formData.name" placeholder="请输入 MOD 名称" />
                    </a-form-item>
                </a-col>
                <a-col :span="12">
                    <a-form-item label="作者">
                        <a-input v-model:value="formData.author" placeholder="请输入作者名称" />
                    </a-form-item>
                </a-col>
            </a-row>

            <a-form-item label="文件映射" required>
                <a-row :gutter="16" :style="{ minHeight: '420px' }">
                    <a-col :span="12" :style="{ height: '420px' }">
                        <a-card size="small" class="mapping-card" title="MOD 文件树">
                            <template #extra>
                                <a-spin :spinning="loadingFileTree" />
                            </template>
                            <div class="tree-scroll">
                                <ModFileTree :tree="fileTree" :added-files="formData.modfiles" @drag-start="() => { }"
                                    @remove="handleRemoveFromModfiles" />
                            </div>
                        </a-card>
                    </a-col>
                    <a-col :span="12" :style="{ height: '420px' }">
                        <a-card size="small" class="mapping-card" title="游戏目录">
                            <div class="tree-scroll">
                                <ModDropTarget :mod-name="formData.name" :added-files="formData.modfiles"
                                    :mod-tree="fileTree" @drop="handleFileDrop" @remove="handleRemoveFromModfiles"
                                    @update-target="handleUpdateTargetPath" />
                            </div>
                        </a-card>
                    </a-col>
                </a-row>
            </a-form-item>

            <a-form-item>
                <a-space>
                    <a-button type="primary" :loading="saving" @click="saveConfig">
                        <template #icon>
                            <SaveOutlined />
                        </template>
                        保存配置
                    </a-button>
                    <a-button @click="filePathDialogVisible = true">
                        <template #icon>
                            <EyeOutlined />
                        </template>
                        查看文件路径
                    </a-button>
                    <a-button @click="resetForm">
                        重置
                    </a-button>
                </a-space>
            </a-form-item>
        </a-form>

        <a-modal v-model:open="filePathDialogVisible" title="文件路径映射" :width="800" :footer="null">
            <a-table :columns="[
                {
                    title: '源路径(MOD根目录)',
                    dataIndex: 'source',
                    key: 'source',
                    width: '40%'
                },
                {
                    title: '目标路径(游戏目录)',
                    dataIndex: 'target',
                    key: 'target',
                    width: '50%'
                },
                {
                    title: '类型',
                    dataIndex: 'isDirectory',
                    key: 'isDirectory',
                    width: '10%',
                    customRender: ({ record }) => record.isDirectory ? '文件夹' : '文件'
                }
            ]" :data-source="formData.modfiles" :pagination="false" size="small" />
        </a-modal>
    </a-card>
</template>

<style scoped>
:deep(.ant-card-body) {
    height: 100%;
    display: flex;
    flex-direction: column;
}

:deep(.mapping-card) {
    height: 100%;
}

:deep(.mapping-card .ant-card-body) {
    height: 100%;
    padding: 12px;
    display: flex;
    flex-direction: column;
}

:deep(.mapping-card .tree-scroll) {
    flex: 1;
    overflow: auto;
    overflow-x: hidden;
    margin-bottom: 35px;
}
</style>
