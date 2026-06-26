import { useCallback, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { openUrl, revealItemInDir } from "@tauri-apps/plugin-opener"

import { useI18n } from "@/components/app/i18nProvider"
import { formatApiErrorMessage, invokeApi } from "@/lib/api"
import {
  buildGamesFromBackend,
  buildDisplayMods,
  buildWorkspaceStats,
  type BootstrapPayload,
  type ManagedMod,
} from "@/lib/g2m"

import { useWorkspaceState } from "./workspace/useWorkspaceState"
import { useGameManagement } from "./workspace/useGameManagement"
import { useModManagement } from "./workspace/useModManagement"
import { usePrerequisites } from "./workspace/usePrerequisites"
import { useConflictResolution } from "./workspace/useConflictResolution"
import type { UseG2mWorkspaceResult } from "./workspace/types"

function buildConflictDecisionKey(modId: string, conflictId: string): string {
  return `${modId}::${conflictId}`
}

function matchesModSearch(mod: ManagedMod, keyword: string): boolean {
  return [
    mod.name,
    mod.author,
    mod.type,
    mod.description,
    ...mod.targetFolders,
    ...mod.previewFiles,
    ...mod.conflictWith,
  ]
    .join(" ")
    .toLowerCase()
    .includes(keyword)
}

export function useG2mWorkspace(): UseG2mWorkspaceResult {
  const { copy } = useI18n()
  const state = useWorkspaceState()

  const applyBootstrap = useCallback(
    (payload: BootstrapPayload) => {
      state.setBootstrap(payload)

      const nextMods = buildDisplayMods(payload.mods)
      state.setAllMods(nextMods)
      state.setConflictDecisions((current) => {
        const validKeys = new Set(
          nextMods.flatMap((mod) =>
            mod.conflictFiles.map((conflict) => buildConflictDecisionKey(mod.id, conflict.id)),
          ),
        )

        return Object.fromEntries(
          Object.entries(current).filter(([key]) => validKeys.has(key)),
        )
      })

      state.setSelectedModId((currentSelectedModId) => {
        if (nextMods.some((mod) => mod.id === currentSelectedModId)) {
          return currentSelectedModId
        }

        return nextMods[0]?.id ?? ""
      })

      state.setActiveGameId((currentActiveGameId) => {
        if (currentActiveGameId && payload.games.some((game) => game.id === currentActiveGameId)) {
          return currentActiveGameId
        }

        return payload.games[0]?.id ?? null
      })
    },
    [state],
  )

  const refreshWorkspace = useCallback(async () => {
    try {
      state.setBootstrapping(true)
      const payload = await invokeApi<BootstrapPayload>("bootstrap_app")
      applyBootstrap(payload)
    } catch (error) {
      toast.error(copy.workspaceActions.initFailed, {
        description: formatApiErrorMessage(error),
      })
    } finally {
      state.setBootstrapping(false)
    }
  }, [applyBootstrap, copy.workspaceActions.initFailed, state.setBootstrapping])

  useEffect(() => {
    void refreshWorkspace()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const games = useMemo(() => {
    if (!state.bootstrap) {
      return []
    }

    return buildGamesFromBackend(state.bootstrap.games, state.bootstrap.mods).sort((a, b) => a.sortOrder - b.sortOrder)
  }, [state.bootstrap])

  const activeGameMods = useMemo(
    () => state.allMods.filter((mod) => !state.activeGameId || mod.gameId === state.activeGameId),
    [state.activeGameId, state.allMods],
  )

  const mods = useMemo(() => {
    const keyword = state.modSearchQuery.trim().toLowerCase()
    if (!keyword) {
      return activeGameMods
    }

    return activeGameMods.filter((mod) => matchesModSearch(mod, keyword))
  }, [activeGameMods, state.modSearchQuery])

  const activeGame = useMemo(
    () => games.find((game) => game.id === state.activeGameId) ?? games[0] ?? null,
    [state.activeGameId, games],
  )

  const selectedMod = useMemo(
    () => mods.find((mod) => mod.id === state.selectedModId) ?? mods[0] ?? null,
    [mods, state.selectedModId],
  )

  const configuredGames = useMemo(
    () => games.filter((game) => game.status === "ready"),
    [games],
  )
  const hasConfiguredGames = configuredGames.length > 0
  const stats = useMemo(() => buildWorkspaceStats(activeGameMods), [activeGameMods])

  useEffect(() => {
    if (state.currentView === "game" && !activeGame) {
      state.setCurrentView("home")
    }
  }, [activeGame, state])

  const gameManagement = useGameManagement(state, games, applyBootstrap)
  const modManagement = useModManagement(state, activeGame, applyBootstrap)
  const prerequisites = usePrerequisites(state, activeGame, applyBootstrap)
  const conflictResolution = useConflictResolution(state, mods)

  const goHome = useCallback(() => {
    state.setCurrentView("home")
  }, [state])

  const openGame = useCallback((gameId: string) => {
    state.setActiveGameId(gameId)
    state.setCurrentView("game")
  }, [state])

  const startAddGame = useCallback(() => {
    state.setIsAddGameDialogOpen(true)
  }, [state])

  const openConflictDialog = useCallback(() => {
    state.setIsConflictDialogOpen(true)
  }, [state])

  const closeConflictDialog = useCallback(() => {
    state.setIsConflictDialogOpen(false)
  }, [state])

  const openDeleteGameDialog = useCallback((gameId: string) => {
    state.setDeleteTargetGameId(gameId)
  }, [state])

  const openDeleteModDialog = useCallback((modId: string) => {
    state.setDeleteTargetModId(modId)
  }, [state])

  const openImportModDialog = useCallback(() => {
    state.setIsImportModDialogOpen(true)
    modManagement.resetImportModState()
  }, [state, modManagement])

  const openGamesDownloadPage = useCallback(async () => {
    try {
      await openUrl("https://gtamodx.com/games")
      toast.success(copy.workspaceActions.downloadPageOpened)
    } catch (error) {
      toast.error(copy.workspaceActions.openDownloadPageFailed, {
        description: formatApiErrorMessage(error),
      })
    }
  }, [copy.workspaceActions.downloadPageOpened, copy.workspaceActions.openDownloadPageFailed])

  const openGameDirectory = useCallback(async (gameId?: string) => {
    const targetGame =
      (gameId ? games.find((game) => game.id === gameId) : activeGame) ?? activeGame

    if (!targetGame?.gamePath) {
      toast.warning(copy.workspaceActions.noOpenDirectory)
      return
    }

    try {
      await revealItemInDir(targetGame.gamePath)
      toast.success(copy.workspaceActions.gameDirectoryOpened, {
        description: targetGame.gamePath,
      })
    } catch (error) {
      toast.error(copy.workspaceActions.openGameDirectoryFailed, {
        description: formatApiErrorMessage(error),
      })
    }
  }, [activeGame, copy, games])

  return {
    ...state,
    activeGame,
    activeGameMods,
    allModsCount: activeGameMods.length,
    configuredGames,
    hasConfiguredGames,
    games,
    mods,
    selectedMod,
    stats,

    goHome,
    openGame,
    startAddGame,
    openConflictDialog,
    closeConflictDialog,
    openDeleteGameDialog,
    openDeleteModDialog,
    openImportModDialog,
    openGamesDownloadPage,
    openGameDirectory,
    refreshWorkspace,
    setImportModName: (value: string) =>
      state.setImportModForm((current) => ({
        ...current,
        name: value,
      })),
    setImportModMappings: state.setImportModMappingsState,

    ...gameManagement,
    ...modManagement,
    ...prerequisites,
    ...conflictResolution,
  }
}

export type { UseG2mWorkspaceResult }
