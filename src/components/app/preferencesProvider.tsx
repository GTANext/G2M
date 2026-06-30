import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type TitleBarStyle = "windows" | "mac"
type HomeViewMode = "card" | "list"
type BuilderMappingMode = "list" | "tree" | "explorer"

type AppPreferencesContextValue = {
  homeViewMode: HomeViewMode
  setHomeViewMode: (value: HomeViewMode) => void
  builderMappingMode: BuilderMappingMode
  setBuilderMappingMode: (value: BuilderMappingMode) => void
  defaultBuilderOutputPath: string
  setDefaultBuilderOutputPath: (value: string) => void
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

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null)

function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const [titleBarStyle, setTitleBarStyleState] = useState<TitleBarStyle>("windows")
  const [homeViewMode, setHomeViewModeState] = useState<HomeViewMode>("card")
  const [builderMappingMode, setBuilderMappingModeState] = useState<BuilderMappingMode>("tree")
  const [defaultBuilderOutputPath, setDefaultBuilderOutputPathState] = useState("")
  const [showHomeGameDetails, setShowHomeGameDetailsState] = useState(false)

  useEffect(() => {
    const storedTitleBarStyle = window.localStorage.getItem(TITLE_BAR_STORAGE_KEY)
    if (storedTitleBarStyle === "windows" || storedTitleBarStyle === "mac") {
      setTitleBarStyleState(storedTitleBarStyle)
    }

    const storedHomeViewMode = window.localStorage.getItem(HOME_VIEW_MODE_STORAGE_KEY)
    if (storedHomeViewMode === "card" || storedHomeViewMode === "list") {
      setHomeViewModeState(storedHomeViewMode)
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

    const storedShowHomeGameDetails = window.localStorage.getItem(HOME_DETAILS_STORAGE_KEY)
    if (storedShowHomeGameDetails === "true" || storedShowHomeGameDetails === "false") {
      setShowHomeGameDetailsState(storedShowHomeGameDetails === "true")
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

  function setDefaultBuilderOutputPath(value: string) {
    setDefaultBuilderOutputPathState(value)
    window.localStorage.setItem(BUILDER_OUTPUT_PATH_STORAGE_KEY, value)
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
      defaultBuilderOutputPath,
      setDefaultBuilderOutputPath,
      setShowHomeGameDetails,
      setTitleBarStyle,
      showHomeGameDetails,
      titleBarStyle,
    }),
    [homeViewMode, builderMappingMode, defaultBuilderOutputPath, showHomeGameDetails, titleBarStyle],
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
  type TitleBarStyle,
  useAppPreferences,
}
