import { useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"

import type { WorkspaceState } from "@/features/workspace/types"

function useRouteSync(workspace: WorkspaceState) {
  const navigate = useNavigate()
  const { gameId = "" } = useParams()

  useEffect(() => {
    if (!gameId) {
      navigate("/", { replace: true })
      return
    }

    if (workspace.games.some((game) => game.id === gameId)) {
      workspace.openGame(gameId)
    }
  }, [gameId, navigate, workspace])

  useEffect(() => {
    if (!workspace.bootstrapping && gameId && !workspace.games.some((game) => game.id === gameId)) {
      navigate("/", { replace: true })
    }
  }, [gameId, navigate, workspace.bootstrapping, workspace.games])

  return {
    gameId,
    navigate,
  }
}

export { useRouteSync }
