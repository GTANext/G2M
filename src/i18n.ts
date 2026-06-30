﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import enUS from "./locales/en-US.json"
import jaJP from "./locales/ja-JP.json"
import ruRU from "./locales/ru-RU.json"
import zhCN from "./locales/zh-CN.json"

const STORAGE_KEY = "g2m:locale"

const resources = {
  "zh-CN": {
    translation: zhCN,
  },
  "en-US": {
    translation: enUS,
  },
  "ja-JP": {
    translation: jaJP,
  },
  "ru-RU": {
    translation: ruRU,
  },
} as const

function detectLanguage(): keyof typeof resources {
  if (typeof window === "undefined") {
    return "zh-CN"
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY)
  if (storedValue && storedValue in resources) {
    return storedValue as keyof typeof resources
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
