<script setup lang="ts">
import { useLoginForm } from '~/composables/ui/useLoginForm'
import { apiService } from '~/composables/web/core'

const {
    loginForm,
    loginLoading,
    loginError,
    captchaImage,
    captchaLoading,
    handleLogin,
    checkIfLoggedIn,
    refreshCaptcha
} = useLoginForm({
    autoInit: true,
    autoRedirect: true
})

const formRef = ref()

const rules = {
    username: [
        { required: true, message: '请输入用户名/邮箱', trigger: 'blur' }
    ],
    password: [
        { required: true, message: '请输入密码', trigger: 'blur' }
    ],
    captcha: apiService.isCaptchaEnabled() ? [
        { required: true, message: '请输入验证码', trigger: 'blur' }
    ] : []
}

const handleSubmit = async () => {
    try {
        await formRef.value?.validate()
        await handleLogin()
    } catch (error) {
        // 验证失败
    }
}

onMounted(async () => {
    await checkIfLoggedIn('/')
})
</script>

<template>
    <div class="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <NCard class="w-full max-w-md">
            <template #header>
                <div class="text-center text-xl font-semibold">登录</div>
            </template>

            <NForm ref="formRef" :model="loginForm" :rules="rules" label-placement="left" label-width="100px"
                size="large">
                <NAlert v-if="loginError" type="error" class="mb-4">
                    {{ loginError }}
                </NAlert>

                <NFormItem label="用户名/邮箱" path="username">
                    <NInput v-model:value="loginForm.username" placeholder="请输入用户名或邮箱" :disabled="loginLoading"
                        autocomplete="username" />
                </NFormItem>

                <NFormItem label="密码" path="password">
                    <NInput v-model:value="loginForm.password" type="password" placeholder="请输入密码"
                        :disabled="loginLoading" show-password-on="click" autocomplete="current-password" />
                </NFormItem>

                <NFormItem v-if="apiService.isCaptchaEnabled()" label="验证码" path="captcha">
                    <div class="flex gap-2 items-center">
                        <NInput v-model:value="loginForm.captcha" placeholder="请输入验证码"
                            :disabled="loginLoading || captchaLoading" class="flex-1" />
                        <div class="cursor-pointer border rounded flex items-center justify-center h-[34px] w-[120px] hover:bg-gray-50 dark:hover:bg-gray-800"
                            @click="refreshCaptcha">
                            <img v-if="captchaImage" :src="captchaImage" alt="验证码" class="h-full w-auto" />
                            <span v-else class="text-gray-400 text-xs">
                                {{ captchaLoading ? '加载中...' : '点击刷新' }}
                            </span>
                        </div>
                    </div>
                </NFormItem>

                <NFormItem>
                    <NCheckbox v-model:checked="loginForm.rememberMe" :disabled="loginLoading">
                        记住我
                    </NCheckbox>
                </NFormItem>
            </NForm>

            <template #action>
                <div class="flex justify-end">
                    <NButton type="primary" :loading="loginLoading" :disabled="loginLoading" @click="handleSubmit"
                        block>
                        {{ loginLoading ? '登录中...' : '登录' }}
                    </NButton>
                </div>
            </template>
        </NCard>
    </div>
</template>