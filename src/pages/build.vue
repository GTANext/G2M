<script setup>
import { FolderOpenOutlined, FileOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons-vue'
import { useBuildModConfig } from '@/composables/mod/useBuildModConfig'

const {
    formData,
    formRef,
    rules,
    saving,
    selectingModDir,
    selectModDirectory,
    addModFile,
    removeModFile,
    saveConfig,
    resetForm
} = useBuildModConfig()
</script>

<template>
    <a-card>
        <template #title>
            <span>构建 g2m_mod.json</span>
        </template>

        <a-form ref="formRef" :model="formData" :rules="rules" layout="vertical"
            :style="{ maxWidth: '800px', margin: '0 auto' }">
            <a-form-item label="MOD 根目录" name="modDir" required>
                <a-input-group compact>
                    <a-input v-model:value="formData.modDir" placeholder="请选择 MOD 根目录" :readonly="true"
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

            <a-form-item label="MOD 名称" name="name" required>
                <a-input v-model:value="formData.name" placeholder="请输入 MOD 名称" />
            </a-form-item>

            <a-form-item label="作者（可选）">
                <a-input v-model:value="formData.author" placeholder="请输入作者名称" />
            </a-form-item>

            <a-form-item label="MOD 文件/文件夹" required>
                <div :style="{ marginBottom: '12px' }">
                    <a-space>
                        <a-button type="primary" @click="addModFile(false)" :disabled="!formData.modDir">
                            <template #icon>
                                <FileOutlined />
                            </template>
                            添加文件
                        </a-button>
                        <a-button type="primary" @click="addModFile(true)" :disabled="!formData.modDir">
                            <template #icon>
                                <FolderOpenOutlined />
                            </template>
                            添加文件夹
                        </a-button>
                    </a-space>
                </div>

                <a-table :columns="[
                    {
                        title: '源路径(MOD根目录)',
                        dataIndex: 'source',
                        key: 'source',
                        width: '30%'
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
                    },
                    {
                        title: '操作',
                        key: 'action',
                        width: '10%'
                    }
                ]" :data-source="formData.modfiles" :pagination="false" size="small" :style="{ marginTop: '12px' }">
                    <template #bodyCell="{ column, record, index }">
                        <template v-if="column.key === 'target'">
                            <a-input v-model:value="record.target" placeholder="输入目标路径" size="small" />
                        </template>
                        <template v-else-if="column.key === 'action'">
                            <a-button type="link" danger size="small" @click="removeModFile(index)">
                                <template #icon>
                                    <DeleteOutlined />
                                </template>
                                删除
                            </a-button>
                        </template>
                    </template>
                </a-table>

            </a-form-item>

            <a-form-item>
                <a-space>
                    <a-button type="primary" :loading="saving" @click="saveConfig">
                        <template #icon>
                            <SaveOutlined />
                        </template>
                        保存配置
                    </a-button>
                    <a-button @click="resetForm">
                        重置
                    </a-button>
                </a-space>
            </a-form-item>
        </a-form>
    </a-card>
</template>
