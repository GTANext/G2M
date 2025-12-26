import type { UserInfo } from '../web/types'

const USER_STORAGE_KEY = 'auth_user'

export const getStoredUser = (): UserInfo | null => {
  if (!import.meta.client) return null

  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    console.error('读取用户信息失败:', error)
    return null
  }
}

export const setStoredUser = (user: UserInfo): void => {
  if (!import.meta.client || !user) return

  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  } catch (error) {
    console.error('保存用户信息失败:', error)
  }
}

export const clearStoredUser = (): void => {
  if (!import.meta.client) return

  try {
    localStorage.removeItem(USER_STORAGE_KEY)
  } catch (error) {
    console.error('清除用户信息失败:', error)
  }
}

const TOKEN_STORAGE_KEY = 'api_token'

export const getStoredToken = (): string | null => {
  if (!import.meta.client) return null

  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch (error) {
    console.error('读取 Token 失败:', error)
    return null
  }
}

export const setStoredToken = (token: string): void => {
  if (!import.meta.client || !token) return

  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } catch (error) {
    console.error('保存 Token 失败:', error)
  }
}

export const clearStoredToken = (): void => {
  if (!import.meta.client) return

  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch (error) {
    console.error('清除 Token 失败:', error)
  }
}

