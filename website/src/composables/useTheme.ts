import { computed, readonly, ref } from 'vue'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEYS = ['g2m-theme', 'vitepress-theme-appearance'] as const
const DARK_CLASS = 'dark'

const theme = ref<ThemeMode>('dark')
let initialized = false

function resolveTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  for (const key of STORAGE_KEYS) {
    const saved = window.localStorage.getItem(key)

    if (saved === 'light' || saved === 'dark') {
      return saved
    }
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(nextTheme: ThemeMode) {
  theme.value = nextTheme

  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return
  }

  document.documentElement.dataset.theme = nextTheme
  document.documentElement.style.colorScheme = nextTheme
  document.documentElement.classList.toggle(DARK_CLASS, nextTheme === 'dark')

  for (const key of STORAGE_KEYS) {
    window.localStorage.setItem(key, nextTheme)
  }
}

function ensureTheme() {
  if (initialized) {
    return
  }

  initialized = true
  applyTheme(resolveTheme())
}

export function useTheme() {
  ensureTheme()

  return {
    theme: readonly(theme),
    setTheme: applyTheme,
    isDark: computed(() => theme.value === 'dark'),
    toggleTheme: () => {
      applyTheme(theme.value === 'dark' ? 'light' : 'dark')
    },
  }
}
