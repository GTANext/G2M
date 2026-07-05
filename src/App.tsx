import { lazy, Suspense, type ReactNode, useEffect, useRef, useState } from "react"
import { openUrl } from "@tauri-apps/plugin-opener"
import { ShieldAlert, X } from "lucide-react"
import { Navbar } from "@/components/app/navbar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster } from "@/components/ui/sonner"
import { useG2mWorkspace } from "@/hooks/useG2MWorkspace"
import { invokeApi } from "@/lib/api"
import type { AppInfoPayload } from "@/lib/g2m"
import { Navigate, Route, Routes } from "react-router-dom"
import { useTranslation } from "react-i18next"
import "./App.css"

const HomePage = lazy(() =>
  import("@/pages/home").then((module) => ({ default: module.HomePage })),
)
const SettingsPage = lazy(() =>
  import("@/pages/settings").then((module) => ({ default: module.SettingsPage })),
)
const AboutPage = lazy(() =>
  import("@/pages/about").then((module) => ({ default: module.AboutPage })),
)
const ModBuilderPage = lazy(() =>
  import("@/pages/builder").then((module) => ({ default: module.ModBuilderPage })),
)
const GameWorkspacePage = lazy(() =>
  import("@/pages/workspace").then((module) => ({ default: module.GameWorkspacePage })),
)
const WorkspaceDialogs = lazy(() =>
  import("@/components/g2m/workspaceDialogs").then((module) => ({
    default: module.WorkspaceDialogs,
  })),
)

