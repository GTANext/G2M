import type { ReactNode } from "react"
import {
  AppWindowMac,
  Database,
  Eye,
  HardDrive,
  Languages,
  LayoutGrid,
  List,
  Monitor,
  MonitorCog,
  MoonStar,
  Palette,
  SunMedium,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useNavigate } from "react-router-dom"

import { useI18n } from "@/components/app/i18nProvider"
import { useAppPreferences } from "@/components/app/preferencesProvider"
import { G2MPanel, G2MPill, G2MSubtlePanel } from "@/components/g2m/surface"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

function SettingsPage() {
  const navigate = useNavigate()
  const {
    homeViewMode,
    setHomeViewMode,
    setShowHomeGameDetails,
    setTitleBarStyle,
    showHomeGameDetails,
    titleBarStyle,
  } = useAppPreferences()
  const { resolvedTheme, setTheme, theme = "system" } = useTheme()
  const { copy, locale, localeOptions, setLocale } = useI18n()
  const resolvedThemeMode = resolvedTheme === "dark" ? "dark" : "light"

  const currentThemeLabel =
    theme === "system"
      ? `${copy.settings.followSystem} · ${resolvedThemeMode === "dark" ? copy.navbar.darkLabel : copy.settings.light}`
      : theme === "dark"
        ? copy.navbar.darkLabel
        : copy.settings.light

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <G2MPanel>
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between lg:p-7">
          <div className="max-w-4xl">
            <G2MPill className="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
              {copy.common.settings}
            </G2MPill>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              {copy.settings.heroTitle}
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              {copy.settings.heroDescription}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <StatusPill label={copy.settings.theme} value={currentThemeLabel} />
              <StatusPill
                label={copy.settings.titleBar}
                value={titleBarStyle === "windows" ? copy.settings.windowsStyle : copy.settings.macStyle}
              />
              <StatusPill
                label={copy.settings.currentHomeView}
                value={homeViewMode === "card" ? copy.settings.cardMode : copy.home.listView}
              />
              <StatusPill label={copy.common.language} value={locale} />
              <StatusPill label={copy.settings.persistence} value={copy.settings.localPersistence} />
            </div>
          </div>

          <Button
            variant="outline"
            className="cursor-pointer rounded-xl border-border/70 bg-background/70 px-4 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
            onClick={() => navigate(-1)}
          >
            {copy.common.back}
          </Button>
        </div>
      </G2MPanel>

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <G2MPanel className="p-5">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
              {copy.settings.groupsTitle}
            </p>
            <div className="mt-4 space-y-3">
              <SettingsNavCard
                title={copy.settings.appearanceTitle}
                description={copy.settings.appearanceDescription}
                icon={<Palette className="size-4" />}
              />
              <SettingsNavCard
                title={copy.settings.titleBar}
                description={copy.settings.titleBarDescription}
                icon={<MonitorCog className="size-4" />}
              />
              <SettingsNavCard
                title={copy.settings.homeDisplayTitle}
                description={copy.settings.homeDisplayDescription}
                icon={<LayoutGrid className="size-4" />}
              />
              <SettingsNavCard
                title={copy.settings.languageSectionTitle}
                description={copy.settings.languageDescription}
                icon={<Languages className="size-4" />}
              />
              <SettingsNavCard
                title={copy.settings.dataStorageTitle}
                description={copy.settings.dataStorageDescription}
                icon={<Database className="size-4" />}
              />
            </div>
          </G2MPanel>

          <G2MSubtlePanel className="p-5">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{copy.settings.currentState}</p>
            <div className="mt-4 space-y-3">
              <InlineState label={copy.settings.currentTheme} value={currentThemeLabel} />
              <InlineState
                label={copy.settings.currentTitleBar}
                value={titleBarStyle === "windows" ? copy.settings.windowsStyle : copy.settings.macStyle}
              />
              <InlineState
                label={copy.settings.currentHomeView}
                value={homeViewMode === "card" ? copy.settings.cardMode : copy.home.listView}
              />
              <InlineState
                label={copy.settings.currentHomeDetails}
                value={showHomeGameDetails ? copy.settings.on : copy.settings.off}
              />
              <InlineState label={copy.settings.currentLanguage} value={locale} />
              <InlineState label={copy.settings.persistence} value={copy.common.localStorage} />
            </div>
          </G2MSubtlePanel>
        </aside>

        <div className="space-y-5">
          <G2MPanel className="p-5 lg:p-6">
            <SectionHeading
              title={copy.settings.appearanceTitle}
              description={copy.settings.themeDescription}
              icon={<Palette className="size-5" />}
            />

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <ThemeModeCard
                active={theme === "system"}
                title={copy.settings.followSystem}
                description={copy.settings.followSystemDescription(resolvedThemeMode)}
                icon={<Monitor className="size-5" />}
                onClick={() => setTheme("system")}
              />
              <ThemeModeCard
                active={theme === "light"}
                title={copy.settings.light}
                description={copy.settings.lightDescription}
                icon={<SunMedium className="size-5" />}
                onClick={() => setTheme("light")}
              />
              <ThemeModeCard
                active={theme === "dark"}
                title={copy.navbar.darkLabel}
                description={copy.navbar.darkTitle}
                icon={<MoonStar className="size-5" />}
                onClick={() => setTheme("dark")}
              />
            </div>
          </G2MPanel>

          <G2MPanel className="p-5 lg:p-6">
            <SectionHeading
              title={copy.settings.titleBar}
              description={copy.settings.titleBarDescription}
              icon={<MonitorCog className="size-5" />}
            />

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <TitleBarOptionCard
                active={titleBarStyle === "windows"}
                title={copy.settings.windowsStyle}
                description={copy.settings.windowsDescription}
                icon={<Monitor className="size-5" />}
                preview={<WindowPreview styleType="windows" />}
                onClick={() => setTitleBarStyle("windows")}
              />
              <TitleBarOptionCard
                active={titleBarStyle === "mac"}
                title={copy.settings.macStyle}
                description={copy.settings.macDescription}
                icon={<AppWindowMac className="size-5" />}
                preview={<WindowPreview styleType="mac" />}
                onClick={() => setTitleBarStyle("mac")}
              />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <InfoPanel
                label={copy.settings.buttonPosition}
                value={titleBarStyle === "windows" ? copy.settings.right : copy.settings.left}
              />
              <InfoPanel
                label={copy.settings.titleAlignment}
                value={titleBarStyle === "windows" ? copy.settings.right : copy.settings.moreCentered}
              />
              <InfoPanel label={copy.settings.defaultMode} value={copy.settings.windowsStyle} />
            </div>
          </G2MPanel>

          <G2MPanel className="p-5 lg:p-6">
            <SectionHeading
              title={copy.settings.homeDisplayTitle}
              description={copy.settings.homeDisplayDescription}
              icon={<LayoutGrid className="size-5" />}
            />

            <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              {copy.settings.viewModeLabel}
            </p>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <ThemeModeCard
                active={homeViewMode === "card"}
                title={copy.settings.cardMode}
                description={copy.settings.cardModeDescription}
                icon={<LayoutGrid className="size-5" />}
                onClick={() => setHomeViewMode("card")}
              />
              <ThemeModeCard
                active={homeViewMode === "list"}
                title={copy.home.listView}
                description={copy.home.listModeHint}
                icon={<List className="size-5" />}
                onClick={() => setHomeViewMode("list")}
              />
            </div>

            <G2MSubtlePanel className="mt-4 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                      <Eye className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{copy.settings.moreInfoLabel}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {copy.settings.moreInfoDescription}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {showHomeGameDetails ? copy.settings.on : copy.settings.off}
                  </span>
                  <Switch
                    checked={showHomeGameDetails}
                    onCheckedChange={setShowHomeGameDetails}
                    aria-label={copy.settings.moreInfoLabel}
                  />
                </div>
              </div>
            </G2MSubtlePanel>
          </G2MPanel>

          <G2MPanel className="p-5 lg:p-6">
            <SectionHeading
              title={copy.settings.languageSectionTitle}
              description={copy.settings.languageSectionDescription}
              icon={<Languages className="size-5" />}
            />

            <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              {localeOptions.map((item) => (
                <LanguageOptionCard
                  key={item.value}
                  active={locale === item.value}
                  code={item.code}
                  title={item.label}
                  description={copy.settings.languageDescription}
                  onClick={() => setLocale(item.value)}
                />
              ))}
            </div>
          </G2MPanel>

          <G2MPanel className="p-5 lg:p-6">
            <SectionHeading
              title={copy.settings.dataStorageTitle}
              description={copy.settings.dataStorageDescription}
              icon={<HardDrive className="size-5" />}
            />

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <StorageCard
                title={copy.settings.databaseTitle}
                description={copy.settings.databaseDescription}
                path="config/database.db"
              />
              <StorageCard
                title={copy.settings.storageCoversTitle}
                description={copy.settings.storageCoversDescription}
                path="assets/custom/"
              />
            </div>
          </G2MPanel>
        </div>
      </div>
    </div>
  )
}

