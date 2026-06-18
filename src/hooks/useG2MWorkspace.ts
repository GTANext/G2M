import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import { openPath, openUrl } from "@tauri-apps/plugin-opener"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { useI18n } from "@/components/app/i18nProvider"
import {
  buildGamesFromBackend,
  buildDisplayMods,
  buildWorkspaceStats,
  type BootstrapPayload,
  type DetectedGame,
  type Game,
  type ManagedMod,
  type ModImportFileEntry,
  type ModImportPreview,
} from "@/lib/g2m"

type AddGameForm = {
  dir: string
  type: "sa" | "vc" | "iii" | ""
  name: string
  version: string
  exeName: string
  imagePath: string
  customImageSourcePath: string
  useDefaultImage: boolean
}

type EditGameForm = AddGameForm & {
  id: string
}

type ImportModForm = {
  dir: string
  name: string
  sourceType: "directory" | "zip"
}

type ConflictDecision = "overwrite" | "skip"

export type UseG2mWorkspaceResult = {
  activeGame: Game | null
  activeGameId: string | null
  addGameForm: AddGameForm
  closeAddGameDialog: () => void
  closeConflictDialog: () => void
  closeEditGameDialog: () => void
  bootstrap: BootstrapPayload | null
  bootstrapping: boolean
  confirmDeleteGame: (gameId: string) => Promise<void>
  confirmEditGame: () => Promise<void>
  configuredGames: Game[]
  currentView: "home" | "game"
  deleteTargetGameId: string | null
  editGameForm: EditGameForm
  allModsCount: number
  games: Game[]
  getConflictDecision: (modId: string, conflictId: string) => ConflictDecision | null
  goHome: () => void
  hasConfiguredGames: boolean
  isAddGameDialogOpen: boolean
  isConflictDialogOpen: boolean
  isDetectingGame: boolean
  isEditGameDialogOpen: boolean
  isImportModDialogOpen: boolean
  isImportingMod: boolean
  isPreviewingMod: boolean
  importModForm: ImportModForm
  importModMappings: ModImportFileEntry[]
  importModPreview: ModImportPreview | null
  mods: ManagedMod[]
  closeImportModDialog: () => void
  openConflictDialog: () => void
  openDeleteGameDialog: (gameId: string) => void
  openEditGameDialog: (gameId: string) => void
  openImportModDialog: () => void
  openGameDirectory: (gameId?: string) => Promise<void>
  confirmImportMod: () => Promise<void>
  pickImportModSource: (sourceType?: ImportModForm["sourceType"]) => Promise<void>
  pickAddGameImage: () => Promise<void>
  pickEditGameImage: () => Promise<void>
  pickGameDirectory: () => Promise<void>
  resetAddGameImage: () => void
  resetEditGameImage: () => void
  openGamesDownloadPage: () => Promise<void>
  openGame: (gameId: string) => void
  modSearchQuery: string
  savingGameId: string | null
  selectedMod: ManagedMod | null
  selectedModId: string
  setModSearchQuery: (value: string) => void
  confirmAddGame: () => Promise<void>
  setAddGameForm: (patch: Partial<AddGameForm>) => void
  setDeleteTargetGameId: (gameId: string | null) => void
  setEditGameForm: (patch: Partial<EditGameForm>) => void
  setImportModName: (value: string) => void
  setImportModMappings: (files: ModImportFileEntry[]) => void
  setImportModSourceType: (value: ImportModForm["sourceType"]) => void
  updateImportModMappingTarget: (relativePath: string, targetPath: string) => void
  setActiveGameId: (gameId: string) => void
  setSelectedModId: (modId: string) => void
  stats: ReturnType<typeof buildWorkspaceStats>
  toggleMod: (modId: string) => Promise<void>
  togglingModId: string | null
  refreshWorkspace: () => Promise<void>
  resolveConflict: (modId: string, conflictId: string, decision: ConflictDecision) => void
  startAddGame: () => void
}

