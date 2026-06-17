import { Navbar } from "@/components/app/navbar"
import { Toaster } from "@/components/ui/sonner"
import { WorkspaceDialogs } from "@/components/workspace/dialogs"
import { useG2mWorkspace } from "@/hooks/useG2MWorkspace"
import { HomePage } from "@/pages/home"
import { GameWorkspacePage } from "@/pages/workspace"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import "./App.css"

function App() {
  const workspace = useG2mWorkspace()
  const location = useLocation()

  const isGameRoute = location.pathname.startsWith("/game/")
  const navbarTitle = "GTAMODX Manager"
  const navbarSubtitle =
    isGameRoute && workspace.activeGame
      ? `[Workspace] ${workspace.activeGame.name}`
      : "GTA 三部曲 Mod 管理首页"

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(127,86,217,0.18),transparent_28%),linear-gradient(180deg,#f6f7fb_0%,#eef1f8_100%)] text-foreground transition-colors dark:bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.12),transparent_28%),linear-gradient(180deg,#06070a_0%,#0f1117_100%)]">
      <Navbar title={navbarTitle} subtitle={navbarSubtitle} />

      <main className="px-4 pb-4 pt-4 lg:px-6">
        <Routes>
          <Route path="/" element={<HomePage workspace={workspace} />} />
          <Route path="/game/:gameId" element={<GameWorkspacePage workspace={workspace} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <WorkspaceDialogs workspace={workspace} />
      <Toaster closeButton position="top-right" richColors />
    </div>
  )
}

export default App
