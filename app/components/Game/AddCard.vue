<script setup>
import { useGameForm } from '~/composables/ui/useGameForm'
import { useGameList } from '~/composables/ui/useGameList'
import { useMessage } from '~/composables/ui/useMessage'

const { refreshGames } = useGameList()
const { showError } = useMessage()

const {
    formData,
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

// 提交表单
const handleSubmit = async () => {
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
            await refreshGames()
            resetForm()
        }
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <UModal title="添加游戏" description="选择游戏文件夹，系统将自动检测支持的 GTA 游戏并填充信息" :ui="{ width: 'sm:max-w-2xl' }"
        @close="resetForm">
        <template #default>
            <UCard class="cursor-pointer hover:border-primary transition-colors border-2 border-dashed">
                <div class="flex flex-col items-center justify-center p-18">
                    <UIcon name="i-heroicons-plus-circle" class="w-12 h-12 text-muted mb-4" />
                    <p class="text-lg font-medium text-muted">添加游戏</p>
                </div>
            </UCard>
        </template>

        <template #body>
            <UForm ref="formRef" :state="formData">
                <UFormGroup label="游戏目录" name="dir" required class="mb-4">
                    <UInputGroup>
                        <UButton @click="selectFolder" :loading="isDetecting" icon="i-heroicons-folder-open"
                            color="primary" class="w-full">
                            选择文件夹
                        </UButton>
                    </UInputGroup>
                </UFormGroup>

                <UAlert v-if="isDetecting" color="blue" variant="soft" icon="i-heroicons-arrow-path" title="正在检测游戏..."
                    class="mb-4" />

                <UAlert v-else-if="isAutoDetected && detectionResult" color="green" variant="soft"
                    icon="i-heroicons-check-circle" :title="`检测到游戏: ${detectionResult.game_name}`"
                    :description="`游戏类型: ${getGameTypeName(detectionResult.type)}`" class="mb-4" />

                <UAlert v-else-if="formData.dir && !isAutoDetected" color="yellow" variant="soft"
                    icon="i-heroicons-exclamation-triangle" title="未检测到支持的游戏" description="请手动填写游戏信息" class="mb-4" />

                <template v-if="formData.dir">

                    <UFormGroup label="游戏图片" name="img" class="mb-4">
                        <div class="space-y-2">
                            <div v-if="imagePreview" class="relative">
                                <img :src="imagePreview" alt="游戏预览图" class="w-full h-48 object-cover rounded-lg" />
                                <UButton @click="clearImage" icon="i-heroicons-x-mark" color="red" variant="soft"
                                    size="xs" class="absolute top-2 right-2">
                                    清除
                                </UButton>
                            </div>
                            <UButton @click="selectImage" :loading="uploadingImage" icon="i-heroicons-photo"
                                variant="outline" block size="xl">
                                {{ imagePreview ? '更换图片' : '选择图片' }}
                            </UButton>
                        </div>
                    </UFormGroup>
                </template>
            </UForm>
        </template>

        <template #footer>
            <div class="flex justify-end gap-2">
                <UButton color="gray" variant="ghost" @click="resetForm" :disabled="isSubmitting">
                    取消
                </UButton>
                <UButton color="primary" @click="handleSubmit" :loading="isSubmitting">
                    添加游戏
                </UButton>
            </div>
        </template>
    </UModal>
</template>