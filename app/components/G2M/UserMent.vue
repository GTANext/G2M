<script setup lang="ts">
import { useUserMenu } from '~/composables/ui/useUserMenu'

const {
    isLoggedIn,
    userAvatar,
    displayName,
    showLoginDialog,
    loginForm,
    loginLoading,
    loginError,
    captchaImage,
    captchaLoading,
    openLoginDialog,
    closeLoginDialog,
    handleLogin,
    handleLogout,
    refreshCaptcha,
    menuItems,
    isCaptchaEnabled,
    initialize
} = useUserMenu()

// 组件挂载时初始化
onMounted(() => {
    initialize()
})
</script>

<template>
    <UDropdownMenu v-if="isLoggedIn" :items="menuItems">
        <UAvatar :src="userAvatar" :alt="displayName" size="sm" />
    </UDropdownMenu>

    <UButton v-else variant="ghost" @click="openLoginDialog">
        <UIcon name="i-lucide-log-in" class="w-5 h-5" />
    </UButton>

    <NModal v-model:show="showLoginDialog" preset="dialog" title="登录" :mask-closable="false" style="width: 400px">
        <div class="space-y-4">
            <NAlert v-if="loginError" type="error" class="mb-4">
                {{ loginError }}
            </NAlert>

            <NFormItem label="用户名/邮箱">
                <NInput v-model:value="loginForm.username" placeholder="请输入用户名或邮箱" :disabled="loginLoading" />
            </NFormItem>

            <NFormItem label="密码">
                <NInput v-model:value="loginForm.password" type="password" placeholder="请输入密码" :disabled="loginLoading"
                    show-password-on="click" />
            </NFormItem>

            <NFormItem v-if="isCaptchaEnabled()" label="验证码">
                <div class="flex gap-2 items-center">
                    <NInput v-model:value="loginForm.captcha" placeholder="请输入验证码" :disabled="loginLoading"
                        class="flex-1" />
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
        </div>

        <template #action>
            <div class="flex justify-end gap-2">
                <NButton @click="closeLoginDialog" :disabled="loginLoading">
                    取消
                </NButton>
                <NButton type="primary" :loading="loginLoading" @click="handleLogin">
                    登录
                </NButton>
            </div>
        </template>
    </NModal>
</template>