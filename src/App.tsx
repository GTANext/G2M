import { lazy, Suspense, type ReactNode } from "react"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { useI18n } from "@/components/app/i18nProvider"
import { Navbar } from "@/components/app/navbar"
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster } from "@/components/ui/sonner"
import { useG2mWorkspace } from "@/hooks/useG2MWorkspace"
import { Navigate, Route, Routes } from "react-router-dom"
import "./App.css"

const HomePage = lazy(() =>
  import("@/pages/home").then((module) => ({ default: module.HomePage })),
)
const SettingsPage = lazy(() =>
  import("@/pages/settings").then((module) => ({ default: module.SettingsPage })),
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
  children,
  subtitle,
}: {
  children: ReactNode
  subtitle: string
}) {
  const { copy } = useI18n()

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(127,86,217,0.18),transparent_28%),linear-gradient(180deg,#f6f7fb_0%,#eef1f8_100%)] text-foreground transition-colors dark:bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.12),transparent_28%),linear-gradient(180deg,#06070a_0%,#0f1117_100%)]">
      <Navbar title={copy.common.appName} subtitle={subtitle} />

      <main className="px-4 pb-4 pt-4 lg:px-6">{children}</main>
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

function HomeRoute({ workspace }: { workspace: ReturnType<typeof useG2mWorkspace> }) {
  const { copy } = useI18n()
  const navbarSubtitle = copy.routes.homeSubtitle

  return (
    <AppShell subtitle={navbarSubtitle}>
      <Suspense fallback={<RouteLoader />}>
        <HomePage workspace={workspace} />
      </Suspense>
    </AppShell>
  )
}

function SettingsRoute() {
  const { copy } = useI18n()
  const navbarSubtitle = copy.routes.settingsSubtitle

  return (
    <AppShell subtitle={navbarSubtitle}>
      <Suspense fallback={<RouteLoader />}>
        <SettingsPage />
      </Suspense>
    </AppShell>
  )
}

function BuilderRoute() {
  const { copy } = useI18n()
  const navbarSubtitle = copy.routes.builderSubtitle

  return (
    <AppShell subtitle={navbarSubtitle}>
      <Suspense fallback={<RouteLoader />}>
        <ModBuilderPage />
      </Suspense>
    </AppShell>
  )
}

function GameWorkspaceRoute({ workspace }: { workspace: ReturnType<typeof useG2mWorkspace> }) {
  const { copy } = useI18n()
  const navbarSubtitle = copy.routes.workspaceSubtitle(workspace.activeGame?.name)

  return (
    <AppShell subtitle={navbarSubtitle}>
      <Suspense fallback={<RouteLoader />}>
        <GameWorkspacePage workspace={workspace} />
      </Suspense>
    </AppShell>
  )
}

function App() {
  const workspace = useG2mWorkspace()

  return (
    <DndProvider backend={HTML5Backend}>
      <>
        <Routes>
          <Route path="/" element={<HomeRoute workspace={workspace} />} />
          <Route path="/builder" element={<BuilderRoute />} />
          <Route path="/settings" element={<SettingsRoute />} />
          <Route path="/game/:gameId" element={<GameWorkspaceRoute workspace={workspace} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Suspense fallback={null}>
          <WorkspaceDialogs workspace={workspace} />
        </Suspense>
        <Toaster closeButton position="top-right" richColors />
      </>
    </DndProvider>
  )
}

export default App
