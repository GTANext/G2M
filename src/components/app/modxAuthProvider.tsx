import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import {
  checkModxLogin,
  fetchModxUserInfo,
  loadStoredModxLoginState,
  loginToModx,
  logoutFromModx,
  storeModxLoginState,
  type ModxLoginState,
} from "@/lib/modxAuth"

type ModxAuthContextValue = {
  authState: ModxLoginState | null
  isAuthenticated: boolean
  isHydrated: boolean
  isPending: boolean
  login: (email: string, password: string) => Promise<ModxLoginState>
  logout: () => Promise<void>
}

const ModxAuthContext = createContext<ModxAuthContextValue | null>(null)

function ModxAuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<ModxLoginState | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function hydrateAuthState() {
      const nextState = loadStoredModxLoginState()

      if (cancelled) {
        return
      }

      setAuthState(nextState)
      setIsHydrated(true)

      if (!nextState?.loginId) {
        return
      }

      setIsPending(true)

      try {
        const checkedState = await checkModxLogin(nextState.loginId)
        if (cancelled) {
          return
        }

        setAuthState(mergeAuthState(nextState, checkedState))

        try {
          const userInfoState = await fetchModxUserInfo(checkedState.loginId)
          if (cancelled) {
            return
          }

          setAuthState((current) => mergeAuthState(current, userInfoState))
        } catch {
          setAuthState((current) => mergeAuthState(current, checkedState))
        }
      } catch {
        if (!cancelled) {
          setAuthState(null)
        }
      } finally {
        if (!cancelled) {
          setIsPending(false)
        }
      }
    }

    void hydrateAuthState()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    storeModxLoginState(authState)
  }, [authState, isHydrated])

  const login = useCallback(async (email: string, password: string) => {
    setIsPending(true)
    try {
      const nextState = await loginToModx(email, password)
      let resolvedState = nextState

      try {
        const userInfoState = await fetchModxUserInfo(nextState.loginId)
        resolvedState = mergeAuthState(nextState, userInfoState)
      } catch {
        resolvedState = nextState
      }

      setAuthState(resolvedState)
      return resolvedState
    } finally {
      setIsPending(false)
    }
  }, [])

  const logout = useCallback(async () => {
    if (!authState?.loginId) {
      setAuthState(null)
      return
    }

    setIsPending(true)
    try {
      await logoutFromModx(authState.loginId)
      setAuthState(null)
    } finally {
      setIsPending(false)
    }
  }, [authState?.loginId])

  const value = useMemo<ModxAuthContextValue>(
    () => ({
      authState,
      isAuthenticated: !!authState?.loginId,
      isHydrated,
      isPending,
      login,
      logout,
    }),
    [authState, isHydrated, isPending, login, logout],
  )

  return <ModxAuthContext.Provider value={value}>{children}</ModxAuthContext.Provider>
}

function useModxAuth() {
  const context = useContext(ModxAuthContext)
  if (!context) {
    throw new Error("useModxAuth must be used within ModxAuthProvider")
  }

  return context
}

export { ModxAuthProvider, useModxAuth }

function mergeAuthState(
  current: ModxLoginState | null,
  incoming: ModxLoginState,
): ModxLoginState {
  return {
    loginId: incoming.loginId || current?.loginId || "",
    user: incoming.user ?? current?.user ?? null,
    expiresAt: incoming.expiresAt ?? current?.expiresAt ?? null,
    savedAt: incoming.savedAt || current?.savedAt || Date.now(),
  }
}
