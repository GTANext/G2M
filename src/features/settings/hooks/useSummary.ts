import { useTheme } from "next-themes"
import { useTranslation } from "react-i18next"

import { useAppPreferences } from "@/components/app/preferencesProvider"
import { i18n, STORAGE_KEY, type AppLocale } from "@/i18n"

function useSummary() {
  const {
    homeViewMode,
    setHomeViewMode,
    builderMappingMode,
    setBuilderMappingMode,
    modListViewMode,
    setModListViewMode,
    setShowHomeGameDetails,
    setTitleBarStyle,
    showHomeGameDetails,
    titleBarStyle,
  } = useAppPreferences()
  const { resolvedTheme, setTheme, theme = "system" } = useTheme()
  const { t } = useTranslation()
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale
  const resolvedThemeMode = resolvedTheme === "dark" ? "dark" : "light"

  function setLocale(value: AppLocale) {
    window.localStorage.setItem(STORAGE_KEY, value)
    void i18n.changeLanguage(value)
  }

  const currentThemeLabel =
    theme === "system"
      ? `${t("settings.followSystem")} · ${resolvedThemeMode === "dark" ? t("navbar.darkLabel") : t("settings.light")}`
      : theme === "dark"
        ? t("navbar.darkLabel")
        : t("settings.light")

  const currentTitleBarLabel =
    titleBarStyle === "windows" ? t("settings.windowsStyle") : t("settings.macStyle")
  const currentHomeViewLabel =
    homeViewMode === "card" ? t("settings.homeDisplayGames") : t("settings.homeDisplayMods")
  const currentBuilderModeLabel =
    builderMappingMode === "list"
      ? t("settings.builderModeList")
      : builderMappingMode === "tree"
        ? t("settings.builderModeTree")
        : t("settings.builderModeExplorer")
  const currentWorkspaceViewModeLabel =
    modListViewMode === "detailed"
      ? t("settings.workspaceViewModeDetailed")
      : t("settings.workspaceViewModeCompact")

  return {
    builderMappingMode,
    currentBuilderModeLabel,
    currentHomeViewLabel,
    currentListDisplayLabel: `${currentHomeViewLabel} · ${currentWorkspaceViewModeLabel}`,
    currentThemeLabel,
    currentTitleBarLabel,
    currentWorkspaceViewModeLabel,
    homeViewMode,
    locale,
    modListViewMode,
    resolvedThemeMode,
    setBuilderMappingMode,
    setHomeViewMode,
    setLocale,
    setModListViewMode,
    setShowHomeGameDetails,
    setTheme,
    setTitleBarStyle,
    showHomeGameDetails,
    theme,
    titleBarStyle,
  }
}

export { useSummary }
