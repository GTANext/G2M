import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import {
  APP_UPDATE_API_SOURCE_DEFAULT,
  APP_UPDATE_DOWNLOAD_SOURCE_DEFAULT,
  type AppUpdateApiSource,
  type AppUpdateDownloadSource,
} from "@/lib/appUpdate"
import type { ModSortRule } from "@/lib/g2m"

type TitleBarStyle = "windows" | "mac"
type HomeViewMode = "card" | "list"
type BuilderMappingMode = "list" | "tree" | "explorer"
type ModListViewMode = "detailed" | "compact"

type AppPreferencesContextValue = {
  homeViewMode: HomeViewMode
  setHomeViewMode: (value: HomeViewMode) => void
  builderMappingMode: BuilderMappingMode
  setBuilderMappingMode: (value: BuilderMappingMode) => void
  modListViewMode: ModListViewMode
  setModListViewMode: (value: ModListViewMode) => void
  modSortRule: ModSortRule
  setModSortRule: (value: ModSortRule) => void
  defaultBuilderOutputPath: string
  setDefaultBuilderOutputPath: (value: string) => void
  appUpdateApiSource: AppUpdateApiSource
  setAppUpdateApiSource: (value: AppUpdateApiSource) => void
  appUpdateDownloadSource: AppUpdateDownloadSource
  setAppUpdateDownloadSource: (value: AppUpdateDownloadSource) => void
  aiApiKey: string
  setAiApiKey: (value: string) => void
  aiModelId: string
  setAiModelId: (value: string) => void
  aiProviderType: "miomoe" | "custom"
  setAiProviderType: (value: "miomoe" | "custom") => void
  aiCustomProtocol: "openai" | "anthropic" | "gemini" | "ollama"
  setAiCustomProtocol: (value: "openai" | "anthropic" | "gemini" | "ollama") => void
  aiCustomBaseUrl: string
  setAiCustomBaseUrl: (value: string) => void
  aiTimeout: number
  setAiTimeout: (value: number) => void
  setShowHomeGameDetails: (value: boolean) => void
  setTitleBarStyle: (value: TitleBarStyle) => void
  showHomeGameDetails: boolean
  titleBarStyle: TitleBarStyle
}

const TITLE_BAR_STORAGE_KEY = "g2m:title-bar-style"
const HOME_VIEW_MODE_STORAGE_KEY = "g2m:home-view-mode"
const HOME_DETAILS_STORAGE_KEY = "g2m:home-show-game-details"
const BUILDER_MAPPING_MODE_STORAGE_KEY = "g2m:builder-mapping-mode"
const BUILDER_OUTPUT_PATH_STORAGE_KEY = "g2m:builder-output-path"
const MOD_LIST_VIEW_MODE_STORAGE_KEY = "g2m:mod-list-view-mode"
const MOD_SORT_RULE_STORAGE_KEY = "g2m:mod-sort-rule"
const APP_UPDATE_API_SOURCE_STORAGE_KEY = "g2m:app-update-api-source"
const APP_UPDATE_DOWNLOAD_SOURCE_STORAGE_KEY = "g2m:app-update-download-source"
const AI_API_KEY_STORAGE_KEY = "g2m:ai-api-key"
const AI_MODEL_ID_STORAGE_KEY = "g2m:ai-model-id"
const AI_PROVIDER_TYPE_STORAGE_KEY = "g2m:ai-provider-type"
const AI_CUSTOM_PROTOCOL_STORAGE_KEY = "g2m:ai-custom-protocol"
const AI_CUSTOM_BASE_URL_STORAGE_KEY = "g2m:ai-custom-base-url"
const AI_TIMEOUT_STORAGE_KEY = "g2m:ai-timeout"

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null)

