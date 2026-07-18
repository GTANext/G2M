import { useTheme } from "next-themes"
import { useTranslation } from "react-i18next"

import { useAppPreferences } from "@/components/app/preferencesProvider"
import { i18n, STORAGE_KEY, type AppLocale } from "@/i18n"

function useSummary() {
  const {
    appUpdateApiSource,
    appUpdateDownloadSource,
    homeViewMode,
    setHomeViewMode,
    builderMappingMode,
    setBuilderMappingMode,
    modListViewMode,
    setModListViewMode,
    setAppUpdateApiSource,
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
  const currentUpdateApiSourceLabel =
    appUpdateApiSource === "gtamodx" ? t("update.sourceGtmodx") : t("update.sourceGithub")
  const currentUpdateDownloadSourceLabel =
    appUpdateDownloadSource === "proxy"
      ? t("update.downloadSourceProxy")
      : t("update.downloadSourceOfficial")

  return {
    appUpdateApiSource,
    appUpdateDownloadSource,
    builderMappingMode,
    currentBuilderModeLabel,
    currentHomeViewLabel,
    currentListDisplayLabel: `${currentHomeViewLabel} · ${currentWorkspaceViewModeLabel}`,
    currentThemeLabel,
    currentTitleBarLabel,
    currentUpdateApiSourceLabel,
    currentUpdateDownloadSourceLabel,
    currentWorkspaceViewModeLabel,
    homeViewMode,
    locale,
    modListViewMode,
    resolvedThemeMode,
    setAppUpdateApiSource,
    setAppUpdateDownloadSource,
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
  }
}

export { useSummary }