function AppShell({
  appInfo,
  children,
  subtitle,
  showFooter = false,
  showAdminAlert = false,
}: {
  appInfo?: AppInfoPayload | null
  children: ReactNode
  subtitle: string
  showFooter?: boolean
  showAdminAlert?: boolean
}) {
  const { t } = useTranslation()
  const [isAdminAlertDismissed, setIsAdminAlertDismissed] = useState(false)

  useEffect(() => {
    if (!showAdminAlert) {
      setIsAdminAlertDismissed(false)
    }
  }, [showAdminAlert])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(127,86,217,0.18),transparent_28%),linear-gradient(180deg,#f6f7fb_0%,#eef1f8_100%)] text-foreground transition-colors dark:bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.12),transparent_28%),linear-gradient(180deg,#06070a_0%,#0f1117_100%)]">
      {showAdminAlert && !isAdminAlertDismissed ? (
        <div className="border-b border-amber-200/70 bg-amber-50/95 dark:border-amber-500/20 dark:bg-amber-500/10">
          <div className="mx-auto flex max-w-[1700px] items-center gap-2 px-4 py-1.5 text-xs text-amber-900 sm:px-6 lg:px-6 dark:text-amber-100">
            <ShieldAlert className="size-3.5 shrink-0 text-amber-600 dark:text-amber-300" />
            <p className="min-w-0 flex-1 truncate">
              <span className="font-medium">{t("workspaceActions.adminRequired")}</span>
              <span className="ml-1 text-amber-800/90 dark:text-amber-100/80">
                {t("workspaceActions.adminRequiredDescription")}
              </span>
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 cursor-pointer rounded-full text-amber-700 hover:bg-amber-100 hover:text-amber-950 dark:text-amber-200 dark:hover:bg-amber-400/10 dark:hover:text-white"
              onClick={() => setIsAdminAlertDismissed(true)}
              aria-label={t("common.close")}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
      <Navbar title={t("common.appName")} subtitle={subtitle} />

      <main className={showFooter ? "px-4 pb-24 pt-4 lg:px-6" : "px-4 pb-8 pt-4 lg:px-6"}>
        {children}
      </main>

      {showFooter ? (
        <footer className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 lg:px-6">
          <div className="pointer-events-auto">
            <div className="flex min-h-12 items-center gap-3 rounded-full border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(241,245,249,0.7))] px-4 py-2 text-xs shadow-[0_18px_50px_rgba(15,23,42,0.16)] ring-1 ring-black/[0.04] backdrop-blur-2xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(2,6,23,0.62))] dark:shadow-[0_18px_50px_rgba(0,0,0,0.36)] dark:ring-white/[0.04]">
              <button
                type="button"
                className="cursor-pointer rounded-full px-2 py-1 text-[11px] font-semibold tracking-[0.08em] text-slate-700 transition-colors hover:text-slate-950 dark:text-slate-200 dark:hover:text-white"
                onClick={() => void openUrl("https://www.gtamodx.com/")}
              >
                GTAMODX
              </button>

              <button
                type="button"
                className="cursor-pointer rounded-full px-2 py-1 text-[11px] font-semibold tracking-[0.08em] text-slate-700 transition-colors hover:text-slate-950 dark:text-slate-200 dark:hover:text-white"
                onClick={() => void openUrl("https://github.com/GTANext/G2M")}
              >
                GitHub
              </button>

              {appInfo?.version ? (
                <span className="shrink-0 text-[11px] font-medium tracking-[0.04em] text-slate-500 dark:text-slate-300">
                  {appInfo.version}
                </span>
              ) : null}
            </div>
          </div>
        </footer>
      ) : null}
    </div>
  )
}

function RouteLoader() {
  return (
    <div className="mx-auto max-w-[1700px] space-y-6">
      <div className="rounded-[30px] border border-white/70 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.12),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,245,249,0.94))] p-6 shadow-[0_24px_90px_rgba(15,23,42,0.1)] ring-1 ring-black/[0.03] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.14),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.82))] dark:shadow-[0_24px_90px_rgba(0,0,0,0.38)] dark:ring-white/[0.03] lg:p-7">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="mt-5 h-10 w-64 rounded-2xl" />
        <Skeleton className="mt-4 h-4 w-full max-w-3xl" />
        <Skeleton className="mt-2 h-4 w-full max-w-2xl" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-[30px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,245,249,0.94))] p-5 shadow-[0_24px_90px_rgba(15,23,42,0.1)] ring-1 ring-black/[0.03] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.82))] dark:shadow-[0_24px_90px_rgba(0,0,0,0.38)] dark:ring-white/[0.03]">
            <Skeleton className="h-5 w-36" />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Skeleton className="h-20 rounded-[24px]" />
              <Skeleton className="h-20 rounded-[24px]" />
              <Skeleton className="h-20 rounded-[24px]" />
              <Skeleton className="h-20 rounded-[24px]" />
            </div>
          </div>
          <div className="rounded-[30px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,245,249,0.94))] p-5 shadow-[0_24px_90px_rgba(15,23,42,0.1)] ring-1 ring-black/[0.03] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.82))] dark:shadow-[0_24px_90px_rgba(0,0,0,0.38)] dark:ring-white/[0.03]">
            <Skeleton className="h-5 w-24" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-11 rounded-2xl" />
              <Skeleton className="h-11 rounded-2xl" />
              <Skeleton className="h-11 rounded-2xl" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[30px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,245,249,0.94))] p-5 shadow-[0_24px_90px_rgba(15,23,42,0.1)] ring-1 ring-black/[0.03] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.82))] dark:shadow-[0_24px_90px_rgba(0,0,0,0.38)] dark:ring-white/[0.03] lg:p-6">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-6 w-40 rounded-full" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-28 rounded-xl" />
                <Skeleton className="h-10 w-32 rounded-xl" />
              </div>
            </div>
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              <Skeleton className="h-72 rounded-3xl" />
              <Skeleton className="h-72 rounded-3xl" />
            </div>
            <div className="mt-6 space-y-3">
              <Skeleton className="h-24 rounded-3xl" />
              <Skeleton className="h-24 rounded-3xl" />
              <Skeleton className="h-24 rounded-3xl" />
            </div>
          </div>

          <div className="rounded-[30px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,245,249,0.94))] p-5 shadow-[0_24px_90px_rgba(15,23,42,0.1)] ring-1 ring-black/[0.03] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.82))] dark:shadow-[0_24px_90px_rgba(0,0,0,0.38)] dark:ring-white/[0.03] lg:p-6">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-6 w-48 rounded-full" />
              <Skeleton className="h-10 w-28 rounded-xl" />
            </div>
            <Skeleton className="mt-4 h-80 rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