function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const [titleBarStyle, setTitleBarStyleState] = useState<TitleBarStyle>("windows")
  const [homeViewMode, setHomeViewModeState] = useState<HomeViewMode>("list")
  const [builderMappingMode, setBuilderMappingModeState] = useState<BuilderMappingMode>("tree")
  const [modListViewMode, setModListViewModeState] = useState<ModListViewMode>("detailed")
  const [modSortRule, setModSortRuleState] = useState<ModSortRule>("installedAtDesc")
  const [defaultBuilderOutputPath, setDefaultBuilderOutputPathState] = useState("")
  const [appUpdateApiSource, setAppUpdateApiSourceState] = useState<AppUpdateApiSource>(
    APP_UPDATE_API_SOURCE_DEFAULT,
  )
  const [appUpdateDownloadSource, setAppUpdateDownloadSourceState] =
    useState<AppUpdateDownloadSource>(APP_UPDATE_DOWNLOAD_SOURCE_DEFAULT)
  const [aiApiKey, setAiApiKeyState] = useState("")
  const [aiModelId, setAiModelIdState] = useState("deepseek-ai/deepseek-v4-pro")
  const [aiProviderType, setAiProviderTypeState] = useState<"miomoe" | "custom">("miomoe")
  const [aiCustomProtocol, setAiCustomProtocolState] = useState<"openai" | "anthropic" | "gemini" | "ollama">("openai")
  const [aiCustomBaseUrl, setAiCustomBaseUrlState] = useState("")
  const [aiTimeout, setAiTimeoutState] = useState(300000) // 默认 5 分钟 (300,000 ms)
  const [showHomeGameDetails, setShowHomeGameDetailsState] = useState(false)

  useEffect(() => {
    const storedTitleBarStyle = window.localStorage.getItem(TITLE_BAR_STORAGE_KEY)
    if (storedTitleBarStyle === "windows" || storedTitleBarStyle === "mac") {
      setTitleBarStyleState(storedTitleBarStyle)
    }

    const storedHomeViewMode = window.localStorage.getItem(HOME_VIEW_MODE_STORAGE_KEY)
    if (storedHomeViewMode === "card" || storedHomeViewMode === "list") {
      setHomeViewModeState(storedHomeViewMode)
    } else if (storedHomeViewMode === "games" || storedHomeViewMode === "mods") {
      setHomeViewModeState("list")
    }

    const storedBuilderMappingMode = window.localStorage.getItem(BUILDER_MAPPING_MODE_STORAGE_KEY)
    if (storedBuilderMappingMode === "list" || storedBuilderMappingMode === "tree" || storedBuilderMappingMode === "explorer") {
      setBuilderMappingModeState(storedBuilderMappingMode as BuilderMappingMode)
    } else {
      setBuilderMappingModeState("explorer")
    }

    const storedBuilderOutputPath = window.localStorage.getItem(BUILDER_OUTPUT_PATH_STORAGE_KEY)
    if (storedBuilderOutputPath) {
      setDefaultBuilderOutputPathState(storedBuilderOutputPath)
    }

    const storedModListViewMode = window.localStorage.getItem(MOD_LIST_VIEW_MODE_STORAGE_KEY)
    if (storedModListViewMode === "detailed" || storedModListViewMode === "compact") {
      setModListViewModeState(storedModListViewMode)
    }

    const storedModSortRule = window.localStorage.getItem(MOD_SORT_RULE_STORAGE_KEY)
    if (
      storedModSortRule === "installedAtDesc" ||
      storedModSortRule === "installedAtAsc" ||
      storedModSortRule === "nameAsc" ||
      storedModSortRule === "nameDesc"
    ) {
      setModSortRuleState(storedModSortRule)
    }

    const storedShowHomeGameDetails = window.localStorage.getItem(HOME_DETAILS_STORAGE_KEY)
    if (storedShowHomeGameDetails === "true" || storedShowHomeGameDetails === "false") {
      setShowHomeGameDetailsState(storedShowHomeGameDetails === "true")
    }

    const storedAppUpdateApiSource = window.localStorage.getItem(APP_UPDATE_API_SOURCE_STORAGE_KEY)
    if (storedAppUpdateApiSource === "gtamodx" || storedAppUpdateApiSource === "github") {
      setAppUpdateApiSourceState(storedAppUpdateApiSource)
    }

    const storedAppUpdateDownloadSource = window.localStorage.getItem(
      APP_UPDATE_DOWNLOAD_SOURCE_STORAGE_KEY,
    )
    if (storedAppUpdateDownloadSource === "proxy" || storedAppUpdateDownloadSource === "official") {
      setAppUpdateDownloadSourceState(storedAppUpdateDownloadSource)
    }

    const storedAiApiKey = window.localStorage.getItem(AI_API_KEY_STORAGE_KEY)
    if (storedAiApiKey) {
      setAiApiKeyState(storedAiApiKey)
    }

    const storedAiModelId = window.localStorage.getItem(AI_MODEL_ID_STORAGE_KEY)
    if (storedAiModelId) {
      setAiModelIdState(storedAiModelId)
    }

    const storedAiProviderType = window.localStorage.getItem(AI_PROVIDER_TYPE_STORAGE_KEY)
    if (storedAiProviderType === "miomoe" || storedAiProviderType === "custom") {
      setAiProviderTypeState(storedAiProviderType)
    }

    const storedAiCustomProtocol = window.localStorage.getItem(AI_CUSTOM_PROTOCOL_STORAGE_KEY)
    if (
      storedAiCustomProtocol === "openai" ||
      storedAiCustomProtocol === "anthropic" ||
      storedAiCustomProtocol === "gemini" ||
      storedAiCustomProtocol === "ollama"
    ) {
      setAiCustomProtocolState(storedAiCustomProtocol)
    }

    const storedAiCustomBaseUrl = window.localStorage.getItem(AI_CUSTOM_BASE_URL_STORAGE_KEY)
    if (storedAiCustomBaseUrl) {
      setAiCustomBaseUrlState(storedAiCustomBaseUrl)
    }

    const storedAiTimeout = window.localStorage.getItem(AI_TIMEOUT_STORAGE_KEY)
    if (storedAiTimeout) {
      const parsedTimeout = parseInt(storedAiTimeout, 10)
      if (!isNaN(parsedTimeout)) {
        setAiTimeoutState(parsedTimeout)
      }
    }
  }, [])

  function setTitleBarStyle(value: TitleBarStyle) {
    setTitleBarStyleState(value)
    window.localStorage.setItem(TITLE_BAR_STORAGE_KEY, value)
  }

  function setHomeViewMode(value: HomeViewMode) {
    setHomeViewModeState(value)
    window.localStorage.setItem(HOME_VIEW_MODE_STORAGE_KEY, value)
  }

  function setBuilderMappingMode(value: BuilderMappingMode) {
    setBuilderMappingModeState(value)
    window.localStorage.setItem(BUILDER_MAPPING_MODE_STORAGE_KEY, value)
  }

  function setModListViewMode(value: ModListViewMode) {
    setModListViewModeState(value)
    window.localStorage.setItem(MOD_LIST_VIEW_MODE_STORAGE_KEY, value)
  }

  function setModSortRule(value: ModSortRule) {
    setModSortRuleState(value)
    window.localStorage.setItem(MOD_SORT_RULE_STORAGE_KEY, value)
  }

  function setDefaultBuilderOutputPath(value: string) {
    setDefaultBuilderOutputPathState(value)
    window.localStorage.setItem(BUILDER_OUTPUT_PATH_STORAGE_KEY, value)
  }

  function setAppUpdateApiSource(value: AppUpdateApiSource) {
    setAppUpdateApiSourceState(value)
    window.localStorage.setItem(APP_UPDATE_API_SOURCE_STORAGE_KEY, value)
  }

  function setAppUpdateDownloadSource(value: AppUpdateDownloadSource) {
    setAppUpdateDownloadSourceState(value)
    window.localStorage.setItem(APP_UPDATE_DOWNLOAD_SOURCE_STORAGE_KEY, value)
  }

  function setAiApiKey(value: string) {
    setAiApiKeyState(value)
    window.localStorage.setItem(AI_API_KEY_STORAGE_KEY, value)
  }

  function setAiModelId(value: string) {
    setAiModelIdState(value)
    window.localStorage.setItem(AI_MODEL_ID_STORAGE_KEY, value)
  }

  function setAiProviderType(value: "miomoe" | "custom") {
    setAiProviderTypeState(value)
    window.localStorage.setItem(AI_PROVIDER_TYPE_STORAGE_KEY, value)
  }

  function setAiCustomProtocol(value: "openai" | "anthropic" | "gemini" | "ollama") {
    setAiCustomProtocolState(value)
    window.localStorage.setItem(AI_CUSTOM_PROTOCOL_STORAGE_KEY, value)
  }

  function setAiCustomBaseUrl(value: string) {
    setAiCustomBaseUrlState(value)
    window.localStorage.setItem(AI_CUSTOM_BASE_URL_STORAGE_KEY, value)
  }

  function setAiTimeout(value: number) {
    setAiTimeoutState(value)
    window.localStorage.setItem(AI_TIMEOUT_STORAGE_KEY, value.toString())
  }

  function setShowHomeGameDetails(value: boolean) {
    setShowHomeGameDetailsState(value)
    window.localStorage.setItem(HOME_DETAILS_STORAGE_KEY, String(value))
  }

  const value = useMemo(
    () => ({
      homeViewMode,
      setHomeViewMode,
      builderMappingMode,
      setBuilderMappingMode,
      modListViewMode,
      setModListViewMode,
      modSortRule,
      setModSortRule,
      defaultBuilderOutputPath,
      setDefaultBuilderOutputPath,
      appUpdateApiSource,
      setAppUpdateApiSource,
      appUpdateDownloadSource,
      setAppUpdateDownloadSource,
      aiApiKey,
      setAiApiKey,
      aiModelId,
      setAiModelId,
      aiProviderType,
      setAiProviderType,
      aiCustomProtocol,
      setAiCustomProtocol,
      aiCustomBaseUrl,
      setAiCustomBaseUrl,
      aiTimeout,
      setAiTimeout,
      setShowHomeGameDetails,
      setTitleBarStyle,
      showHomeGameDetails,
      titleBarStyle,
    }),
    [
      homeViewMode,
      builderMappingMode,
      modListViewMode,
      modSortRule,
      defaultBuilderOutputPath,
      appUpdateApiSource,
      appUpdateDownloadSource,
      aiApiKey,
      aiModelId,
      aiProviderType,
      aiCustomProtocol,
      aiCustomBaseUrl,
      aiTimeout,
      showHomeGameDetails,
      titleBarStyle,
    ],
  )

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  )
}

function useAppPreferences() {
  const context = useContext(AppPreferencesContext)
  if (!context) {
    throw new Error("useAppPreferences must be used within AppPreferencesProvider")
  }

  return context
}

export {
  AppPreferencesProvider,
  type BuilderMappingMode,
  type HomeViewMode,
  type ModListViewMode,
  type TitleBarStyle,
  useAppPreferences,
}
