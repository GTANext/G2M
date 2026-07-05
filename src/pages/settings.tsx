import type { ReactNode } from "react"
import {
  AppWindowMac,
  Eye,
  Languages,
  LayoutGrid,
  List,
  Monitor,
  MonitorCog,
  MoonStar,
  Palette,
  SunMedium,
  Hammer,
  MousePointer2,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { useI18n } from "@/components/app/i18nProvider"
import { useAppPreferences } from "@/components/app/preferencesProvider"
import { G2MPageHeroCard } from "@/components/g2m/pageHeroCard"
import { G2MPanel, G2MPill, G2MSubtlePanel } from "@/components/g2m/surface"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const optionCardClass =
  "h-full rounded-[24px] border border-white/70 bg-white/70 p-5 text-left shadow-[0_12px_32px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.04] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/[0.04]"

function SettingsPage() {
  const navigate = useNavigate()
  const {
    homeViewMode,
    setHomeViewMode,
    builderMappingMode,
    setBuilderMappingMode,
    setShowHomeGameDetails,
    setTitleBarStyle,
    showHomeGameDetails,
    titleBarStyle,
  } = useAppPreferences()
  const { resolvedTheme, setTheme, theme = "system" } = useTheme()
  const { locale, localeOptions, setLocale } = useI18n()
  const { t } = useTranslation()
  const resolvedThemeMode = resolvedTheme === "dark" ? "dark" : "light"

  const currentThemeLabel =
    theme === "system"
      ? `${t("settings.followSystem")} · ${resolvedThemeMode === "dark" ? t("navbar.darkLabel") : t("settings.light")}`
      : theme === "dark"
        ? t("navbar.darkLabel")
        : t("settings.light")

  const currentTitleBarLabel =
    titleBarStyle === "windows" ? t("settings.windowsStyle") : t("settings.macStyle")
  const currentHomeViewLabel =
    homeViewMode === "card" ? t("settings.cardMode") : t("home.listView")
  const currentBuilderModeLabel =
    builderMappingMode === "list"
      ? t("settings.builderModeList")
      : builderMappingMode === "tree"
        ? t("settings.builderModeTree")
        : t("settings.builderModeExplorer")

  return (
    <div className="mx-auto max-w-[1380px] space-y-6">
      <G2MPageHeroCard
        eyebrow={t("common.settings")}
        title={t("settings.heroTitle")}
        description={t("settings.heroDescription")}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="cursor-pointer rounded-xl border-border/70 bg-background/70 px-4 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              onClick={() => navigate("/about")}
            >
              <MonitorCog className="mr-2 size-4" />
              关于应用
            </Button>
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
          <div className="rounded-[28px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.68),rgba(248,250,252,0.56))] ring-1 ring-black/[0.04] backdrop-blur-2xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.48),rgba(15,23,42,0.3))] dark:ring-white/[0.04]">
            <div className="border-b border-black/5 px-4 py-4 dark:border-white/10 sm:px-5">
              <TabsList className="!grid !h-auto !w-full grid-cols-2 gap-1 rounded-full bg-black/[0.04] p-1 dark:bg-white/[0.05] sm:grid-cols-3 xl:grid-cols-5">
                <SettingsTabTrigger value="appearance" title={t("settings.appearanceTitle")} />
                <SettingsTabTrigger value="title-bar" title={t("settings.titleBar")} />
                <SettingsTabTrigger value="home" title={t("settings.homeDisplayTitle")} />
                <SettingsTabTrigger value="builder" title={t("navbar.builder")} />
                <SettingsTabTrigger value="language" title={t("settings.languageSectionTitle")} />
              </TabsList>
            </div>

            <div className="p-4 sm:p-5 lg:p-6">
              <TabsContent value="appearance" className="mt-0">
                <SettingsSectionShell
                  title={t("settings.appearanceTitle")}
                  description={t("settings.appearanceDescription")}
                  badge={currentThemeLabel}
                  icon={<Palette className="size-5" />}
                >
                  <div className="grid gap-4 lg:grid-cols-3">
                    <SettingsChoiceCard
                      active={theme === "system"}
                      title={t("settings.followSystem")}
                      description={t("settings.followSystemDescription", { mode: resolvedThemeMode })}
                      icon={<Monitor className="size-5" />}
                      onClick={() => setTheme("system")}
                    />
                    <SettingsChoiceCard
                      active={theme === "light"}
                      title={t("settings.light")}
                      description={t("settings.lightDescription")}
                      icon={<SunMedium className="size-5" />}
                      onClick={() => setTheme("light")}
                    />
                    <SettingsChoiceCard
                      active={theme === "dark"}
                      title={t("navbar.darkLabel")}
                      description={t("navbar.darkTitle")}
                      icon={<MoonStar className="size-5" />}
                      onClick={() => setTheme("dark")}
                    />
                  </div>
                </SettingsSectionShell>
              </TabsContent>

              <TabsContent value="title-bar" className="mt-0">
                <SettingsSectionShell
                  title={t("settings.titleBar")}
                  description={t("settings.titleBarDescription")}
                  badge={currentTitleBarLabel}
                  icon={<MonitorCog className="size-5" />}
                >
                  <div className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <SettingsChoiceCard
                        active={titleBarStyle === "windows"}
                        title={t("settings.windowsStyle")}
                        description={t("settings.windowsDescription")}
                        icon={<Monitor className="size-5" />}
                        preview={<WindowPreview styleType="windows" />}
                        onClick={() => setTitleBarStyle("windows")}
                      />
                      <SettingsChoiceCard
                        active={titleBarStyle === "mac"}
                        title={t("settings.macStyle")}
                        description={t("settings.macDescription")}
                        icon={<AppWindowMac className="size-5" />}
                        preview={<WindowPreview styleType="mac" />}
                        onClick={() => setTitleBarStyle("mac")}
                      />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                      <SettingsMiniStat
                        label={t("settings.buttonPosition")}
                        value={titleBarStyle === "windows" ? t("settings.right") : t("settings.left")}
                      />
                      <SettingsMiniStat
                        label={t("settings.titleAlignment")}
                        value={titleBarStyle === "windows" ? t("settings.right") : t("settings.moreCentered")}
                      />
                      <SettingsMiniStat
                        label={t("settings.defaultMode")}
                        value={t("settings.windowsStyle")}
                      />
                    </div>
                  </div>
                </SettingsSectionShell>
              </TabsContent>

              <TabsContent value="home" className="mt-0">
                <SettingsSectionShell
                  title={t("settings.homeDisplayTitle")}
                  description={t("settings.homeDisplayDescription")}
                  badge={currentHomeViewLabel}
                  icon={<LayoutGrid className="size-5" />}
                >
                  <div className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <SettingsChoiceCard
                        active={homeViewMode === "card"}
                        title={t("settings.cardMode")}
                        description={t("settings.cardModeDescription")}
                        icon={<LayoutGrid className="size-5" />}
                        onClick={() => setHomeViewMode("card")}
                      />
                      <SettingsChoiceCard
                        active={homeViewMode === "list"}
                        title={t("home.listView")}
                        description={t("home.listModeHint")}
                        icon={<List className="size-5" />}
                        onClick={() => setHomeViewMode("list")}
                      />
                    </div>

                    <SettingsToggleCard
                      title={t("settings.moreInfoLabel")}
                      description={t("settings.moreInfoDescription")}
                      icon={<Eye className="size-5" />}
                      checked={showHomeGameDetails}
                      checkedLabel={showHomeGameDetails ? t("settings.on") : t("settings.off")}
                      onCheckedChange={setShowHomeGameDetails}
                    />
                  </div>
                </SettingsSectionShell>
              </TabsContent>

              <TabsContent value="builder" className="mt-0">
                <SettingsSectionShell
                  title={t("settings.builderModeTitle")}
                  description={t("settings.builderModeDescription")}
                  badge={currentBuilderModeLabel}
                  icon={<Hammer className="size-5" />}
                >
                  <div className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-3">
                      <SettingsChoiceCard
                        active={builderMappingMode === "list"}
                        title={t("settings.builderModeList")}
                        description={t("settings.builderModeListDescription")}
                        icon={<List className="size-5" />}
                        onClick={() => setBuilderMappingMode("list")}
                      />
                      <SettingsChoiceCard
                        active={builderMappingMode === "tree"}
                        title={t("settings.builderModeTree")}
                        description={t("settings.builderModeTreeDescription")}
                        icon={<List className="size-5" />}
                        onClick={() => setBuilderMappingMode("tree")}
                      />
                      <SettingsChoiceCard
                        active={builderMappingMode === "explorer"}
                        title={t("settings.builderModeExplorer")}
                        description={t("settings.builderModeExplorerDescription")}
                        icon={<MousePointer2 className="size-5" />}
                        onClick={() => setBuilderMappingMode("explorer")}
                      />
                    </div>
                  </div>
                </SettingsSectionShell>
              </TabsContent>

              <TabsContent value="language" className="mt-0">
                <SettingsSectionShell
                  title={t("settings.languageSectionTitle")}
                  description={t("settings.languageSectionDescription")}
                  badge={locale}
                  icon={<Languages className="size-5" />}
                >
                  <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                    {localeOptions.map((item) => (
                      <SettingsLanguageCard
                        key={item.value}
                        active={locale === item.value}
                        code={item.code}
                        title={item.label}
                        description={t("settings.languageDescription")}
                        onClick={() => setLocale(item.value)}
                      />
                    ))}
                  </div>
                </SettingsSectionShell>
              </TabsContent>
            </div>
          </div>
        </G2MPanel>
      </Tabs>
    </div>
  )
}

function SettingsTabTrigger({
  value,
  title,
}: {
  value: string
  title: string
}) {
  return (
    <TabsTrigger
      value={value}
      className="!h-auto rounded-full border border-transparent bg-transparent px-3 py-2.5 text-sm font-medium text-slate-500 transition-all hover:text-slate-800 data-active:border-white/80 data-active:bg-white/90 data-active:text-slate-950 data-active:shadow-[0_6px_20px_rgba(15,23,42,0.08)] dark:text-slate-300 dark:hover:text-slate-100 dark:data-active:border-white/10 dark:data-active:bg-white/[0.08] dark:data-active:text-slate-50"
    >
      {title}
    </TabsTrigger>
  )
}

function SettingsSectionShell({
  title,
  description,
  badge,
  icon,
  children,
}: {
  title: string
  description: string
  badge: string
  icon: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-black/[0.05] text-slate-700 dark:bg-white/[0.08] dark:text-slate-100">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
              {t("common.settings")}
            </p>
            <h2 className="mt-2 text-[30px] font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              {title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              {description}
            </p>
          </div>
        </div>

        <G2MPill className="w-fit bg-black/[0.04] text-slate-600 dark:bg-white/[0.08] dark:text-slate-300">
          {badge}
        </G2MPill>
      </div>

      <div>{children}</div>
    </section>
  )
}

function SettingsChoiceCard({
  active,
  title,
  description,
  icon,
  preview,
  onClick,
}: {
  active: boolean
  title: string
  description: ReactNode
  icon: ReactNode
  preview?: ReactNode
  onClick: () => void
}) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        optionCardClass,
        "cursor-pointer",
        active
          ? "border-sky-200/80 bg-sky-50/80 ring-2 ring-sky-100 dark:border-sky-400/30 dark:bg-sky-500/10 dark:ring-sky-400/15"
          : "hover:border-black/10 dark:hover:border-white/15",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-black/[0.05] text-slate-700 dark:bg-white/[0.08] dark:text-slate-100">
          {icon}
        </div>
        <G2MPill
          className={
            active
              ? "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200"
              : "bg-black/[0.04] text-slate-500 dark:bg-white/[0.08] dark:text-slate-300"
          }
        >
          {active ? t("common.current") : t("common.clickToSwitch")}
        </G2MPill>
      </div>

      <h3 className="mt-5 text-lg font-semibold text-slate-950 dark:text-slate-50">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {description}
      </p>
      {preview ? <div className="mt-5">{preview}</div> : null}
    </button>
  )
}

