import { invoke, type InvokeArgs } from "@tauri-apps/api/core"
import { fetch as tauriFetch } from "@tauri-apps/plugin-http"

export type ApiResponse<T> = {
  code: number
  message: string
  data: T | null
}

const SUCCESS_CODE = 0

export async function invokeApi<T>(command: string, args?: InvokeArgs): Promise<T> {
  const response = await invoke<ApiResponse<T>>(command, args)
  return unwrapApiResponse(response)
}

export function unwrapApiResponse<T>(value: unknown): T {
  const response = parseApiResponse<T>(value)
  if (!response) {
    return value as T
  }

  if (response.code !== SUCCESS_CODE) {
    throw new Error(response.message || "Request failed")
  }

  return response.data as T
}

export function formatApiErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const parsedFromMessage = parseApiResponse(error.message)
    return parsedFromMessage?.message || error.message
  }

  const parsed = parseApiResponse(error)
  if (parsed?.message) {
    return parsed.message
  }

  if (typeof error === "string") {
    return error
  }

  return String(error)
}

function parseApiResponse<T>(value: unknown): ApiResponse<T> | null {
  if (!value) {
    return null
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return isApiResponse<T>(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  return isApiResponse<T>(value) ? value : null
}

function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.code === "number" &&
    typeof candidate.message === "string" &&
    "data" in candidate
  )
}

export async function parseHttpResponse<T>(response: Response): Promise<T> {
  const rawText = await response.text()

  if (!rawText) {
    return null as T
  }

  try {
    return JSON.parse(rawText) as T
  } catch {
    return rawText as unknown as T
  }
}

export function resolveHttpMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>
    if (typeof obj.message === "string" && obj.message.trim()) {
      return obj.message
    }
    if (obj.error && typeof obj.error === "object") {
      const errObj = obj.error as Record<string, unknown>
      if (typeof errObj.message === "string" && errObj.message.trim()) {
        return errObj.message
      }
    }
    if (typeof obj.error === "string" && obj.error.trim()) {
      return obj.error
    }
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload
  }

  return fallback
}

export async function requestHttp<T = unknown>(url: string, init?: RequestInit & { timeout?: number }): Promise<T> {
  const { timeout = 60000, ...fetchInit } = init || {}
  
  const response = await tauriFetch(url, {
    ...fetchInit,
    connectTimeout: timeout,
  })
  
  const payload = await parseHttpResponse<T>(response)

  if (!response.ok) {
    throw new Error(resolveHttpMessage(payload, response.statusText || "Request failed"))
  }

  return payload
}
