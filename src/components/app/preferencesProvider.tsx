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
