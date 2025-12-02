<script setup>
import { ref } from 'vue'
import { useGtaModx, siteUrl } from '@/composables/api/useGtaModx'
import { UserOutlined, LogoutOutlined } from '@ant-design/icons-vue'
import { useMessage } from '@/composables/ui/useMessage'

const { user, isAuthenticated, checkAuthStatus, logout } = useGtaModx()
const { showSuccess, showError } = useMessage()

// 登录确认对话框状态
const loginConfirmVisible = ref(false)

// 组件挂载时检查登录状态
onMounted(async () => {
    await checkAuthStatus()
})

// 打开 URL 的辅助函数
const openUrl = async (url) => {
    try {
        // 导入 opener 插件
        const { openUrl: openUrlFunc } = await import('@tauri-apps/plugin-opener')
        await openUrlFunc(url)
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        throw new Error(`打开 URL 失败: ${errorMsg}`)
    }
}

// 打开登录页面
const handleLogin = async () => {
    try {
        await openUrl(`${siteUrl}/login`)
        // 打开登录页面后，延迟显示确认对话框
        setTimeout(() => {
            loginConfirmVisible.value = true
        }, 500)
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        showError('打开登录页面失败', { detail: errorMsg })
    }
}

// 处理登录成功确认
const handleLoginSuccess = async () => {
    loginConfirmVisible.value = false

    // 检查登录状态
    const success = await checkAuthStatus()
    if (success) {
        showSuccess('登录成功')
    } else {
        showError('登录状态验证失败，请重新登录')
        // 重新打开登录页面
        await handleLogin()
    }
}

// 处理登录失败或取消
const handleLoginFailed = async () => {
    loginConfirmVisible.value = false
    // 重新打开登录页面
    try {
        await openUrl(`${siteUrl}/login`)
        setTimeout(() => {
            loginConfirmVisible.value = true
        }, 500)
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        showError('打开登录页面失败', { detail: errorMsg })
    }
}

// 关闭对话框时检查登录状态
const handleLoginCancel = async () => {
    loginConfirmVisible.value = false
    // 关闭时也检查登录状态
    await checkAuthStatus()
}

// 退出登录
const handleLogout = () => {
    logout()
    showSuccess('已退出登录')
}

// 打开用户中心
const handleUserCenter = async () => {
    try {
        await openUrl(`${siteUrl}/user`)
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        showError('打开用户中心失败', { detail: errorMsg })
    }
}
</script>

<template>
    <a-tooltip v-if="!isAuthenticated" placement="bottomRight" title="登录GTAMODX账号即可体验所有功能">
        <a-button size="small" type="text" @click="handleLogin">
            <template #icon>
                <UserOutlined />
            </template>
            登录
        </a-button>
    </a-tooltip>

    <a-dropdown v-else placement="bottomRight">
        <a-button size="small" type="text">
            <template #icon>
                <UserOutlined />
            </template>
            {{ user?.name || user?.login || '用户' }}
        </a-button>
        <template #overlay>
            <a-menu>
                <a-menu-item @click="handleUserCenter">
                    <UserOutlined />
                    用户中心
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item @click="handleLogout" danger>
                    <LogoutOutlined />
                    退出登录
                </a-menu-item>
            </a-menu>
        </template>
    </a-dropdown>

    <!-- 登录确认对话框 -->
    <a-modal v-model:open="loginConfirmVisible" title="登录确认" :maskClosable="false" :keyboard="false"
        @cancel="handleLoginCancel" :footer="null">
        <div style="padding: 16px 0; text-align: center;">
            <a-typography-paragraph style="margin-bottom: 24px;">
                请在浏览器中完成登录后，选择登录结果：
            </a-typography-paragraph>
            <a-space size="large">
                <a-button size="large" @click="handleLoginFailed">
                    重新登录
                </a-button>
                <a-button type="primary" size="large" @click="handleLoginSuccess">
                    登录成功
                </a-button>
            </a-space>
        </div>
    </a-modal>
</template>
