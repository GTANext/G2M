import { useAuthStore } from '~/composables/useAuthStore'
import { useAuth } from '~/composables/useAuth'
import { useUserManager } from '~/composables/useApiService'
import { useMessage } from '~/composables/ui/useMessage'
import { useCaptcha } from '~/composables/web/captcha'
import { apiService } from '~/composables/web/core'
import { getStoredToken } from '~/composables/utils/storage'
import type { LoginCredentials } from '~/composables/web/types'

export interface UseLoginFormOptions {
  /**
   * 登录成功后的回调函数
   * @param redirectTo 重定向路径
   */
  onSuccess?: (redirectTo?: string) => void | Promise<void>
  /**
   * 是否自动初始化
   * @default true
   */
  autoInit?: boolean
  /**
   * 是否在登录成功后自动跳转
   * @default true
   */
  autoRedirect?: boolean
}

/**
 * 登录表单 Composable
 * 封装登录表单的状态管理和逻辑处理
 */
export function useLoginForm(options: UseLoginFormOptions = {}) {
  const {
    onSuccess,
    autoInit = true,
    autoRedirect = true
  } = options

  const router = useRouter()
  const authStore = useAuthStore()
  const { login } = useAuth()
  const { showSuccess } = useMessage()
  const { captchaImage, getCaptcha, refreshCaptcha, isLoading: captchaLoading } = useCaptcha()

  // 登录表单状态
  const loginForm = reactive<LoginCredentials>({
    username: '',
    password: '',
    rememberMe: false,
    captcha: ''
  })

  const loginLoading = ref(false)
  const loginError = ref('')

  /**
   * 初始化登录表单
   * 检查登录状态、加载验证码等
   */
  const initialize = async () => {
    if (!import.meta.client) return

    try {
      await apiService.initConfig()
      const token = getStoredToken()
      if (token) {
        apiService.setToken(token)
      }
      if (!authStore.initialized.value) {
        await authStore.checkAuthStatus()
      }

      // 如果启用验证码，自动加载
      if (apiService.isCaptchaEnabled()) {
        await getCaptcha()
      }
    } catch (error) {
      console.error('初始化登录表单失败:', error)
    }
  }

  /**
   * 检查是否已登录，如果已登录则执行回调或跳转
   * @param redirectTo 如果已登录，跳转到此路径（默认首页）
   * @returns 是否已登录
   */
  const checkIfLoggedIn = async (redirectTo: string = '/'): Promise<boolean> => {
    if (!import.meta.client) return false

    try {
      if (!authStore.initialized.value) {
        await authStore.checkAuthStatus()
      }

      if (authStore.isLoggedIn.value) {
        if (autoRedirect) {
          router.push(redirectTo)
        }
        return true
      }
      return false
    } catch (error) {
      console.error('检查登录状态失败:', error)
      return false
    }
  }

  /**
   * 处理登录
   */
  const handleLogin = async (): Promise<{ success: boolean; error?: string }> => {
    loginError.value = ''

    // 验证必填字段
    if (!loginForm.username.trim() || !loginForm.password) {
      loginError.value = '用户名/邮箱和密码不能为空'
      return { success: false, error: loginError.value }
    }

    loginLoading.value = true

    try {
      const loginData: LoginCredentials = {
        username: loginForm.username,
        password: loginForm.password,
        rememberMe: loginForm.rememberMe
      }

      // 如果启用了验证码，确保验证码不为空
      if (apiService.isCaptchaEnabled()) {
        if (!loginForm.captcha || !loginForm.captcha.trim()) {
          loginError.value = '请输入验证码'
          loginLoading.value = false
          return { success: false, error: loginError.value }
        }
        loginData.captcha = loginForm.captcha.trim()
      }

      const result = await login(loginData)

      if (result.success && result.data) {
        // 设置用户信息
        authStore.setUser(result.data)
        await new Promise(resolve => setTimeout(resolve, 100))

        // 获取完整的用户信息
        try {
          const { getUserInfo } = useUserManager()
          const userInfoResult = await getUserInfo()
          if (userInfoResult.success && userInfoResult.logged_in && userInfoResult.data) {
            authStore.setUser(userInfoResult.data)
          }
        } catch (err) {
          console.warn('获取用户信息失败:', err)
        }

        loginError.value = ''

        // 刷新验证码
        if (apiService.isCaptchaEnabled()) {
          loginForm.captcha = ''
          await refreshCaptcha()
        }

        showSuccess('登录成功')

        // 确定重定向路径
        const redirectTo = router.currentRoute.value.query.redirect as string || '/'

        // 执行成功回调
        if (onSuccess) {
          await onSuccess(redirectTo)
        } else if (autoRedirect) {
          router.push(redirectTo)
        }

        return { success: true }
      } else {
        loginError.value = result.message || '登录失败'
        if (apiService.isCaptchaEnabled() && loginError.value.includes('验证码')) {
          loginForm.captcha = ''
          await refreshCaptcha()
        }
        return { success: false, error: loginError.value }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      loginError.value = errorMessage.includes('验证码') ? errorMessage : '网络错误，请稍后再试'
      if (apiService.isCaptchaEnabled() && loginError.value.includes('验证码')) {
        loginForm.captcha = ''
        await refreshCaptcha()
      }
      return { success: false, error: loginError.value }
    } finally {
      loginLoading.value = false
    }
  }

  /**
   * 重置登录表单
   */
  const resetForm = () => {
    loginForm.username = ''
    loginForm.password = ''
    loginForm.rememberMe = false
    loginForm.captcha = ''
    loginError.value = ''
  }

  // 自动初始化
  if (autoInit && import.meta.client) {
    onMounted(() => {
      initialize()
    })
  }

  return {
    // 状态
    loginForm,
    loginLoading: readonly(loginLoading),
    loginError: computed(() => loginError.value), // 只读访问
    captchaImage,
    captchaLoading,

    // 方法
    initialize,
    checkIfLoggedIn,
    handleLogin,
    resetForm,
    refreshCaptcha,
    getCaptcha
  }
}

