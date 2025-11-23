<script setup>
import { ref } from 'vue'
import { FolderOpenOutlined, SaveOutlined, EyeOutlined } from '@ant-design/icons-vue'
import { useBuildModConfig } from '@/composables/mod/useBuildModConfig'
import FileTree from '@/components/Mod/FileTree.vue'
import DropTarget from '@/components/Mod/DropTarget.vue'

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

// 查看文件路径对话框
const filePathDialogVisible = ref(false)
</script>

<template>
    <a-card>
        <template #title>
            <span>构建 g2m_mod.json</span>
        </template>

        <a-form ref="formRef" :model="formData" :rules="rules" layout="vertical">
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
                <a-row :gutter="16" :style="{ minHeight: '400px' }">
                    <a-col :span="12">
                        <a-card size="small" title="MOD 文件树" :style="{ height: '100%' }">
                            <template #extra>
                                <a-spin :spinning="loadingFileTree" />
                            </template>
                            <FileTree :tree="fileTree" :added-files="formData.modfiles" @drag-start="() => { }" @remove="(fileData) => {
                                const index = formData.modfiles.findIndex(f => f.source === fileData.path)
                                if (index > -1) {
                                    removeModFile(index)
                                }
                            }" />
                        </a-card>
                    </a-col>
                    <a-col :span="12">
                        <a-card size="small" :style="{ height: '100%' }">
                            <DropTarget :mod-name="formData.name" :added-files="formData.modfiles"
                                @drop="handleFileDrop" @remove="(fileData) => {
                                    const index = formData.modfiles.findIndex(f => f.source === fileData.path)
                                    if (index > -1) {
                                        removeModFile(index)
                                    }
                                }" @update-target="(fileData, targetNode) => {
                                    // fileData 是从 addedFiles 中来的，结构是 { source, target, isDirectory }
                                    // 但拖拽时传递的可能是原始数据 { path, name, is_directory }
                                    const sourcePath = fileData.source || fileData.path
                                    const index = formData.modfiles.findIndex(f => f.source === sourcePath)

                                    if (index > -1) {
                                        // 更新目标路径
                                        let newTarget = targetNode.path || ''
                                        const isDirectory = fileData.isDirectory !== undefined ? fileData.isDirectory : (fileData.is_directory !== undefined ? fileData.is_directory : false)
                                        const fileName = fileData.name || sourcePath.split('/').pop()

                                        if (isDirectory) {
                                            if (newTarget) {
                                                newTarget = `${newTarget}/${fileName}`
                                            } else {
                                                newTarget = fileName
                                            }
                                        } else {
                                            if (newTarget) {
                                                newTarget = `${newTarget}/${fileName}`
                                            } else {
                                                newTarget = fileName
                                            }
                                        }

                                        // 使用 Vue 3 的响应式更新方式
                                        const updatedFiles = [...formData.modfiles]
                                        updatedFiles[index] = {
                                            ...updatedFiles[index],
                                            target: newTarget
                                        }

                                        // 重新排序
                                        updatedFiles.sort((a, b) => {
                                            const depthA = a.target.split('/').length
                                            const depthB = b.target.split('/').length
                                            if (depthA !== depthB) {
                                                return depthA - depthB
                                            }
                                            return a.target.localeCompare(b.target)
                                        })

                                        // 替换整个数组以触发响应式更新
                                        formData.modfiles = updatedFiles
                                    }
                                }" />
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

        <!-- 文件路径查看对话框 -->
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

:deep(.ant-card-body > div) {
    flex: 1;
    overflow: hidden;
}
</style>