export function useG2mWorkspace(): UseG2mWorkspaceResult {
  const { copy } = useI18n()
  const [activeGameId, setActiveGameId] = useState<string | null>(null)
  const [currentView, setCurrentView] = useState<"home" | "game">("home")
  const [isAddGameDialogOpen, setIsAddGameDialogOpen] = useState(false)
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false)
  const [isDetectingGame, setIsDetectingGame] = useState(false)
  const [isEditGameDialogOpen, setIsEditGameDialogOpen] = useState(false)
  const [isImportModDialogOpen, setIsImportModDialogOpen] = useState(false)
  const [isImportingMod, setIsImportingMod] = useState(false)
  const [isPreviewingMod, setIsPreviewingMod] = useState(false)
  const [deleteTargetGameId, setDeleteTargetGameId] = useState<string | null>(null)
  const [addGameForm, setAddGameFormState] = useState<AddGameForm>({
    dir: "",
    type: "",
    name: "",
    version: "",
    exeName: "",
    imagePath: "",
    customImageSourcePath: "",
    useDefaultImage: true,
  })
  const [editGameForm, setEditGameFormState] = useState<EditGameForm>({
    id: "",
    dir: "",
    type: "",
    name: "",
    version: "",
    exeName: "",
    imagePath: "",
    customImageSourcePath: "",
    useDefaultImage: true,
  })
  const [importModForm, setImportModForm] = useState<ImportModForm>({
    dir: "",
    name: "",
    sourceType: "directory",
  })
  const [importModMappings, setImportModMappingsState] = useState<ModImportFileEntry[]>([])
  const [importModPreview, setImportModPreview] = useState<ModImportPreview | null>(null)
  const [allMods, setAllMods] = useState<ManagedMod[]>([])
  const [conflictDecisions, setConflictDecisions] = useState<Record<string, ConflictDecision>>({})
  const [modSearchQuery, setModSearchQuery] = useState("")
  const [selectedModId, setSelectedModId] = useState("")
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [savingGameId, setSavingGameId] = useState<string | null>(null)
  const [togglingModId, setTogglingModId] = useState<string | null>(null)

  const applyBootstrap = useCallback(
    (payload: BootstrapPayload) => {
      setBootstrap(payload)

      const nextMods = buildDisplayMods(payload.mods)
      setAllMods(nextMods)
      setConflictDecisions((current) => {
        const validKeys = new Set(
          nextMods.flatMap((mod) =>
            mod.conflictFiles.map((conflict) => buildConflictDecisionKey(mod.id, conflict.id)),
          ),
        )

        return Object.fromEntries(
          Object.entries(current).filter(([key]) => validKeys.has(key)),
        )
      })

      setSelectedModId((currentSelectedModId) => {
        if (nextMods.some((mod) => mod.id === currentSelectedModId)) {
          return currentSelectedModId
        }

        return nextMods[0]?.id ?? ""
      })

      setActiveGameId((currentActiveGameId) => {
        if (currentActiveGameId && payload.games.some((game) => game.id === currentActiveGameId)) {
          return currentActiveGameId
        }

        return payload.games[0]?.id ?? null
      })
    },
    [],
  )

  const refreshWorkspace = useCallback(async () => {
    try {
      setBootstrapping(true)
      const payload = await invoke<BootstrapPayload>("bootstrap_app")
      applyBootstrap(payload)
    } catch (error) {
      toast.error(copy.workspaceActions.initFailed, {
        description: formatErrorMessage(error),
      })
    } finally {
      setBootstrapping(false)
    }
  }, [applyBootstrap, copy.workspaceActions.initFailed])

  useEffect(() => {
    void refreshWorkspace()
  }, [refreshWorkspace])

  const games = useMemo(() => {
    if (!bootstrap) {
      return []
    }

    return buildGamesFromBackend(bootstrap.games, bootstrap.mods)
  }, [bootstrap])

  const activeGameMods = useMemo(
    () => allMods.filter((mod) => !activeGameId || mod.gameId === activeGameId),
    [activeGameId, allMods],
  )

  const mods = useMemo(() => {
    const keyword = modSearchQuery.trim().toLowerCase()
    if (!keyword) {
      return activeGameMods
    }

    return activeGameMods.filter((mod) => matchesModSearch(mod, keyword))
  }, [activeGameMods, modSearchQuery])

  const activeGame = useMemo(
    () => games.find((game) => game.id === activeGameId) ?? games[0] ?? null,
    [activeGameId, games],
  )

  const selectedMod = useMemo(
    () => mods.find((mod) => mod.id === selectedModId) ?? mods[0] ?? null,
    [mods, selectedModId],
  )

  const configuredGames = useMemo(
    () => games.filter((game) => game.status === "ready"),
    [games],
  )
  const hasConfiguredGames = configuredGames.length > 0
  const stats = useMemo(() => buildWorkspaceStats(activeGameMods), [activeGameMods])

  useEffect(() => {
    if (currentView === "game" && !activeGame) {
      setCurrentView("home")
    }
  }, [activeGame, currentView])

  const toggleMod = useCallback(async (modId: string) => {
    const targetMod = allMods.find((mod) => mod.id === modId)
    if (!targetMod) {
      return
    }

    const nextEnabledState = !targetMod.enabled
    let toastId: string | number | undefined

    try {
      setTogglingModId(modId)
      toastId = toast.loading(copy.workspaceActions.updatingModState)

      const payload = await invoke<BootstrapPayload>("update_mod_enabled", {
        modId,
        enabled: nextEnabledState,
      })

      applyBootstrap(payload)
      toast.success(
        nextEnabledState ? copy.workspaceActions.modEnabled : copy.workspaceActions.modDisabled,
        {
          id: toastId,
          description: targetMod.name,
        },
      )
    } catch (error) {
      toast.error(copy.workspaceActions.updateModFailed, {
        id: toastId,
        description: formatErrorMessage(error),
      })
    } finally {
      setTogglingModId(null)
    }
  }, [
    allMods,
    applyBootstrap,
    copy.workspaceActions.modDisabled,
    copy.workspaceActions.modEnabled,
    copy.workspaceActions.updateModFailed,
    copy.workspaceActions.updatingModState,
  ])

  const resolveConflict = useCallback(
    (modId: string, conflictId: string, decision: ConflictDecision) => {
      setConflictDecisions((current) => ({
        ...current,
        [buildConflictDecisionKey(modId, conflictId)]: decision,
      }))

      const mod = mods.find((item) => item.id === modId)
      const conflict = mod?.conflictFiles.find((item) => item.id === conflictId)

      toast.success(decision === "overwrite" ? copy.workspaceActions.conflictSetOverwrite : copy.workspaceActions.conflictSetSkip, {
        description: conflict?.fileName ?? copy.workspaceActions.conflictUpdated,
      })
    },
    [copy.workspaceActions.conflictSetOverwrite, copy.workspaceActions.conflictSetSkip, copy.workspaceActions.conflictUpdated, mods],
  )

  const getConflictDecision = useCallback(
    (modId: string, conflictId: string) =>
      conflictDecisions[buildConflictDecisionKey(modId, conflictId)] ?? null,
    [conflictDecisions],
  )

  const setAddGameForm = useCallback((patch: Partial<AddGameForm>) => {
    setAddGameFormState((current) => ({
      ...current,
      ...patch,
    }))
  }, [])

  const setEditGameForm = useCallback((patch: Partial<EditGameForm>) => {
    setEditGameFormState((current) => ({
      ...current,
      ...patch,
    }))
  }, [])

  const closeAddGameDialog = useCallback(() => {
    setIsAddGameDialogOpen(false)
    setIsDetectingGame(false)
    setAddGameFormState({
      dir: "",
      type: "",
      name: "",
      version: "",
      exeName: "",
      imagePath: "",
      customImageSourcePath: "",
      useDefaultImage: true,
    })
  }, [])

  const openConflictDialog = useCallback(() => {
    setIsConflictDialogOpen(true)
  }, [])

  const closeConflictDialog = useCallback(() => {
    setIsConflictDialogOpen(false)
  }, [])

  const closeEditGameDialog = useCallback(() => {
    setIsEditGameDialogOpen(false)
    setEditGameFormState({
      id: "",
      dir: "",
      type: "",
      name: "",
      version: "",
      exeName: "",
      imagePath: "",
      customImageSourcePath: "",
      useDefaultImage: true,
    })
  }, [])

  const closeImportModDialog = useCallback(() => {
    setIsImportModDialogOpen(false)
    setImportModForm({
      dir: "",
      name: "",
      sourceType: "directory",
    })
    setImportModMappingsState([])
    setImportModPreview(null)
    setIsPreviewingMod(false)
  }, [])

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

      setIsDetectingGame(true)
      toastId = toast.loading(copy.workspaceActions.checkingDirectory)

      const detectedGame = await invoke<DetectedGame>("detect_game_directory", {
        gamePath: selected,
      })

      setAddGameFormState({
        dir: detectedGame.path,
        type: detectedGame.gameType,
        name: detectedGame.name,
        version: detectedGame.version,
        exeName: detectedGame.exeName,
        imagePath: "",
        customImageSourcePath: "",
        useDefaultImage: true,
      })
      toast.success(copy.workspaceActions.gameDetected, {
        id: toastId,
        description: `${detectedGame.name} · ${detectedGame.exeName}`,
      })
    } catch (error) {
      toast.error(copy.workspaceActions.directoryCheckFailed, {
        id: toastId,
        description: formatErrorMessage(error),
      })
    } finally {
      setIsDetectingGame(false)
    }
  }, [
    copy.workspaceActions.checkingDirectory,
    copy.workspaceActions.chooseGameDirectoryTitle,
    copy.workspaceActions.directoryCheckFailed,
    copy.workspaceActions.gameDetected,
  ])

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

    setAddGameFormState((current) => ({
      ...current,
      imagePath: selected,
      customImageSourcePath: selected,
      useDefaultImage: false,
    }))
    toast.success(copy.workspaceActions.coverSelected)
  }, [copy.workspaceActions.chooseGameCoverTitle, copy.workspaceActions.coverSelected])

  const resetAddGameImage = useCallback(() => {
    setAddGameFormState((current) => ({
      ...current,
      imagePath: "",
      customImageSourcePath: "",
      useDefaultImage: true,
    }))
    toast.info(copy.workspaceActions.coverReset)
  }, [copy.workspaceActions.coverReset])

  const confirmAddGame = useCallback(async () => {
    if (!addGameForm.dir.trim()) {
      toast.warning(copy.workspaceActions.selectGameDirectoryFirst)
      return
    }
    if (!addGameForm.type) {
      toast.warning(copy.workspaceActions.confirmGameTypeFirst)
      return
    }

    let toastId: string | number | undefined

    try {
      setSavingGameId("add-game")
      toastId = toast.loading(copy.workspaceActions.savingGameConfig)

      const payload = await invoke<BootstrapPayload>("save_game_path", {
        gamePath: addGameForm.dir.trim(),
        gameType: addGameForm.type,
        name: addGameForm.name,
        version: addGameForm.version,
        coverImageSourcePath: addGameForm.customImageSourcePath || null,
      })

      const addedGame = payload.games[payload.games.length - 1]
      applyBootstrap(payload)
      toast.success(copy.workspaceActions.gameAdded, {
        id: toastId,
        description: addGameForm.name || addedGame?.name || copy.workspaceActions.gameConfigSaved,
      })
      closeAddGameDialog()
      setCurrentView("home")

      if (addedGame) {
        setActiveGameId(addedGame.id)
      }
    } catch (error) {
      toast.error(copy.workspaceActions.addFailed, {
        id: toastId,
        description: formatErrorMessage(error),
      })
    } finally {
      setSavingGameId(null)
    }
  }, [
    addGameForm,
    applyBootstrap,
    closeAddGameDialog,
    copy.workspaceActions.addFailed,
    copy.workspaceActions.confirmGameTypeFirst,
    copy.workspaceActions.gameAdded,
    copy.workspaceActions.gameConfigSaved,
    copy.workspaceActions.savingGameConfig,
    copy.workspaceActions.selectGameDirectoryFirst,
  ])

  const openEditGameDialog = useCallback((gameId: string) => {
    const game = games.find((item) => item.id === gameId)
    if (!game) {
      return
    }

    setEditGameFormState({
      id: game.id,
      dir: game.gamePath,
      type: game.gameType,
      name: game.name,
      version: game.version,
      exeName: game.exeName,
      imagePath: game.imagePath,
      customImageSourcePath: "",
      useDefaultImage: !game.imagePath,
    })
    setIsEditGameDialogOpen(true)
  }, [games])

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

    setEditGameFormState((current) => ({
      ...current,
      imagePath: selected,
      customImageSourcePath: selected,
      useDefaultImage: false,
    }))
    toast.success(copy.workspaceActions.coverSelectionUpdated)
  }, [copy.workspaceActions.chooseGameCoverTitle, copy.workspaceActions.coverSelectionUpdated])

  const resetEditGameImage = useCallback(() => {
    setEditGameFormState((current) => ({
      ...current,
      imagePath: "",
      customImageSourcePath: "",
      useDefaultImage: true,
    }))
    toast.info(copy.workspaceActions.coverReset)
  }, [copy.workspaceActions.coverReset])

  const confirmEditGame = useCallback(async () => {
    if (!editGameForm.id) {
      return
    }

    let toastId: string | number | undefined

    try {
      setSavingGameId(editGameForm.id)
      toastId = toast.loading(copy.workspaceActions.savingGameInfo(editGameForm.name))

      const payload = await invoke<BootstrapPayload>("update_game_entry", {
        gameId: editGameForm.id,
        gameType: editGameForm.type,
        name: editGameForm.name,
        version: editGameForm.version,
        coverImageSourcePath: editGameForm.customImageSourcePath || null,
        useDefaultImage: editGameForm.useDefaultImage,
      })

      applyBootstrap(payload)
      closeEditGameDialog()
      toast.success(copy.workspaceActions.gameUpdated, {
        id: toastId,
        description: editGameForm.name,
      })
    } catch (error) {
      toast.error(copy.workspaceActions.editFailed, {
        id: toastId,
        description: formatErrorMessage(error),
      })
    } finally {
      setSavingGameId(null)
    }
  }, [
    applyBootstrap,
    closeEditGameDialog,
    copy.workspaceActions.editFailed,
    copy.workspaceActions.gameUpdated,
    copy.workspaceActions.savingGameInfo,
    editGameForm,
  ])

  const openDeleteGameDialog = useCallback((gameId: string) => {
    setDeleteTargetGameId(gameId)
  }, [])

  const confirmDeleteGame = useCallback(async (gameId: string) => {
    let toastId: string | number | undefined

    try {
      setSavingGameId(gameId)
      const gameName = games.find((game) => game.id === gameId)?.name ?? copy.workspaceActions.currentGame
      toastId = toast.loading(copy.workspaceActions.deletingGameConfig)

      const payload = await invoke<BootstrapPayload>("delete_game_entry", {
        gameId,
      })

      applyBootstrap(payload)
      setDeleteTargetGameId(null)
      toast.success(copy.workspaceActions.gameDeleted, {
        id: toastId,
        description: gameName,
      })

      if (payload.games.length === 0) {
        setCurrentView("home")
      }
    } catch (error) {
      toast.error(copy.workspaceActions.deleteFailed, {
        id: toastId,
        description: formatErrorMessage(error),
      })
    } finally {
      setSavingGameId(null)
    }
  }, [
    applyBootstrap,
    copy.workspaceActions.currentGame,
    copy.workspaceActions.deleteFailed,
    copy.workspaceActions.deletingGameConfig,
    copy.workspaceActions.gameDeleted,
    games,
  ])

  const goHome = useCallback(() => {
    setCurrentView("home")
  }, [])

  const openGame = useCallback((gameId: string) => {
    setActiveGameId(gameId)
    setCurrentView("game")
  }, [])

  const startAddGame = useCallback(() => {
    setIsAddGameDialogOpen(true)
    setAddGameFormState({
      dir: "",
      type: "",
      name: "",
      version: "",
      exeName: "",
      imagePath: "",
      customImageSourcePath: "",
      useDefaultImage: true,
    })
  }, [])

  const openImportModDialog = useCallback(() => {
    setIsImportModDialogOpen(true)
    setImportModForm({
      dir: "",
      name: "",
      sourceType: "directory",
    })
    setImportModMappingsState([])
    setImportModPreview(null)
    setIsPreviewingMod(false)
  }, [])

  const openGamesDownloadPage = useCallback(async () => {
    try {
      await openUrl("https://gtamodx.com/games")
      toast.success(copy.workspaceActions.downloadPageOpened)
    } catch (error) {
      toast.error(copy.workspaceActions.openDownloadPageFailed, {
        description: formatErrorMessage(error),
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
      await openPath(targetGame.gamePath)
      toast.success(copy.workspaceActions.gameDirectoryOpened, {
        description: targetGame.gamePath,
      })
    } catch (error) {
      toast.error(copy.workspaceActions.openGameDirectoryFailed, {
        description: formatErrorMessage(error),
      })
    }
  }, [
    activeGame,
    copy.workspaceActions.gameDirectoryOpened,
    copy.workspaceActions.noOpenDirectory,
    copy.workspaceActions.openGameDirectoryFailed,
    games,
  ])

  const previewImportModSource = useCallback(async (selectedPath: string) => {
    if (!activeGame?.id) {
      toast.warning(copy.workspaceActions.currentGame)
      return
    }

    let toastId: string | number | undefined

    try {
      const modName = selectedPath.split(/[\\/]/).pop() || ""
      const sourceType = inferImportSourceType(selectedPath)
      setImportModForm({
        dir: selectedPath,
        name: modName,
        sourceType,
      })
      setImportModMappingsState([])
      setImportModPreview(null)
      setIsPreviewingMod(true)
      toastId = toast.loading(copy.workspaceActions.previewingMod)

      const preview = await invoke<ModImportPreview>("preview_mod_directory", {
        gameId: activeGame.id,
        modPath: selectedPath,
        modName: modName || undefined,
      })

      setImportModForm({
        dir: selectedPath,
        name: preview.name || modName,
        sourceType,
      })
      setImportModMappingsState(preview.files)
      setImportModPreview(preview)
      toast.success(copy.workspaceActions.modPreviewReady, {
        id: toastId,
        description: preview.name || modName || copy.workspacePage.importMod,
      })
    } catch (error) {
      setImportModMappingsState([])
      setImportModPreview(null)
      toast.error(copy.workspaceActions.importPreviewFailed, {
        id: toastId,
        description: formatErrorMessage(error),
      })
    } finally {
      setIsPreviewingMod(false)
    }
  }, [
    activeGame?.id,
    copy.workspaceActions.currentGame,
    copy.workspaceActions.importPreviewFailed,
    copy.workspaceActions.modPreviewReady,
    copy.workspaceActions.previewingMod,
    copy.workspacePage.importMod,
  ])

  const pickImportModDirectory = useCallback(async () => {
    if (!activeGame?.id) {
      toast.warning(copy.workspaceActions.currentGame)
      return
    }

    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: copy.workspaceActions.chooseModDirectoryTitle,
      })

      if (!selected || Array.isArray(selected)) {
        return
      }

      await previewImportModSource(String(selected))
    } catch (error) {
      toast.error(copy.workspaceActions.importPreviewFailed, {
        description: formatErrorMessage(error),
      })
    }
  }, [
    activeGame?.id,
    copy.workspaceActions.chooseModDirectoryTitle,
    copy.workspaceActions.currentGame,
    copy.workspaceActions.importPreviewFailed,
    previewImportModSource,
  ])

  const pickImportModArchive = useCallback(async () => {
    if (!activeGame?.id) {
      toast.warning(copy.workspaceActions.currentGame)
      return
    }

    try {
      const selected = await open({
        multiple: false,
        title: copy.workspaceActions.chooseModArchiveTitle,
        filters: [
          {
            name: "ZIP",
            extensions: ["zip"],
          },
        ],
      })

      if (!selected || Array.isArray(selected)) {
        return
      }

      await previewImportModSource(String(selected))
    } catch (error) {
      toast.error(copy.workspaceActions.importPreviewFailed, {
        description: formatErrorMessage(error),
      })
    }
  }, [
    activeGame?.id,
    copy.workspaceActions.chooseModArchiveTitle,
    copy.workspaceActions.currentGame,
    copy.workspaceActions.importPreviewFailed,
    previewImportModSource,
  ])

  const pickImportModSource = useCallback(async (sourceType?: ImportModForm["sourceType"]) => {
    const nextSourceType = sourceType ?? importModForm.sourceType

    if (sourceType) {
      setImportModForm((current) => ({
        ...current,
        sourceType,
      }))
    }

    if (nextSourceType === "zip") {
      await pickImportModArchive()
      return
    }

    await pickImportModDirectory()
  }, [importModForm.sourceType, pickImportModArchive, pickImportModDirectory])

  const setImportModSourceType = useCallback((value: ImportModForm["sourceType"]) => {
    setImportModForm({
      dir: "",
      name: "",
      sourceType: value,
    })
    setImportModMappingsState([])
    setImportModPreview(null)
  }, [])

  const setImportModMappings = useCallback((files: ModImportFileEntry[]) => {
    setImportModMappingsState(files)
  }, [])

  const updateImportModMappingTarget = useCallback((relativePath: string, targetPath: string) => {
    setImportModMappingsState((current) =>
      current.map((file) =>
        file.relativePath === relativePath
          ? {
              ...file,
              targetPath,
              targetFolder: inferTargetFolder(targetPath),
            }
          : file,
      ),
    )
  }, [])

  const confirmImportMod = useCallback(async () => {
    if (!activeGame?.id) {
      toast.warning(copy.workspaceActions.currentGame)
      return
    }
    if (!importModForm.dir.trim()) {
      toast.warning(copy.workspaceActions.selectModDirectoryFirst)
      return
    }
    if (!importModPreview) {
      toast.warning(copy.workspaceActions.scanModFirst)
      return
    }

    let toastId: string | number | undefined

    try {
      setIsImportingMod(true)
      toastId = toast.loading(copy.workspaceActions.importingMod)

      const payload = await invoke<BootstrapPayload>("import_mod_directory", {
        gameId: activeGame.id,
        modPath: importModForm.dir.trim(),
        modName: importModForm.name.trim() || undefined,
        files: importModMappings,
      })

      applyBootstrap(payload)
      toast.success(copy.workspaceActions.modImported, {
        id: toastId,
        description: importModPreview.name || importModForm.name || copy.workspacePage.importMod,
      })
      closeImportModDialog()
    } catch (error) {
      toast.error(copy.workspaceActions.importModFailed, {
        id: toastId,
        description: formatErrorMessage(error),
      })
    } finally {
      setIsImportingMod(false)
    }
  }, [
    activeGame,
    applyBootstrap,
    closeImportModDialog,
    copy.workspaceActions.currentGame,
    copy.workspaceActions.importModFailed,
    copy.workspaceActions.importingMod,
    copy.workspaceActions.modImported,
    copy.workspaceActions.scanModFirst,
    copy.workspaceActions.selectModDirectoryFirst,
    copy.workspacePage.importMod,
    importModForm.dir,
    importModForm.name,
    importModMappings,
    importModPreview,
  ])

  return {
    activeGame,
    activeGameId,
    allModsCount: activeGameMods.length,
    addGameForm,
    closeAddGameDialog,
    closeConflictDialog,
    closeEditGameDialog,
    bootstrap,
    bootstrapping,
    confirmAddGame,
    confirmDeleteGame,
    confirmEditGame,
    confirmImportMod,
    configuredGames,
    closeImportModDialog,
    currentView,
    deleteTargetGameId,
    editGameForm,
    games,
    getConflictDecision,
    goHome,
    hasConfiguredGames,
    isAddGameDialogOpen,
    isConflictDialogOpen,
    isDetectingGame,
    isEditGameDialogOpen,
    isImportModDialogOpen,
    isImportingMod,
    isPreviewingMod,
    importModForm,
    importModMappings,
    importModPreview,
    modSearchQuery,
    mods,
    openImportModDialog,
    openConflictDialog,
    openDeleteGameDialog,
    openEditGameDialog,
    openGameDirectory,
    pickImportModSource,
    pickAddGameImage,
    pickEditGameImage,
    pickGameDirectory,
    resetAddGameImage,
    resetEditGameImage,
    openGamesDownloadPage,
    openGame,
    savingGameId,
    selectedMod,
    selectedModId,
    setAddGameForm,
    setDeleteTargetGameId,
    setEditGameForm,
    setImportModName: (value) =>
      setImportModForm((current) => ({
        ...current,
        name: value,
      })),
    setImportModMappings,
    setImportModSourceType,
    updateImportModMappingTarget,
    setModSearchQuery,
    setActiveGameId,
    setSelectedModId,
    stats,
    toggleMod,
    togglingModId,
    refreshWorkspace,
    resolveConflict,
    startAddGame,
  }
}

function buildConflictDecisionKey(modId: string, conflictId: string): string {
  return `${modId}::${conflictId}`
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

function inferImportSourceType(selectedPath: string): ImportModForm["sourceType"] {
  return selectedPath.toLowerCase().endsWith(".zip") ? "zip" : "directory"
}

function inferTargetFolder(targetPath: string): string {
  const normalized = targetPath.replace(/\\/g, "/").replace(/^\/+/, "")
  return normalized.split("/").filter(Boolean)[0] ?? ""
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
