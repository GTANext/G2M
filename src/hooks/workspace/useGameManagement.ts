import { open } from "@tauri-apps/plugin-dialog"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { formatApiErrorMessage, invokeApi } from "@/lib/api"
import type { BootstrapPayload, DetectedGame, Game } from "@/lib/g2m"
import {
  createDefaultAddGameForm,
  createDefaultEditGameForm,
  type AddGameForm,
  type EditGameForm,
  type WorkspaceState,
} from "./types"

type GameForm = AddGameForm | EditGameForm
type GameType = Game["gameType"]
type SetGameFormState<TForm extends GameForm> = (value: TForm | ((current: TForm) => TForm)) => void

const GAME_IMAGE_FILTERS = [
  {
    name: "Image",
    extensions: ["jpg", "jpeg", "png", "webp"],
  },
]

const GAME_EXECUTABLE_FILTERS = [
  {
    name: "Executable",
    extensions: ["exe"],
  },
]

function isGameType(value: string): value is GameType {
  return value === "sa" || value === "vc" || value === "iii"
}

function normalizeDetectedGameType(value: string): GameType | "" {
  return isGameType(value) ? value : ""
}

function toDetectedGameForm(detectedGame: DetectedGame): AddGameForm {
  const hasCustomCover = Boolean(detectedGame.coverBase64)

  return {
    dir: detectedGame.path,
    type: normalizeDetectedGameType(detectedGame.gameType),
    name: detectedGame.name,
    version: detectedGame.version,
    exeName: detectedGame.exeName,
    isExeAutoDetected: true,
    imagePath: detectedGame.coverBase64 || "",
    customImageSourcePath: "",
    useDefaultImage: !hasCustomCover,
  }
}

function createGameImagePatch<TForm extends GameForm>(base64Image: string) {
  return (current: TForm): TForm => ({
    ...current,
    imagePath: base64Image,
    customImageSourcePath: "",
    useDefaultImage: false,
  })
}

function createResetGameImagePatch<TForm extends GameForm>() {
  return (current: TForm): TForm => ({
    ...current,
    imagePath: "",
    customImageSourcePath: "",
    useDefaultImage: true,
  })
}

function getExistingCoverBase64(imagePath: string): string | null {
  return imagePath.startsWith("data:image/") ? imagePath : null
}

function getGameImagePickerOptions(title: string) {
  return {
    multiple: false,
    title,
    filters: GAME_IMAGE_FILTERS,
  } as const
}

function getGameExecutablePickerOptions(title: string) {
  return {
    multiple: false,
    title,
    filters: GAME_EXECUTABLE_FILTERS,
  } as const
}

function getPathFileName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path
}

function normalizeComparablePath(path: string): string {
  return path.trim().replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase()
}

function resolveStoredExecutableValue(selectedPath: string, gameDir: string): string {
  const normalizedSelectedPath = selectedPath.trim().replace(/\\/g, "/")
  const normalizedGameDir = normalizeComparablePath(gameDir)
  const comparableSelectedPath = normalizeComparablePath(selectedPath)

  if (normalizedGameDir && comparableSelectedPath.startsWith(`${normalizedGameDir}/`)) {
    return normalizedSelectedPath.slice(gameDir.trim().replace(/\\/g, "/").replace(/\/+$/, "").length + 1)
  }

  return getPathFileName(selectedPath)
}

