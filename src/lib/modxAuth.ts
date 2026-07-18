import { parseHttpResponse, resolveHttpMessage } from "./api"

export const MODX_AUTH_STORAGE_KEY = "g2m:modx-auth-state"
export const MODX_API_BASE = "https://api.miomoe.cn/modx"

export type ModxAuthUser = {
  id?: string | number | null
  name?: string | null
  username?: string | null
  nickname?: string | null
  email?: string | null
  avatar?: string | null
  avatarUrl?: string | null
  role?: string | null
  isWechatBound?: boolean | null
  [key: string]: unknown
}

export type ModxLoginState = {
  loginId: string
  user: ModxAuthUser | null
  expiresAt: number | null
  savedAt: number
}

type ModxEnvelope<T> = {
  success?: boolean
  code?: number
  message?: string
  data?: T
}

type ModxLoginPayload = {
  loginId?: string
  user?: ModxAuthUser | null
  expiresAt?: number | null
}

export type ModxRemoteModPayload = {
  id?: string | number | null
  slug?: string | null
  name?: string | null
  title?: string | null
  version?: string | null
  latestVersion?: string | null
  [key: string]: unknown
}

export type ModxAppPayload = {
  version?: string | null
  latestVersion?: string | null
  currentVersion?: string | null
  buildVersion?: string | null
  [key: string]: unknown
}

export async function loginToModx(email: string, password: string): Promise<ModxLoginState> {
  const payload = await requestModx<ModxLoginPayload>("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  })

  return normalizeLoginState(payload)
}

export async function logoutFromModx(loginId: string): Promise<void> {
  const normalized = loginId.trim()
  if (!normalized) {
    return
  }

  await requestModx("/auth/logout", {
    method: "POST",
    headers: {
      "X-Login-Id": normalized,
    },
  })
}

export async function checkModxLogin(loginId: string): Promise<ModxLoginState> {
  const normalized = loginId.trim()
  if (!normalized) {
    throw new Error("Missing loginId")
  }

  const payload = await requestModx<ModxLoginPayload>("/auth/check", {
    headers: {
      "X-Login-Id": normalized,
    },
  })

  return normalizeLoginState(payload, normalized)
}

export async function fetchModxUserInfo(loginId: string): Promise<ModxLoginState> {
  const normalized = loginId.trim()
  if (!normalized) {
    throw new Error("Missing loginId")
  }

  const payload = await requestModx<ModxLoginPayload>("/user/info", {
    headers: {
      "X-Login-Id": normalized,
    },
  })

  return normalizeLoginState(payload, normalized)
}

export async function fetchModxModBySlug(
  slug: string,
  loginId?: string | null,
): Promise<ModxRemoteModPayload | null> {
  const normalizedSlug = slug.trim().replace(/^\/+|\/+$/g, "")
  if (!normalizedSlug) {
    throw new Error("Missing mod slug")
  }

  return fetchModxResource<ModxRemoteModPayload>(`/mods/${encodeURIComponent(normalizedSlug)}`, loginId)
}

export async function fetchModxAppVersion(loginId?: string | null): Promise<string> {
  const payload = await fetchModxResource<ModxAppPayload>("/mods/g2m", loginId)
  return resolveModxVersion(payload)
}

export function loadStoredModxLoginState(): ModxLoginState | null {
  if (typeof window === "undefined") {
    return null
  }

  const raw = window.localStorage.getItem(MODX_AUTH_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ModxLoginState> | null
    if (!parsed || typeof parsed.loginId !== "string" || !parsed.loginId.trim()) {
      return null
    }

    return {
      loginId: parsed.loginId,
      user: parsed.user ?? null,
      expiresAt: typeof parsed.expiresAt === "number" ? parsed.expiresAt : null,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
    }
  } catch {
    return null
  }
}

export function storeModxLoginState(state: ModxLoginState | null) {
  if (typeof window === "undefined") {
    return
  }

  if (!state) {
    window.localStorage.removeItem(MODX_AUTH_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(MODX_AUTH_STORAGE_KEY, JSON.stringify(state))
}

export function getModxAuthHeaders(state: ModxLoginState | null | undefined): HeadersInit {
  if (!state?.loginId) {
    return {}
  }

  return {
    "X-Login-Id": state.loginId,
  }
}

export async function fetchModxResource<T = unknown>(
  path: string,
  loginId?: string | null,
  init?: RequestInit,
): Promise<T> {
  const normalizedLoginId = loginId?.trim()
  const headers = new Headers(init?.headers)
  if (normalizedLoginId) {
    headers.set("X-Login-Id", normalizedLoginId)
  }

  return requestModx<T>(path, {
    ...init,
    headers,
  })
}

async function requestModx<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${MODX_API_BASE}${path}`, init)
  const payload = await parseHttpResponse<ModxEnvelope<T>>(response)

  if (!response.ok) {
    throw new Error(resolveHttpMessage(payload, response.statusText))
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    const typedPayload = payload as ModxEnvelope<T>

    if (typedPayload.success === false) {
      throw new Error(resolveHttpMessage(payload, "Request failed"))
    }

    if (
      typeof typedPayload.code === "number" &&
      typedPayload.code !== 0 &&
      typedPayload.code !== 200
    ) {
      throw new Error(resolveHttpMessage(payload, "Request failed"))
    }

    return (typedPayload.data ?? null) as T
  }

  return payload as T
}

function normalizeLoginState(
  payload: ModxLoginPayload | null | undefined,
  fallbackLoginId?: string,
): ModxLoginState {
  const loginId =
    typeof payload?.loginId === "string" && payload.loginId.trim()
      ? payload.loginId.trim()
      : fallbackLoginId?.trim() ?? ""

  if (!loginId) {
    throw new Error("Missing loginId in response")
  }

  return {
    loginId,
    user: normalizeUser(payload?.user ?? null),
    expiresAt: typeof payload?.expiresAt === "number" ? payload.expiresAt : null,
    savedAt: Date.now(),
  }
}

function normalizeUser(user: ModxAuthUser | null | undefined): ModxAuthUser | null {
  if (!user) {
    return null
  }

  const avatar =
    typeof user.avatarUrl === "string" && user.avatarUrl.trim()
      ? user.avatarUrl.trim()
      : typeof user.avatar === "string" && user.avatar.trim()
        ? user.avatar.trim()
        : null

  return {
    ...user,
    avatar,
    avatarUrl: avatar,
  }
}

function resolveModxVersion(payload: ModxAppPayload | null | undefined): string {
  if (!payload || typeof payload !== "object") {
    return ""
  }

  const candidateKeys = ["version", "latestVersion", "currentVersion", "buildVersion"] as const
  for (const key of candidateKeys) {
    const value = payload[key]
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }

  return ""
}
