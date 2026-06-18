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

type AppPreferencesContextValue = {
  homeViewMode: HomeViewMode
  setHomeViewMode: (value: HomeViewMode) => void
  setShowHomeGameDetails: (value: boolean) => void
  setTitleBarStyle: (value: TitleBarStyle) => void
  showHomeGameDetails: boolean
  titleBarStyle: TitleBarStyle
}

const TITLE_BAR_STORAGE_KEY = "g2m:title-bar-style"
const HOME_VIEW_MODE_STORAGE_KEY = "g2m:home-view-mode"
const HOME_DETAILS_STORAGE_KEY = "g2m:home-show-game-details"

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null)

function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const [titleBarStyle, setTitleBarStyleState] = useState<TitleBarStyle>("windows")
  const [homeViewMode, setHomeViewModeState] = useState<HomeViewMode>("card")
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

  function setShowHomeGameDetails(value: boolean) {
    setShowHomeGameDetailsState(value)
    window.localStorage.setItem(HOME_DETAILS_STORAGE_KEY, String(value))
  }

  const value = useMemo(
    () => ({
      homeViewMode,
      setHomeViewMode,
      setShowHomeGameDetails,
      setTitleBarStyle,
      showHomeGameDetails,
      titleBarStyle,
    }),
    [homeViewMode, showHomeGameDetails, titleBarStyle],
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

export { AppPreferencesProvider, type HomeViewMode, type TitleBarStyle, useAppPreferences }