function HomeRoute({
  workspace,
  appInfo,
}: {
  workspace: ReturnType<typeof useG2mWorkspace>
  appInfo?: AppInfoPayload | null
}) {
  const { t } = useTranslation()
  const navbarSubtitle = t("routes.homeSubtitle")

  return (
    <AppShell
      appInfo={appInfo}
      subtitle={navbarSubtitle}
      showFooter
      showAdminAlert={workspace.bootstrap?.isElevated === false}
    >
      <Suspense fallback={<RouteLoader />}>
        <HomePage workspace={workspace} />
      </Suspense>
    </AppShell>
  )
}

function SettingsRoute({
  workspace,
  appInfo,
}: {
  workspace: ReturnType<typeof useG2mWorkspace>
  appInfo?: AppInfoPayload | null
}) {
  const { t } = useTranslation()

  return (
    <AppShell
      appInfo={appInfo}
      subtitle={t("routes.settingsSubtitle")}
      showAdminAlert={workspace.bootstrap?.isElevated === false}
    >
      <Suspense fallback={<RouteLoader />}>
        <SettingsPage />
      </Suspense>
    </AppShell>
  )
}

function BuilderRoute({
  workspace,
  appInfo,
}: {
  workspace: ReturnType<typeof useG2mWorkspace>
  appInfo?: AppInfoPayload | null
}) {
  const { t } = useTranslation()
  const navbarSubtitle = t("routes.builderSubtitle")

  return (
    <AppShell
      appInfo={appInfo}
      subtitle={navbarSubtitle}
      showAdminAlert={workspace.bootstrap?.isElevated === false}
    >
      <Suspense fallback={<RouteLoader />}>
        <ModBuilderPage />
      </Suspense>
    </AppShell>
  )
}

function GameWorkspaceRoute({
  workspace,
  appInfo,
}: {
  workspace: ReturnType<typeof useG2mWorkspace>
  appInfo?: AppInfoPayload | null
}) {
  const { t } = useTranslation()
  const navbarSubtitle = t("routes.workspaceSubtitle", { gameName: workspace.activeGame?.name })

  return (
    <AppShell
      appInfo={appInfo}
      subtitle={navbarSubtitle}
      showAdminAlert={workspace.bootstrap?.isElevated === false}
    >
      <Suspense fallback={<RouteLoader />}>
        <GameWorkspacePage workspace={workspace} />
      </Suspense>
    </AppShell>
  )
}

function AboutRoute({
  workspace,
  appInfo,
}: {
  workspace: ReturnType<typeof useG2mWorkspace>
  appInfo?: AppInfoPayload | null
}) {
  const { t } = useTranslation()
  const navbarSubtitle = t("routes.aboutSubtitle") || "About"

  return (
    <AppShell
      appInfo={appInfo}
      subtitle={navbarSubtitle}
      showAdminAlert={workspace.bootstrap?.isElevated === false}
    >
      <Suspense fallback={<RouteLoader />}>
        <AboutPage />
      </Suspense>
    </AppShell>
  )
}

function App() {
  const workspace = useG2mWorkspace()
  const [appInfo, setAppInfo] = useState<AppInfoPayload | null>(null)
  const hasClosedSplashscreenRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    void invokeApi<AppInfoPayload>("get_app_info")
      .then((payload) => {
        if (!cancelled) {
          setAppInfo(payload)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAppInfo(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (workspace.bootstrapping || hasClosedSplashscreenRef.current) {
      return
    }

    hasClosedSplashscreenRef.current = true
    void invokeApi<void>("close_splashscreen").catch(() => {
      // Ignore startup handoff errors so the UI can continue rendering.
    })
  }, [workspace.bootstrapping])

  return (
    <>
      <Routes>
        <Route path="/" element={<HomeRoute workspace={workspace} appInfo={appInfo} />} />
        <Route path="/builder" element={<BuilderRoute workspace={workspace} appInfo={appInfo} />} />
        <Route path="/settings" element={<SettingsRoute workspace={workspace} appInfo={appInfo} />} />
        <Route path="/about" element={<AboutRoute workspace={workspace} appInfo={appInfo} />} />
        <Route path="/game/:gameId" element={<GameWorkspaceRoute workspace={workspace} appInfo={appInfo} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Suspense fallback={null}>
        <WorkspaceDialogs workspace={workspace} />
      </Suspense>
      <Toaster closeButton position="top-right" richColors />
    </>
  )
}

export default App
