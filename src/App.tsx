import { useI18n } from "@/components/app/i18nProvider"
import { Navbar } from "@/components/app/navbar"
import { Toaster } from "@/components/ui/sonner"
import { WorkspaceDialogs } from "@/components/g2m/workspaceDialogs"
import { useG2mWorkspace } from "@/hooks/useG2MWorkspace"
import { HomePage } from "@/pages/home"
import { SettingsPage } from "@/pages/settings"
import { ModBuilderPage } from "@/pages/builder"
import { GameWorkspacePage } from "@/pages/workspace"
import { Navigate, Route, Routes } from "react-router-dom"
import "./App.css"

function AppShell({
  children,
  subtitle,
}: {
  children: React.ReactNode
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

function HomeRoute({ workspace }: { workspace: ReturnType<typeof useG2mWorkspace> }) {
  const { copy } = useI18n()
  const navbarSubtitle = copy.routes.homeSubtitle

  return (
    <AppShell subtitle={navbarSubtitle}>
      <HomePage workspace={workspace} />
    </AppShell>
  )
}

function SettingsRoute() {
  const { copy } = useI18n()
  const navbarSubtitle = copy.routes.settingsSubtitle

  return (
    <AppShell subtitle={navbarSubtitle}>
      <SettingsPage />
    </AppShell>
  )
}

function BuilderRoute() {
  const { copy } = useI18n()
  const navbarSubtitle = copy.routes.builderSubtitle

  return (
    <AppShell subtitle={navbarSubtitle}>
      <ModBuilderPage />
    </AppShell>
  )
}

function GameWorkspaceRoute({ workspace }: { workspace: ReturnType<typeof useG2mWorkspace> }) {
  const { copy } = useI18n()
  const navbarSubtitle = copy.routes.workspaceSubtitle(workspace.activeGame?.name)

  return (
    <AppShell subtitle={navbarSubtitle}>
      <GameWorkspacePage workspace={workspace} />
    </AppShell>
  )
}

function App() {
  const workspace = useG2mWorkspace()

  return (
    <>
      <Routes>
        <Route path="/" element={<HomeRoute workspace={workspace} />} />
        <Route path="/builder" element={<BuilderRoute />} />
        <Route path="/settings" element={<SettingsRoute />} />
        <Route path="/game/:gameId" element={<GameWorkspaceRoute workspace={workspace} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <WorkspaceDialogs workspace={workspace} />
      <Toaster closeButton position="top-right" richColors />
    </>
  )
}

export default App
