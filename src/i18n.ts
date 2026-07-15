﻿import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import enUS from "./locales/en-US.json"
import jaJP from "./locales/ja-JP.json"
import ruRU from "./locales/ru-RU.json"
import zhCN from "./locales/zh-CN.json"

const STORAGE_KEY = "g2m:locale"

const localeRegistry = {
  "zh-CN": {
    code: "ZH",
    label: "简体中文",
    messages: zhCN,
  },
  "en-US": {
    code: "EN",
    label: "English",
    messages: enUS,
  },
  "ja-JP": {
    code: "JA",
    label: "日本語",
    messages: jaJP,
  },
  "ru-RU": {
    code: "RU",
    label: "Русский",
    messages: ruRU,
  },
} as const

type AppLocale = keyof typeof localeRegistry

type LocaleOption = {
  code: string
  label: string
  value: AppLocale
}

const localeEntries = Object.entries(localeRegistry) as Array<
  [AppLocale, (typeof localeRegistry)[AppLocale]]
>

const resources = Object.fromEntries(
  localeEntries.map(([value, meta]) => [value, { translation: meta.messages }]),
) as {
  [Key in AppLocale]: {
    translation: (typeof localeRegistry)[Key]["messages"]
  }
}

const localeOptions: LocaleOption[] = localeEntries.map(([value, meta]) => ({
  code: meta.code,
  label: meta.label,
  value,
}))

function isAppLocale(value: string): value is AppLocale {
  return value in localeRegistry
}

function detectLanguage(): AppLocale {
  if (typeof window === "undefined") {
    return "zh-CN"
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY)
  if (storedValue && isAppLocale(storedValue)) {
    return storedValue
  }

  const source = window.navigator.language || ""
  if (source.startsWith("en")) {
    return "en-US"
  }
  if (source.startsWith("ja")) {
    return "ja-JP"
  }
  if (source.startsWith("ru")) {
    return "ru-RU"
  }

  return "zh-CN"
}

void i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: "zh-CN",
  interpolation: {
    escapeValue: false,
  },
})

export { STORAGE_KEY, i18n }
export { localeOptions, localeRegistry, resources }
export type { AppLocale, LocaleOption }
