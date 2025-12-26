/**
 * 用户菜单 Composable
 * 管理用户菜单的初始化、登录对话框、登出等功能
 */

import { useAuthStore } from '~/composables/useAuthStore'
import { useAuth } from '~/composables/useAuth'
import { useMessage } from '~/composables/ui/useMessage'
import { useLoginForm } from '~/composables/ui/useLoginForm'
import { apiService } from '~/composables/web/core'

export function useUserMenu() {
    const authStore = useAuthStore()
    const { logout } = useAuth()
    const { showSuccess, showError } = useMessage()

    // 初始化状态
    const isInitializing = ref(true)

    // 登录对话框状态
    const showLoginDialog = ref(false)

    // 使用登录表单 composable
    const {
        loginForm,
        loginLoading,
        loginError,
        captchaImage,
        captchaLoading,
        handleLogin: baseHandleLogin,
        initialize: initializeLoginForm,
        refreshCaptcha
    } = useLoginForm({
        autoInit: false, // 手动初始化
        autoRedirect: false // 不自动跳转，只关闭对话框
    })

    /**
     * 初始化用户菜单
     * 检查认证状态、加载验证码等
     */
    const initialize = async () => {
        if (!import.meta.client) {
            isInitializing.value = false
            return
        }

        try {
            await initializeLoginForm()
        } catch (error) {
            console.error('初始化失败:', error)
        } finally {
            isInitializing.value = false
        }
    }

    // 登录状态
    const isLoggedIn = computed(() => {
        if (isInitializing.value) {
            return false // 初始化中，默认显示未登录状态
        }
        return authStore.isLoggedIn.value
    })

    // 用户信息
    const currentUser = computed(() => authStore.user.value)
    const userAvatar = computed(() => currentUser.value?.avatar || '/images/avatar/null.svg')
    const displayName = computed(() => currentUser.value?.name || currentUser.value?.username || '用户')

    /**
     * 打开登录对话框
     */
    const openLoginDialog = () => {
        showLoginDialog.value = true
        loginForm.username = ''
        loginForm.password = ''
        loginForm.captcha = ''
        loginForm.rememberMe = false
    }

    /**
     * 关闭登录对话框
     */
    const closeLoginDialog = () => {
        showLoginDialog.value = false
    }

    /**
     * 处理登录
     */
    const handleLogin = async () => {
        const result = await baseHandleLogin()
        if (result.success) {
            showLoginDialog.value = false
        }
    }

    // 登出加载状态
    const logoutLoading = ref(false)

    /**
     * 处理登出
     */
    const handleLogout = async () => {
        console.log('handleLogout 被调用')
        try {
            logoutLoading.value = true

            // 调用登出 API（内部会清除所有状态）
            const result = await logout()

            // 确保清除用户状态（即使 API 失败也要清除）
            authStore.clearUser()

            // 重置登录表单状态
            loginForm.username = ''
            loginForm.password = ''
            loginForm.captcha = ''
            loginForm.rememberMe = false

            if (result.success) {
                showSuccess(result.message || '已成功登出')

                // 如果当前在需要登录的页面，跳转到首页
                const router = useRouter()
                const currentRoute = router.currentRoute.value
                if (currentRoute.meta.middleware === 'auth' || currentRoute.path.startsWith('/game/')) {
                    router.push('/')
                }
            } else {
                // 即使显示错误，状态也已经清除
                showError(result.message || '登出失败')
            }
        } catch (error) {
            console.error('登出失败:', error)
            // 即使出错，也清除本地状态
            authStore.clearUser()
            loginForm.username = ''
            loginForm.password = ''
            loginForm.captcha = ''
            loginForm.rememberMe = false
            showError('登出失败')
        } finally {
            logoutLoading.value = false
        }
    }

    /**
     * 生成菜单项
     */
    const menuItems = computed(() => [
        [
            {
                label: displayName.value,
                avatar: { src: userAvatar.value },
                type: 'label' as const
            }
        ],
        [
            {
                label: '个人资料',
                icon: 'i-lucide-user',
                click: () => {
                    showSuccess('个人资料功能开发中')
                }
            }
        ],
        [
            {
                label: '登出',
                icon: 'i-lucide-log-out',
                click: () => {
                    handleLogout()
                }
            }
        ]
    ])

    return {
        // 状态
        isInitializing,
        isLoggedIn,
        currentUser,
        userAvatar,
        displayName,
        showLoginDialog,
        loginForm,
        loginLoading,
        loginError,
        captchaImage,
        captchaLoading,
        logoutLoading: readonly(logoutLoading),

        // 方法
        initialize,
        openLoginDialog,
        closeLoginDialog,
        handleLogin,
        handleLogout,
        refreshCaptcha,

        // 计算属性
        menuItems,

        // 工具方法
        isCaptchaEnabled: () => apiService.isCaptchaEnabled()
    }
}