function SettingsToggleCard({
  title,
  description,
  icon,
  checked,
  checkedLabel,
  onCheckedChange,
}: {
  title: string
  description: string
  icon: ReactNode
  checked: boolean
  checkedLabel: string
  onCheckedChange: (value: boolean) => void
}) {
  return (
    <G2MSubtlePanel className="rounded-[24px] border border-white/75 bg-white/65 p-5 ring-1 ring-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/[0.04]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-black/[0.05] text-slate-700 dark:bg-white/[0.08] dark:text-slate-100">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
              {title}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-full border border-black/5 bg-white/80 px-4 py-2 dark:border-white/10 dark:bg-white/[0.05]">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {checkedLabel}
          </span>
          <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={title} />
        </div>
      </div>
    </G2MSubtlePanel>
  )
}

function SettingsLanguageCard({
  active,
  title,
  description,
  code,
  onClick,
}: {
  active: boolean
  title: string
  description: string
  code: string
  onClick: () => void
}) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        optionCardClass,
        "cursor-pointer",
        active
          ? "border-sky-200/80 bg-sky-50/80 ring-2 ring-sky-100 dark:border-sky-400/30 dark:bg-sky-500/10 dark:ring-sky-400/15"
          : "hover:border-black/10 dark:hover:border-white/15",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 min-w-11 items-center justify-center rounded-2xl bg-black/[0.05] px-3 text-xs font-semibold tracking-[0.22em] text-slate-700 dark:bg-white/[0.08] dark:text-slate-100">
          {code}
        </div>
        <G2MPill
          className={
            active
              ? "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200"
              : "bg-black/[0.04] text-slate-500 dark:bg-white/[0.08] dark:text-slate-300"
          }
        >
          {active ? t("common.current") : t("common.clickToSwitch")}
        </G2MPill>
      </div>

      <h3 className="mt-5 text-lg font-semibold text-slate-950 dark:text-slate-50">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {description}
      </p>
    </button>
  )
}

function WindowPreview({ styleType }: { styleType: "windows" | "mac" }) {
  return (
    <div className="rounded-[20px] border border-black/5 bg-white/70 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
      <div className="rounded-[16px] border border-black/5 bg-slate-50/90 p-3 dark:border-white/10 dark:bg-slate-950/60">
        <div className="flex items-center justify-between">
          {styleType === "mac" ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-[#ff5f57]" />
                <span className="size-3 rounded-full bg-[#febc2e]" />
                <span className="size-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="h-2 w-24 rounded-full bg-slate-300/80 dark:bg-slate-700" />
              <div className="w-10" />
            </>
          ) : (
            <>
              <div className="h-2 w-24 rounded-full bg-slate-300/80 dark:bg-slate-700" />
              <div className="flex items-center gap-1.5">
                <span className="h-6 w-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
                <span className="h-6 w-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
                <span className="h-6 w-8 rounded-lg bg-red-100 dark:bg-red-500/20" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SettingsMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <G2MSubtlePanel className="rounded-[20px] border border-white/75 bg-white/60 p-4 ring-1 ring-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/[0.04]">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {value}
      </p>
    </G2MSubtlePanel>
  )
}

export { SettingsPage }
