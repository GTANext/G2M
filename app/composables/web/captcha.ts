import { ref, readonly } from 'vue'
import { apiService } from './core'
import { API_ENDPOINTS } from './config'

export const useCaptcha = () => {
  const captchaImage = ref<string | null>(null)
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  const autoInit = async (): Promise<void> => {
    if (apiService.isCaptchaEnabled() && !captchaImage.value) {
      try {
        await getCaptcha()
      } catch (err) {
        console.warn('自动获取验证码失败:', err)
      }
    }
  }

  const getCaptcha = async (): Promise<string | null> => {
    isLoading.value = true
    error.value = null

    try {
      const response = await apiService.get<{ image: string }>(
        API_ENDPOINTS.AUTH.GET_CAPTCHA
      )

      if (response.success && response.data?.image) {
        captchaImage.value = response.data.image
        return response.data.image
      }

      captchaImage.value = null
      return null
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取验证码时发生错误'
      error.value = message
      captchaImage.value = null
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const refreshCaptcha = async (): Promise<string | null> => {
    return await getCaptcha()
  }

  const clearError = () => {
    error.value = null
  }

  return {
    captchaImage: readonly(captchaImage),
    isLoading: readonly(isLoading),
    error: readonly(error),
    getCaptcha,
    refreshCaptcha,
    clearError,
    autoInit
  }
}

