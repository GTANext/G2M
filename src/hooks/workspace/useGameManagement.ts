import { useCallback } from "react"
import { toast } from "sonner"
import { open } from "@tauri-apps/plugin-dialog"

import { useI18n } from "@/components/app/i18nProvider"
import { formatApiErrorMessage, invokeApi } from "@/lib/api"
import type { BootstrapPayload, DetectedGame, Game } from "@/lib/g2m"
import { createDefaultAddGameForm, createDefaultEditGameForm, type WorkspaceState } from "./types"

export function useGameManagement(state: WorkspaceState, games: Game[], applyBootstrap: (payload: BootstrapPayload) => void) {
  const { copy } = useI18n()

  const setAddGameForm = useCallback((patch: Partial<WorkspaceState["addGameForm"]>) => {
    state.setAddGameFormState((current) => ({
      ...current,
      ...patch,
    }))
  }, [state])

  const setEditGameForm = useCallback((patch: Partial<WorkspaceState["editGameForm"]>) => {
    state.setEditGameFormState((current) => ({
      ...current,
      ...patch,
    }))
  }, [state])

  const closeAddGameDialog = useCallback(() => {
    state.setIsAddGameDialogOpen(false)
    state.setIsDetectingGame(false)
    state.setAddGameFormState(createDefaultAddGameForm())
  }, [state])

  const closeEditGameDialog = useCallback(() => {
    state.setIsEditGameDialogOpen(false)
    state.setEditGameFormState(createDefaultEditGameForm())
  }, [state])

  const pickGameDirectory = useCallback(async () => {
    let toastId: string | number | undefined

    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: copy.workspaceActions.chooseGameDirectoryTitle,
      })

      if (!selected || Array.isArray(selected)) {
        return
      }

      state.setIsDetectingGame(true)
      toastId = toast.loading(copy.workspaceActions.checkingDirectory)

      const detectedGame = await invokeApi<DetectedGame>("detect_game_directory", {
        gamePath: selected,
      })

      const hasCustomCover = Boolean(detectedGame.coverBase64)

      state.setAddGameFormState({
        dir: detectedGame.path,
        type: detectedGame.gameType as any,
        name: detectedGame.name,
        version: detectedGame.version,
        exeName: detectedGame.exeName,
        imagePath: detectedGame.coverBase64 || "",
        customImageSourcePath: "",
        useDefaultImage: !hasCustomCover,
      })
      toast.success(copy.workspaceActions.gameDetected, {
        id: toastId,
        description: `${detectedGame.name} · ${detectedGame.exeName}`,
      })
    } catch (error) {
      toast.error(copy.workspaceActions.directoryCheckFailed, {
        id: toastId,
        description: formatApiErrorMessage(error),
      })
    } finally {
      state.setIsDetectingGame(false)
    }
  }, [copy, state])

  const pickAddGameImage = useCallback(async () => {
    const selected = await open({
      multiple: false,
      title: copy.workspaceActions.chooseGameCoverTitle,
      filters: [
        {
          name: "Image",
          extensions: ["jpg", "jpeg", "png", "webp"],
        },
      ],
    })

    if (!selected || Array.isArray(selected)) {
      return
    }

    try {
      const base64Image = await invokeApi<string>("read_image_base64", {
        path: selected,
      })

      state.setAddGameFormState((current) => ({
        ...current,
        imagePath: base64Image,
        customImageSourcePath: "",
        useDefaultImage: false,
      }))
      toast.success(copy.workspaceActions.coverSelected)
    } catch (error) {
      toast.error("读取图片失败", { description: formatApiErrorMessage(error) })
    }
  }, [copy, state])

  const resetAddGameImage = useCallback(() => {
    state.setAddGameFormState((current) => ({
      ...current,
      imagePath: "",
      customImageSourcePath: "",
      useDefaultImage: true,
    }))
    toast.info(copy.workspaceActions.coverReset)
  }, [copy, state])

  const confirmAddGame = useCallback(async () => {
    if (!state.addGameForm.dir.trim()) {
      toast.warning(copy.workspaceActions.selectGameDirectoryFirst)
      return
    }
    if (!state.addGameForm.type) {
      toast.warning(copy.workspaceActions.confirmGameTypeFirst)
      return
    }

    let toastId: string | number | undefined

    try {
      state.setSavingGameId("add-game")
      toastId = toast.loading(copy.workspaceActions.savingGameConfig)

      const payload = await invokeApi<BootstrapPayload>("save_game_path", {
        gamePath: state.addGameForm.dir.trim(),
        gameType: state.addGameForm.type,
        name: state.addGameForm.name,
        version: state.addGameForm.version,
        coverImageSourcePath: state.addGameForm.customImageSourcePath || null,
        existingCoverBase64: state.addGameForm.imagePath.startsWith("data:image/") ? state.addGameForm.imagePath : null,
      })

      const addedGame = payload.games[payload.games.length - 1]
      applyBootstrap(payload)
      toast.success(copy.workspaceActions.gameAdded, {
        id: toastId,
        description: state.addGameForm.name || addedGame?.name || copy.workspaceActions.gameConfigSaved,
      })
      closeAddGameDialog()
      state.setCurrentView("home")

      if (addedGame) {
        state.setActiveGameId(addedGame.id)
      }
    } catch (error) {
      toast.error(copy.workspaceActions.addFailed, {
        id: toastId,
        description: formatApiErrorMessage(error),
      })
    } finally {
      state.setSavingGameId(null)
    }
  }, [state, copy, applyBootstrap, closeAddGameDialog])

  const openEditGameDialog = useCallback((gameId: string) => {
    const game = games.find((item) => item.id === gameId)
    if (!game) {
      return
    }

    state.setEditGameFormState({
      id: game.id,
      dir: game.gamePath,
      type: game.gameType as any,
      name: game.name,
      version: game.version,
      exeName: game.exeName,
      imagePath: game.imagePath,
      customImageSourcePath: "",
      useDefaultImage: !game.imagePath,
    })
    state.setIsEditGameDialogOpen(true)
  }, [games, state])

  const pickEditGameImage = useCallback(async () => {
    const selected = await open({
      multiple: false,
      title: copy.workspaceActions.chooseGameCoverTitle,
      filters: [
        {
          name: "Image",
          extensions: ["jpg", "jpeg", "png", "webp"],
        },
      ],
    })

    if (!selected || Array.isArray(selected)) {
      return
    }

    try {
      const base64Image = await invokeApi<string>("read_image_base64", {
        path: selected,
      })

      state.setEditGameFormState((current) => ({
        ...current,
        imagePath: base64Image,
        customImageSourcePath: "",
        useDefaultImage: false,
      }))
      toast.success(copy.workspaceActions.coverSelectionUpdated)
    } catch (error) {
      toast.error("读取图片失败", { description: formatApiErrorMessage(error) })
    }
  }, [copy, state])

  const resetEditGameImage = useCallback(() => {
    state.setEditGameFormState((current) => ({
      ...current,
      imagePath: "",
      customImageSourcePath: "",
      useDefaultImage: true,
    }))
    toast.info(copy.workspaceActions.coverReset)
  }, [copy, state])

  const confirmEditGame = useCallback(async () => {
    if (!state.editGameForm.id) {
      return
    }

    let toastId: string | number | undefined

    try {
      state.setSavingGameId(state.editGameForm.id)
      toastId = toast.loading(copy.workspaceActions.savingGameInfo(state.editGameForm.name))

      const payload = await invokeApi<BootstrapPayload>("update_game_entry", {
        gameId: state.editGameForm.id,
        gameType: state.editGameForm.type,
        name: state.editGameForm.name,
        version: state.editGameForm.version,
        coverImageSourcePath: state.editGameForm.customImageSourcePath || null,
        existingCoverBase64: state.editGameForm.imagePath.startsWith("data:image/") ? state.editGameForm.imagePath : null,
        useDefaultImage: state.editGameForm.useDefaultImage,
      })

      applyBootstrap(payload)
      closeEditGameDialog()
      toast.success(copy.workspaceActions.gameUpdated, {
        id: toastId,
        description: state.editGameForm.name,
      })
    } catch (error) {
      toast.error(copy.workspaceActions.editFailed, {
        id: toastId,
        description: formatApiErrorMessage(error),
      })
    } finally {
      state.setSavingGameId(null)
    }
  }, [state, copy, applyBootstrap, closeEditGameDialog])

  const confirmDeleteGame = useCallback(async (gameId: string, _removeOnly?: boolean) => {
    let toastId: string | number | undefined

    try {
      state.setSavingGameId(gameId)
      const gameName = games.find((game) => game.id === gameId)?.name ?? copy.workspaceActions.currentGame
      toastId = toast.loading(copy.workspaceActions.deletingGameConfig)

      const payload = await invokeApi<BootstrapPayload>("delete_game_entry", {
        gameId,
      })

      applyBootstrap(payload)
      state.setDeleteTargetGameId(null)
      toast.success(copy.workspaceActions.gameDeleted, {
        id: toastId,
        description: gameName,
      })

      if (payload.games.length === 0) {
        state.setCurrentView("home")
      }
    } catch (error) {
      toast.error(copy.workspaceActions.deleteFailed, {
        id: toastId,
        description: formatApiErrorMessage(error),
      })
    } finally {
      state.setSavingGameId(null)
    }
  }, [state, games, copy, applyBootstrap])

  const updateGamesSortOrder = useCallback(async (orders: { id: string; sortOrder: number }[]) => {
    try {
      const payload = await invokeApi<BootstrapPayload>("update_games_sort_order", {
        orders,
      })
      applyBootstrap(payload)
    } catch (error) {
      toast.error("更新游戏排序失败", {
        description: formatApiErrorMessage(error),
      })
    }
  }, [applyBootstrap])

  return {
    setAddGameForm,
    setEditGameForm,
    closeAddGameDialog,
    closeEditGameDialog,
    pickGameDirectory,
    pickAddGameImage,
    resetAddGameImage,
    confirmAddGame,
    openEditGameDialog,
    pickEditGameImage,
    resetEditGameImage,
    confirmEditGame,
    confirmDeleteGame,
    updateGamesSortOrder,
  }
}