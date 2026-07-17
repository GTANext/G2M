import { computed, ref } from 'vue'

import enUS from '@/locales/en-US.json'
import jaJP from '@/locales/ja-JP.json'
import ruRU from '@/locales/ru-RU.json'
import zhCN from '@/locales/zh-CN.json'

const STORAGE_KEY = 'g2m:locale'

const localeRegistry = {
    'zh-CN': {
        code: 'ZH',
        label: '简体中文',
        messages: zhCN
    },
    'en-US': {
        code: 'EN',
        label: 'English',
        messages: enUS
    },
    'ja-JP': {
        code: 'JA',
        label: '日本語',
        messages: jaJP
    },
    'ru-RU': {
        code: 'RU',
        label: 'Русский',
        messages: ruRU
    }
} as const

type AppLocale = keyof typeof localeRegistry
type LocaleMessages = (typeof localeRegistry)[AppLocale]['messages']
type LocaleOption = {
    code: string
    label: string
    value: AppLocale
}
type TranslateParams = Record<string, number | string>

const localeEntries = Object.entries(localeRegistry) as Array<
    [AppLocale, (typeof localeRegistry)[AppLocale]]
>

const localeOptions: LocaleOption[] = localeEntries.map(([value, meta]) => ({
    code: meta.code,
    label: meta.label,
    value
}))

function isAppLocale(value: string): value is AppLocale {
    return value in localeRegistry
}

function detectLanguage(): AppLocale {
    if (typeof window === 'undefined') {
        return 'zh-CN'
    }

    const storedValue = window.localStorage.getItem(STORAGE_KEY)
    if (storedValue && isAppLocale(storedValue)) {
        return storedValue
    }

    const source = window.navigator.language || ''
    if (source.startsWith('en')) {
        return 'en-US'
    }
    if (source.startsWith('ja')) {
        return 'ja-JP'
    }
    if (source.startsWith('ru')) {
        return 'ru-RU'
    }

    return 'zh-CN'
}

const currentLocale = ref<AppLocale>(detectLanguage())

function syncDocumentTitle() {
    if (typeof document === 'undefined') {
        return
    }

    const messages = localeRegistry[currentLocale.value].messages
    const title = (messages as Record<string, unknown>).common as Record<string, string>
    document.title = title?.title || 'G2M'
}

function syncDocumentLanguage(locale: AppLocale) {
    if (typeof document === 'undefined') {
        return
    }

    document.documentElement.lang = locale
}

function getByPath(messages: LocaleMessages, key: string): unknown {
    return key.split('.').reduce<unknown>((value, segment) => {
        if (typeof value !== 'object' || value === null) {
            return undefined
        }

        return (value as Record<string, unknown>)[segment]
    }, messages)
}

function interpolate(message: string, params?: TranslateParams): string {
    if (!params) {
        return message
    }

    return message.replace(/\{\{(\w+)\}\}/g, (match, token: string) => {
        const value = params[token]
        return value === undefined ? match : String(value)
    })
}

function setLocale(locale: AppLocale) {
    currentLocale.value = locale
    syncDocumentLanguage(locale)
    syncDocumentTitle()

    if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, locale)
    }
}

function t(key: string, params?: TranslateParams): string {
    const messages = localeRegistry[currentLocale.value].messages
    const resolved = getByPath(messages, key)

    if (typeof resolved !== 'string') {
        return key
    }

    return interpolate(resolved, params)
}

function useI18n() {
    return {
        locale: computed(() => currentLocale.value),
        localeOptions,
        setLocale,
        t
    }
}

syncDocumentLanguage(currentLocale.value)
syncDocumentTitle()

export { STORAGE_KEY, localeOptions, localeRegistry, setLocale, useI18n }
export type { AppLocale, LocaleOption }
