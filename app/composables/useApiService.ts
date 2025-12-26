import { apiService } from './web/core'
import { authApi, useAuthManager } from './web/auth'
import { userApi, useUserManager } from './web/user'
import { handleApiError, normalizeApiResponse } from './web/utils'

export { authApi, userApi }
export { useAuthManager, useUserManager }
export { handleApiError, normalizeApiResponse }

export const useApiService = () => {
  return {
    apiService,
    auth: authApi,
    user: userApi,
    get: apiService.get.bind(apiService),
    post: apiService.post.bind(apiService),
    put: apiService.put.bind(apiService),
    delete: apiService.delete.bind(apiService),
    authManager: useAuthManager(),
    userManager: useUserManager()
  }
}

export default useApiService