function LanguageOptionCard({
  active,
  code,
  title,
  description,
  onClick,
}: {
  active: boolean
  code: string
  title: string
  description: string
  onClick: () => void
}) {
  const { copy } = useI18n()

  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer text-left transition-transform hover:-translate-y-0.5"
    >
      <G2MSubtlePanel
        className={cn(
          "h-full p-5",
          active && "border-violet-300/60 dark:border-violet-400/30",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 min-w-11 items-center justify-center rounded-2xl bg-slate-950 px-3 text-xs font-semibold tracking-[0.24em] text-white dark:bg-white dark:text-slate-950">
            {code}
          </div>
          <G2MPill
            className={
              active
                ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200"
                : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
            }
          >
            {active ? copy.common.current : copy.common.clickToSwitch}
          </G2MPill>
        </div>
        <h3 className="mt-5 text-xl font-semibold text-slate-950 dark:text-slate-50">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      </G2MSubtlePanel>
    </button>
  )
}

function TitleBarOptionCard({
  active,
  title,
  description,
  icon,
  preview,
  onClick,
}: {
  active: boolean
  title: string
  description: string
  icon: ReactNode
  preview: ReactNode
  onClick: () => void
}) {
  const { copy } = useI18n()

  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer text-left transition-transform hover:-translate-y-0.5"
    >
      <G2MSubtlePanel
        className={cn(
          "h-full p-5",
          active && "border-violet-300/60 dark:border-violet-400/30",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            {icon}
          </div>
          <G2MPill
            className={
              active
                ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200"
                : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
            }
          >
            {active ? copy.common.current : copy.common.clickToSwitch}
          </G2MPill>
        </div>

        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
          {description}
        </p>
        <div className="mt-5">{preview}</div>
      </G2MSubtlePanel>
    </button>
  )
}

function ThemeModeCard({
  active,
  title,
  description,
  icon,
  onClick,
}: {
  active: boolean
  title: string
  description: string
  icon: ReactNode
  onClick: () => void
}) {
  const { copy } = useI18n()

  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer text-left transition-transform hover:-translate-y-0.5"
    >
      <G2MSubtlePanel
        className={cn(
          "h-full p-5",
          active && "border-violet-300/60 dark:border-violet-400/30",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            {icon}
          </div>
          <G2MPill
            className={
              active
                ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200"
                : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
            }
          >
            {active ? copy.common.current : copy.common.clickToSwitch}
          </G2MPill>
        </div>
        <h3 className="mt-5 text-xl font-semibold text-slate-950 dark:text-slate-50">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      </G2MSubtlePanel>
    </button>
  )
}

function WindowPreview({ styleType }: { styleType: "windows" | "mac" }) {
  return (
    <div className="rounded-[22px] border border-black/5 bg-white/80 p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="rounded-[18px] border border-black/5 bg-slate-50/90 p-3 dark:border-white/10 dark:bg-slate-950/60">
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

function SettingsNavCard({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white/70 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-start gap-3 text-slate-900 dark:text-slate-100">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
    </div>
  )
}

function SectionHeading({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: ReactNode
}) {
  const { copy } = useI18n()

  return (
    <div>
      <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
            {copy.common.settings}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
        </div>
      </div>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
        {description}
      </p>
    </div>
  )
}

function StorageCard({
  title,
  description,
  path,
}: {
  title: string
  description: string
  path: string
}) {
  return (
    <G2MSubtlePanel className="p-5">
      <p className="text-lg font-semibold text-slate-950 dark:text-slate-50">{title}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      <div className="mt-4 rounded-2xl border border-black/5 bg-white/70 px-4 py-3 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
        {path}
      </div>
    </G2MSubtlePanel>
  )
}

function InfoPanel({ label, value }: { label: string; value: string }) {
  return (
    <G2MSubtlePanel className="p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    </G2MSubtlePanel>
  )
}

function InlineState({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-black/5 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  )
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <G2MPill className="bg-white/80 text-slate-600 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
      <span className="text-slate-400 dark:text-slate-500">{label}</span>
      <span className="ml-2 text-slate-900 dark:text-slate-100">{value}</span>
    </G2MPill>
  )
}

export { SettingsPage }
