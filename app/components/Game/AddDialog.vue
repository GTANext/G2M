<script setup>
import { watch } from 'vue'
import { useGameForm } from '~/composables/ui/useGameForm'
import { useMessage } from '~/composables/ui/useMessage'
import { useNotification } from 'naive-ui'

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['update:show', 'success', 'cancel'])

const { showError, showSuccess } = useMessage()
const notification = useNotification()

const {
    formData,
    rules,
    formRef,
    isDetecting,
    detectionResult,
    isAutoDetected,
    imagePreview,
    uploadingImage,
    selectFolder,
    selectImage,
    clearImage,
    submitForm,
    resetForm,
    getGameTypeName
} = useGameForm()

const isSubmitting = ref(false)

// 内部状态
const internalShow = computed({
    get: () => props.show,
    set: (value) => {
        emit('update:show', value)
    }
})

// 监听 show 变化，打开时重置表单
watch(() => props.show, (newShow) => {
    if (newShow) {
        resetForm()
    }
})

// 处理确认
const handleConfirm = async () => {
    // 基本验证
    if (!formData.dir) {
        showError('请选择游戏目录')
        return
    }
    if (!formData.name) {
        showError('请输入游戏名称')
        return
    }

    isSubmitting.value = true
    try {
        const success = await submitForm()
        if (success) {
            showSuccess('游戏添加成功！')
            emit('success') // 触发刷新列表
            emit('update:show', false)
            resetForm()
        }
    } catch (error) {
        // 详细错误使用 notification 在右下角显示
        const errorMessage = error instanceof Error ? error.message : String(error)
        showError('添加游戏失败') // 简短错误提示
        notification.error({
            title: '添加游戏失败',
            content: errorMessage,
            duration: 5000,
            placement: 'bottom-right'
        })
    } finally {
        isSubmitting.value = false
    }
}

// 处理取消
const handleCancel = () => {
    resetForm()
    emit('cancel')
    emit('update:show', false)
}
</script>

<template>
    <NModal v-model:show="internalShow" preset="dialog" title="添加游戏" :mask-closable="false" :auto-focus="false"
        style="width: 600px">
        <NForm ref="formRef" :model="formData" :rules="rules" label-placement="left" label-width="100px" size="large">
            <NFormItem label="游戏目录" path="dir" required>
                <NButton @click="selectFolder" :loading="isDetecting" type="primary" block>
                    选择文件夹
                </NButton>
            </NFormItem>

            <NAlert v-if="isDetecting" type="info" title="正在检测游戏..." class="mb-4" />

            <NAlert v-else-if="isAutoDetected && detectionResult" type="success"
                :title="`检测到游戏: ${detectionResult.game_name}`"
                :description="`游戏类型: ${getGameTypeName(detectionResult.type)}`" class="mb-4" />

            <NAlert v-else-if="formData.dir && !isAutoDetected" type="warning" title="未检测到支持的游戏" description="请手动填写游戏信息"
                class="mb-4" />

            <template v-if="formData.dir">
                <NFormItem label="游戏名称" path="name" required>
                    <NInput v-model:value="formData.name" placeholder="请输入游戏名称" />
                </NFormItem>

                <NFormItem label="启动程序" path="exe">
                    <NInput v-model:value="formData.exe" placeholder="例如: gta_sa.exe" />
                </NFormItem>

                <NFormItem label="游戏类型" path="type">
                    <NSelect v-model:value="formData.type" placeholder="选择游戏类型" :options="[
                        { label: 'GTA III', value: 'gta3' },
                        { label: 'GTA Vice City', value: 'gtavc' },
                        { label: 'GTA San Andreas', value: 'gtasa' },
                        { label: '其他', value: 'other' }
                    ]" />
                </NFormItem>

                <NFormItem label="游戏图片" path="img">
                    <div class="space-y-2">
                        <div v-if="imagePreview" class="relative">
                            <img :src="imagePreview" alt="游戏预览图" class="w-full h-48 object-cover rounded-lg" />
                            <NButton @click="clearImage" type="error" size="small" class="absolute top-2 right-2">
                                清除
                            </NButton>
                        </div>
                        <NButton @click="selectImage" :loading="uploadingImage" type="default" block>
                            {{ imagePreview ? '更换图片' : '选择图片' }}
                        </NButton>
                    </div>
                </NFormItem>
            </template>
        </NForm>

        <template #action>
            <div class="flex justify-end gap-2">
                <NButton @click="handleCancel" :disabled="isSubmitting">取消</NButton>
                <NButton type="primary" @click="handleConfirm" :loading="isSubmitting">添加游戏</NButton>
            </div>
        </template>
    </NModal>
</template>