export function useGameManagement(
  state: WorkspaceState,
  games: Game[],
  applyBootstrap: (payload: BootstrapPayload) => void,
) {
  const { t } = useTranslation()

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
        title: t("workspaceActions.chooseGameDirectoryTitle"),
      })

      if (!selected || Array.isArray(selected)) {
        return
      }

      state.setIsDetectingGame(true)
      toastId = toast.loading(t("workspaceActions.checkingDirectory"))

      const detectedGame = await invokeApi<DetectedGame>("detect_game_directory", {
        gamePath: selected,
      })

      state.setAddGameFormState(toDetectedGameForm(detectedGame))
      toast.success(t("workspaceActions.gameDetected"), {
        id: toastId,
        description: `${detectedGame.name} · ${detectedGame.exeName}`,
      })
    } catch (error) {
      toast.error(t("workspaceActions.directoryCheckFailed"), {
        id: toastId,
        description: formatApiErrorMessage(error),
      })
    } finally {
      state.setIsDetectingGame(false)
    }
  }, [state, t])

  const pickGameImage = useCallback(
    async <TForm extends GameForm>({
      setFormState,
      successMessage,
    }: {
      setFormState: SetGameFormState<TForm>
      successMessage: string
    }) => {
      const selected = await open(getGameImagePickerOptions(t("workspaceActions.chooseGameCoverTitle")))

      if (!selected || Array.isArray(selected)) {
        return
      }

      try {
        const base64Image = await invokeApi<string>("read_image_base64", {
          path: selected,
        })

        setFormState(createGameImagePatch<TForm>(base64Image))
        toast.success(successMessage)
      } catch (error) {
        toast.error("读取图片失败", { description: formatApiErrorMessage(error) })
      }
    },
    [t],
  )

  const pickAddGameImage = useCallback(async () => {
    await pickGameImage<AddGameForm>({
      setFormState: state.setAddGameFormState,
      successMessage: t("workspaceActions.coverSelected"),
    })
  }, [pickGameImage, state.setAddGameFormState, t])

  const pickGameExecutable = useCallback(
    async <TForm extends GameForm>({
      gameDir,
      setFormState,
      successMessage,
    }: {
      gameDir: string
      setFormState: SetGameFormState<TForm>
      successMessage: string
    }) => {
      if (!gameDir.trim()) {
        toast.warning(t("workspaceActions.selectGameDirectoryFirst"))
        return
      }

      const selected = await open(
        getGameExecutablePickerOptions(t("workspaceActions.chooseGameExecutableTitle")),
      )

      if (!selected || Array.isArray(selected)) {
        return
      }

      setFormState((current) => ({
        ...current,
        exeName: resolveStoredExecutableValue(selected, current.dir || gameDir),
        isExeAutoDetected: false,
      }))
      toast.success(successMessage)
    },
    [t],
  )

  const pickAddGameExecutable = useCallback(async () => {
    await pickGameExecutable<AddGameForm>({
      gameDir: state.addGameForm.dir,
      setFormState: state.setAddGameFormState,
      successMessage: t("workspaceActions.gameExecutableSelected"),
    })
  }, [pickGameExecutable, state.addGameForm.dir, state.setAddGameFormState, t])

  const resetAddGameImage = useCallback(() => {
    state.setAddGameFormState(createResetGameImagePatch<AddGameForm>())
    toast.info(t("workspaceActions.coverReset"))
  }, [state.setAddGameFormState, t])

  const confirmAddGame = useCallback(async () => {
    if (!state.addGameForm.dir.trim()) {
      toast.warning(t("workspaceActions.selectGameDirectoryFirst"))
      return
    }
    if (!state.addGameForm.type) {
      toast.warning(t("workspaceActions.confirmGameTypeFirst"))
      return
    }

    let toastId: string | number | undefined

    try {
      state.setSavingGameId("add-game")
      toastId = toast.loading(t("workspaceActions.savingGameConfig"))

      const payload = await invokeApi<BootstrapPayload>("save_game_path", {
        gamePath: state.addGameForm.dir.trim(),
        gameType: state.addGameForm.type,
        name: state.addGameForm.name,
        version: state.addGameForm.version,
        exeName: state.addGameForm.exeName,
        coverImageSourcePath: state.addGameForm.customImageSourcePath || null,
        existingCoverBase64: getExistingCoverBase64(state.addGameForm.imagePath),
      })

      const addedGame = payload.games[payload.games.length - 1]
      applyBootstrap(payload)
      toast.success(t("workspaceActions.gameAdded"), {
        id: toastId,
        description: state.addGameForm.name || addedGame?.name || t("workspaceActions.gameConfigSaved"),
      })
      closeAddGameDialog()
      state.setCurrentView("home")

      if (addedGame) {
        state.setActiveGameId(addedGame.id)
      }
    } catch (error) {
      toast.error(t("workspaceActions.addFailed"), {
        id: toastId,
        description: formatApiErrorMessage(error),
      })
    } finally {
      state.setSavingGameId(null)
    }
  }, [applyBootstrap, closeAddGameDialog, state, t])

  const openEditGameDialog = useCallback((gameId: string) => {
    const game = games.find((item) => item.id === gameId)
    if (!game) {
      return
    }

    state.setEditGameFormState({
      id: game.id,
      dir: game.gamePath,
      type: game.gameType,
      name: game.name,
      version: game.version,
      exeName: game.exeName,
      isExeAutoDetected: false,
      imagePath: game.imagePath,
      customImageSourcePath: "",
      useDefaultImage: !game.imagePath,
    })
    state.setIsEditGameDialogOpen(true)
  }, [games, state])

  const pickEditGameImage = useCallback(async () => {
    await pickGameImage<EditGameForm>({
      setFormState: state.setEditGameFormState,
      successMessage: t("workspaceActions.coverSelectionUpdated"),
    })
  }, [pickGameImage, state.setEditGameFormState, t])

  const pickEditGameExecutable = useCallback(async () => {
    await pickGameExecutable<EditGameForm>({
      gameDir: state.editGameForm.dir,
      setFormState: state.setEditGameFormState,
      successMessage: t("workspaceActions.gameExecutableSelected"),
    })
  }, [pickGameExecutable, state.editGameForm.dir, state.setEditGameFormState, t])

  const resetEditGameImage = useCallback(() => {
    state.setEditGameFormState(createResetGameImagePatch<EditGameForm>())
    toast.info(t("workspaceActions.coverReset"))
  }, [state.setEditGameFormState, t])

  const confirmEditGame = useCallback(async () => {
    if (!state.editGameForm.id) {
      return
    }

    let toastId: string | number | undefined

    try {
      state.setSavingGameId(state.editGameForm.id)
      toastId = toast.loading(t("workspaceActions.savingGameInfo", { gameName: state.editGameForm.name }))

      const payload = await invokeApi<BootstrapPayload>("update_game_entry", {
        gameId: state.editGameForm.id,
        gameType: state.editGameForm.type,
        name: state.editGameForm.name,
        version: state.editGameForm.version,
        exeName: state.editGameForm.exeName,
        coverImageSourcePath: state.editGameForm.customImageSourcePath || null,
        existingCoverBase64: getExistingCoverBase64(state.editGameForm.imagePath),
        useDefaultImage: state.editGameForm.useDefaultImage,
      })

      applyBootstrap(payload)
      closeEditGameDialog()
      toast.success(t("workspaceActions.gameUpdated"), {
        id: toastId,
        description: state.editGameForm.name,
      })
    } catch (error) {
      toast.error(t("workspaceActions.editFailed"), {
        id: toastId,
        description: formatApiErrorMessage(error),
      })
    } finally {
      state.setSavingGameId(null)
    }
  }, [applyBootstrap, closeEditGameDialog, state, t])

  const confirmDeleteGame = useCallback(async (gameId: string, _removeOnly?: boolean) => {
    let toastId: string | number | undefined

    try {
      state.setSavingGameId(gameId)
      const gameName = games.find((game) => game.id === gameId)?.name ?? t("workspaceActions.currentGame")
      toastId = toast.loading(t("workspaceActions.deletingGameConfig"))

      const payload = await invokeApi<BootstrapPayload>("delete_game_entry", {
        gameId,
      })

      applyBootstrap(payload)
      state.setDeleteTargetGameId(null)
      toast.success(t("workspaceActions.gameDeleted"), {
        id: toastId,
        description: gameName,
      })

      if (payload.games.length === 0) {
        state.setCurrentView("home")
      }
    } catch (error) {
      toast.error(t("workspaceActions.deleteFailed"), {
        id: toastId,
        description: formatApiErrorMessage(error),
      })
    } finally {
      state.setSavingGameId(null)
    }
  }, [applyBootstrap, games, state, t])

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
    pickAddGameExecutable,
    pickAddGameImage,
    resetAddGameImage,
    confirmAddGame,
    openEditGameDialog,
    pickEditGameExecutable,
    pickEditGameImage,
    resetEditGameImage,
    confirmEditGame,
    confirmDeleteGame,
    updateGamesSortOrder,
  }
}
