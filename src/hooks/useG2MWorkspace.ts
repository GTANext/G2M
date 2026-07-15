import { useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { openUrl, revealItemInDir } from "@tauri-apps/plugin-opener"

import { formatApiErrorMessage, invokeApi } from "@/lib/api"
import {
  buildGamesFromBackend,
  buildDisplayMods,
  buildWorkspaceStats,
  type BootstrapPayload,
  type Game,
  type ManagedMod,
  type WorkspaceStats,
} from "@/lib/g2m"

import { useWorkspaceState } from "./workspace/useWorkspaceState"
import { useConflictResolution } from "./workspace/useConflictResolution"
import { useGameManagement } from "./workspace/useGameManagement"
import { useModManagement } from "./workspace/useModManagement"
import { usePrerequisites } from "./workspace/usePrerequisites"
import type { UseG2mWorkspaceResult } from "./workspace/types"
import { buildConflictDecisionKey, matchesModSearch } from "./workspace/utils"

function buildNextConflictDecisions(
  currentDecisions: Record<string, "overwrite" | "skip">,
  mods: ManagedMod[],
): Record<string, "overwrite" | "skip"> {
  const validKeys = new Set(
    mods.flatMap((mod) =>
      mod.conflictFiles.map((conflict) => buildConflictDecisionKey(mod.id, conflict.id)),
    ),
  )

  return Object.fromEntries(Object.entries(currentDecisions).filter(([key]) => validKeys.has(key)))
}

function pickRetainedId<TItem extends { id: string }>({
  items,
  currentId,
  fallbackId,
}: {
  items: TItem[]
  currentId: string | null
  fallbackId: string | null
}): string | null {
  if (currentId && items.some((item) => item.id === currentId)) {
    return currentId
  }

  return fallbackId
}

function getGamesFromBootstrap(payload: BootstrapPayload): Game[] {
  return buildGamesFromBackend(payload.games, payload.mods).sort((left, right) => left.sortOrder - right.sortOrder)
}

function getActiveGameMods(mods: ManagedMod[], activeGameId: string | null): ManagedMod[] {
  return mods.filter((mod) => !activeGameId || mod.gameId === activeGameId)
}

function getVisibleMods(mods: ManagedMod[], modSearchQuery: string): ManagedMod[] {
  const keyword = modSearchQuery.trim().toLowerCase()
  if (!keyword) {
    return mods
  }

  return mods.filter((mod) => matchesModSearch(mod, keyword))
}

function getActiveGame(games: Game[], activeGameId: string | null): Game | null {
  return games.find((game) => game.id === activeGameId) ?? games[0] ?? null
}

function getSelectedMod(mods: ManagedMod[], selectedModId: string): ManagedMod | null {
  return mods.find((mod) => mod.id === selectedModId) ?? mods[0] ?? null
}

function getConfiguredGames(games: Game[]): Game[] {
  return games.filter((game) => game.status === "ready")
}

function getWorkspaceStats(mods: ManagedMod[]): WorkspaceStats {
  return buildWorkspaceStats(mods)
}

export function useG2mWorkspace(): UseG2mWorkspaceResult {
  const { t } = useTranslation()
  const state = useWorkspaceState()

  const applyBootstrap = useCallback(
    (payload: BootstrapPayload) => {
      state.setBootstrap(payload)

      const nextMods = buildDisplayMods(payload.mods)
      state.setAllMods(nextMods)
      state.setConflictDecisions((current) => buildNextConflictDecisions(current, nextMods))

      state.setSelectedModId((currentSelectedModId) => {
        return pickRetainedId({
          items: nextMods,
          currentId: currentSelectedModId,
          fallbackId: nextMods[0]?.id ?? "",
        }) ?? ""
      })

      state.setActiveGameId((currentActiveGameId) => {
        return pickRetainedId({
          items: payload.games,
          currentId: currentActiveGameId,
          fallbackId: payload.games[0]?.id ?? null,
        })
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
      toast.error(t("workspaceActions.initFailed"), {
        description: formatApiErrorMessage(error),
      })
    } finally {
      state.setBootstrapping(false)
    }
  }, [applyBootstrap, state.setBootstrapping, t])

  useEffect(() => {
    void refreshWorkspace()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const games = useMemo(() => {
    if (!state.bootstrap) {
      return []
    }

    return getGamesFromBootstrap(state.bootstrap)
  }, [state.bootstrap])

  const activeGameMods = useMemo(
    () => getActiveGameMods(state.allMods, state.activeGameId),
    [state.activeGameId, state.allMods],
  )

  const mods = useMemo(
    () => getVisibleMods(activeGameMods, state.modSearchQuery),
    [activeGameMods, state.modSearchQuery],
  )

  const activeGame = useMemo(() => getActiveGame(games, state.activeGameId), [state.activeGameId, games])

  const selectedMod = useMemo(() => getSelectedMod(mods, state.selectedModId), [mods, state.selectedModId])

  const configuredGames = useMemo(() => getConfiguredGames(games), [games])
  const hasConfiguredGames = configuredGames.length > 0
  const stats = useMemo(() => getWorkspaceStats(activeGameMods), [activeGameMods])

  useEffect(() => {
    if (state.currentView === "game" && !activeGame) {
      state.setCurrentView("home")
    }
  }, [activeGame, state])

  const gameManagement = useGameManagement(state, games, applyBootstrap)
  const modManagement = useModManagement(state, activeGame, applyBootstrap)
  const prerequisites = usePrerequisites(state, activeGame, applyBootstrap)
  const conflictResolution = useConflictResolution(state, mods)
  const { resetImportModState } = modManagement

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
    resetImportModState()
  }, [resetImportModState, state])

  const openGamesDownloadPage = useCallback(async () => {
    try {
      await openUrl("https://gtamodx.com/games")
      toast.success(t("workspaceActions.downloadPageOpened"))
    } catch (error) {
      toast.error(t("workspaceActions.openDownloadPageFailed"), {
        description: formatApiErrorMessage(error),
      })
    }
  }, [t])

  const openGameDirectory = useCallback(async (gameId?: string) => {
    const targetGame = (gameId ? games.find((game) => game.id === gameId) : activeGame) ?? activeGame

    if (!targetGame?.gamePath) {
      toast.warning(t("workspaceActions.noOpenDirectory"))
      return
    }

    try {
      await revealItemInDir(targetGame.gamePath)
      toast.success(t("workspaceActions.gameDirectoryOpened"), {
        description: targetGame.gamePath,
      })
    } catch (error) {
      toast.error(t("workspaceActions.openGameDirectoryFailed"), {
        description: formatApiErrorMessage(error),
      })
    }
  }, [activeGame, games, t])

  const setImportModName = useCallback((value: string) => {
    state.setImportModForm((current) => ({
      ...current,
      name: value,
    }))
  }, [state])

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
    setImportModName,
    setImportModMappings: state.setImportModMappingsState,

    ...gameManagement,
    ...modManagement,
    ...prerequisites,
    ...conflictResolution,
  }
}

export type { UseG2mWorkspaceResult }
