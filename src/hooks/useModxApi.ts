import { useCallback } from "react"

import { useModxAuth } from "@/components/app/modxAuthProvider"
import { fetchModxResource } from "@/lib/modxAuth"

function useModxApi() {
  const { authState, isHydrated } = useModxAuth()

  const requestModxApi = useCallback(
    async <T,>(path: string, init?: RequestInit) =>
      fetchModxResource<T>(path, authState?.loginId, init),
    [authState?.loginId],
  )

  return {
    isHydrated,
    requestModxApi,
  }
}

export { useModxApi }
