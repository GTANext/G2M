import {
  AlignJustify,
  AppWindowMac,
  Eye,
  Languages,
  LayoutGrid,
  Layers3,
  List,
  Monitor,
  MonitorCog,
  MoonStar,
  Palette,
  SunMedium,
  Hammer,
  MousePointer2,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { G2MPageHeroCard } from "@/components/g2m/pageHeroCard"
import { G2MPanel, G2MPill, G2MSubtlePanel } from "@/components/g2m/surface"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs"
import { ChoiceCard, LanguageCard, ToggleCard } from "@/features/settings/components/Cards"
import { CategoryHeader, MiniStat, SectionShell, TabTrigger } from "@/features/settings/components/Layout"
import { WindowPreview } from "@/features/settings/components/WindowPreview"
import { useSummary } from "@/features/settings/hooks/useSummary"
import { localeOptions } from "@/i18n"

function Page() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    builderMappingMode,
    currentBuilderModeLabel,
    currentHomeViewLabel,
    currentListDisplayLabel,
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
  } = useSummary()

  return (
    <div className="mx-auto max-w-[1700px] space-y-6">
      <G2MPageHeroCard
        eyebrow={t("common.settings")}
        title={t("settings.heroTitle")}
        description={t("settings.heroDescription")}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="cursor-pointer rounded-xl border-border/70 bg-background/70 px-4 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              onClick={() => navigate(-1)}
            >
              {t("common.back")}
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="appearance">
        <G2MPanel className="overflow-hidden p-2">
          <div className="border-b border-black/5 px-4 py-4 dark:border-white/10 sm:px-5">
            <TabsList className="!grid !h-auto !w-full grid-cols-2 gap-1 rounded-full bg-black/[0.04] p-1 dark:bg-white/[0.05] sm:grid-cols-3 xl:grid-cols-5">
              <TabTrigger value="appearance" title={t("settings.appearanceTitle")} />
              <TabTrigger value="title-bar" title={t("settings.titleBar")} />
              <TabTrigger value="list-display" title={t("settings.listDisplayTitle")} />
              <TabTrigger value="builder" title={t("navbar.builder")} />
              <TabTrigger value="language" title={t("settings.languageSectionTitle")} />
            </TabsList>
          </div>

          <div className="p-4 sm:p-5 lg:p-6">
            <TabsContent value="appearance" className="mt-0">
              <SectionShell
                title={t("settings.appearanceTitle")}
                description={t("settings.appearanceDescription")}
                badge={currentThemeLabel}
                icon={<Palette className="size-5" />}
              >
                <div className="grid gap-4 lg:grid-cols-3">
                  <ChoiceCard
                    active={theme === "system"}
                    title={t("settings.followSystem")}
                    description={t("settings.followSystemDescription", { mode: resolvedThemeMode })}
                    icon={<Monitor className="size-5" />}
                    onClick={() => setTheme("system")}
                  />
                  <ChoiceCard
                    active={theme === "light"}
                    title={t("settings.light")}
                    description={t("settings.lightDescription")}
                    icon={<SunMedium className="size-5" />}
                    onClick={() => setTheme("light")}
                  />
                  <ChoiceCard
                    active={theme === "dark"}
                    title={t("navbar.darkLabel")}
                    description={t("navbar.darkTitle")}
                    icon={<MoonStar className="size-5" />}
                    onClick={() => setTheme("dark")}
                  />
                </div>
              </SectionShell>
            </TabsContent>

            <TabsContent value="title-bar" className="mt-0">
              <SectionShell
                title={t("settings.titleBar")}
                description={t("settings.titleBarDescription")}
                badge={currentTitleBarLabel}
                icon={<MonitorCog className="size-5" />}
              >
                <div className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <ChoiceCard
                      active={titleBarStyle === "windows"}
                      title={t("settings.windowsStyle")}
                      description={t("settings.windowsDescription")}
                      icon={<Monitor className="size-5" />}
                      preview={<WindowPreview styleType="windows" />}
                      onClick={() => setTitleBarStyle("windows")}
                    />
                    <ChoiceCard
                      active={titleBarStyle === "mac"}
                      title={t("settings.macStyle")}
                      description={t("settings.macDescription")}
                      icon={<AppWindowMac className="size-5" />}
                      preview={<WindowPreview styleType="mac" />}
                      onClick={() => setTitleBarStyle("mac")}
                    />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <MiniStat
                      label={t("settings.buttonPosition")}
                      value={titleBarStyle === "windows" ? t("settings.right") : t("settings.left")}
                    />
                    <MiniStat
                      label={t("settings.titleAlignment")}
                      value={titleBarStyle === "windows" ? t("settings.right") : t("settings.moreCentered")}
                    />
                    <MiniStat
                      label={t("settings.defaultMode")}
                      value={t("settings.windowsStyle")}
                    />
                  </div>
                </div>
              </SectionShell>
            </TabsContent>

            <TabsContent value="list-display" className="mt-0">
              <SectionShell
                title={t("settings.listDisplayTitle")}
                description={t("settings.listDisplayDescription")}
                badge={currentListDisplayLabel}
                icon={<List className="size-5" />}
              >
                <div className="space-y-6">
                  <G2MSubtlePanel className="rounded-[28px] border border-white/75 bg-white/65 p-5 ring-1 ring-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/[0.04]">
                    <CategoryHeader
                      title={t("settings.homeDisplayTitle")}
                      description={t("settings.homeDisplayDescription")}
                      icon={<LayoutGrid className="size-5" />}
                    />

                    <div className="mt-5 space-y-4">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <ChoiceCard
                          active={homeViewMode === "card"}
                          title={t("settings.homeDisplayGames")}
                          description={t("settings.homeDisplayGamesDescription")}
                          icon={<LayoutGrid className="size-5" />}
                          onClick={() => setHomeViewMode("card")}
                        />
                        <ChoiceCard
                          active={homeViewMode === "list"}
                          title={t("settings.homeDisplayMods")}
                          description={t("settings.homeDisplayModsDescription")}
                          icon={<List className="size-5" />}
                          onClick={() => setHomeViewMode("list")}
                        />
                      </div>

                      <ToggleCard
                        title={t("settings.moreInfoLabel")}
                        description={t("settings.moreInfoDescription")}
                        icon={<Eye className="size-5" />}
                        checked={showHomeGameDetails}
                        checkedLabel={showHomeGameDetails ? t("settings.on") : t("settings.off")}
                        onCheckedChange={setShowHomeGameDetails}
                      />
                    </div>
                  </G2MSubtlePanel>

                  <G2MSubtlePanel className="rounded-[28px] border border-white/75 bg-white/65 p-5 ring-1 ring-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/[0.04]">
                    <CategoryHeader
                      title={t("settings.workspaceDisplayTitle")}
                      description={t("settings.workspaceDisplayDescription")}
                      icon={<Layers3 className="size-5" />}
                    />

                    <div className="mt-5 space-y-4">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <ChoiceCard
                          active={modListViewMode === "detailed"}
                          title={t("settings.workspaceViewModeDetailed")}
                          description={t("settings.workspaceViewModeDetailedDescription")}
                          icon={<AlignJustify className="size-5" />}
                          onClick={() => setModListViewMode("detailed")}
                        />
                        <ChoiceCard
                          active={modListViewMode === "compact"}
                          title={t("settings.workspaceViewModeCompact")}
                          description={t("settings.workspaceViewModeCompactDescription")}
                          icon={<List className="size-5" />}
                          onClick={() => setModListViewMode("compact")}
                        />
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <MiniStat
                          label={t("settings.workspaceDisplayModeLabel")}
                          value={currentWorkspaceViewModeLabel}
                        />
                        <MiniStat
                          label={t("settings.homeDisplayTitle")}
                          value={currentHomeViewLabel}
                        />
                      </div>
                    </div>
                  </G2MSubtlePanel>
                </div>
              </SectionShell>
            </TabsContent>

            <TabsContent value="builder" className="mt-0">
              <SectionShell
                title={t("settings.builderModeTitle")}
                description={t("settings.builderModeDescription")}
                badge={currentBuilderModeLabel}
                icon={<Hammer className="size-5" />}
              >
                <div className="grid gap-4 lg:grid-cols-3">
                  <ChoiceCard
                    active={builderMappingMode === "list"}
                    title={t("settings.builderModeList")}
                    description={t("settings.builderModeListDescription")}
                    icon={<List className="size-5" />}
                    onClick={() => setBuilderMappingMode("list")}
                  />
                  <ChoiceCard
                    active={builderMappingMode === "tree"}
                    title={t("settings.builderModeTree")}
                    description={t("settings.builderModeTreeDescription")}
                    icon={<List className="size-5" />}
                    onClick={() => setBuilderMappingMode("tree")}
                  />
                  <ChoiceCard
                    active={builderMappingMode === "explorer"}
                    title={t("settings.builderModeExplorer")}
                    description={t("settings.builderModeExplorerDescription")}
                    icon={<MousePointer2 className="size-5" />}
                    onClick={() => setBuilderMappingMode("explorer")}
                  />
                </div>
              </SectionShell>
            </TabsContent>

            <TabsContent value="language" className="mt-0">
              <SectionShell
                title={t("settings.languageSectionTitle")}
                description={t("settings.languageSectionDescription")}
                badge={locale}
                icon={<Languages className="size-5" />}
              >
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                  {localeOptions.map((item) => (
                    <LanguageCard
                      key={item.value}
                      active={locale === item.value}
                      code={item.code}
                      title={item.label}
                      description={t("settings.languageDescription")}
                      onClick={() => setLocale(item.value)}
                    />
                  ))}
                </div>
              </SectionShell>
            </TabsContent>
          </div>
        </G2MPanel>
      </Tabs>
    </div>
  )
}

export { Page }
