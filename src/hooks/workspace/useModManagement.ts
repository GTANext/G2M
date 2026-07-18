import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { confirm, open } from "@tauri-apps/plugin-dialog"

import { formatApiErrorMessage, invokeApi } from "@/lib/api"
import {
  type BootstrapPayload,
  type Game,
  inferImportSourceType,
  inferTargetFolderFromPath,
  type ModImportFileEntry,
  type ModImportPreview,
} from "@/lib/g2m"
import { createDefaultImportModForm, type WorkspaceState } from "./types"
import { normalizeConflictTargetPath } from "./utils"

type ImportSourceType = "directory" | "zip"
type PreparedImportMapping = ModImportFileEntry & {
  overwriteExisting: boolean
}

function shouldOfferOverwriteRetry(errorMessage: string): boolean {
  const normalizedMessage = errorMessage.toLowerCase()

  return (
    errorMessage.includes("目标目录已存在") ||
    errorMessage.includes("目标路径已存在") ||
    errorMessage.includes("安装目标的父路径已存在且不是文件夹") ||
    (normalizedMessage.includes("failed to create target directory") &&
      (normalizedMessage.includes("os error 183") ||
        normalizedMessage.includes("already exists") ||
        normalizedMessage.includes("cannot create a file when that file already exists")))
  )
}

function hasInstallableMappings(mappings: PreparedImportMapping[]): boolean {
  return mappings.some((file) => !file.skipInstall && file.targetPath.trim())
}

function forceOverwriteInstallableMappings(mappings: PreparedImportMapping[]): PreparedImportMapping[] {
  return mappings.map((file) => ({
    ...file,
    overwriteExisting: Boolean(!file.skipInstall && file.targetPath.trim()),
  }))
}

function toImportDisplayName(selectedPath: string): string {
  const rawName = selectedPath.split(/[\\/]/).pop()?.trim() || ""
  return rawName.replace(/\.(zip|rar|7z)$/i, "")
}

function createImportModForm(selectedPath: string, sourceType: ImportSourceType) {
  return {
    dir: selectedPath,
    name: toImportDisplayName(selectedPath),
    sourceType,
  }
}

function getActiveConflictTargets({
  preview,
  mappings,
}: {
  preview: ModImportPreview
  mappings: ModImportFileEntry[]
}): string[] {
  return Array.from(
    new Set(
      preview.conflictFiles
        .map((conflict) => normalizeConflictTargetPath(conflict.targetPath))
        .filter((targetPath) =>
          mappings.some(
            (file) =>
              normalizeConflictTargetPath(file.targetPath) === targetPath &&
              !file.skipInstall &&
              file.targetPath.trim(),
          ),
        ),
    ),
  )
}

function prepareImportMappings({
  mappings,
  getConflictDecision,
}: {
  mappings: ModImportFileEntry[]
  getConflictDecision: (targetPath: string) => "overwrite" | "skip" | null
}): PreparedImportMapping[] {
  return mappings.map((file) => ({
    ...file,
    skipInstall: Boolean(
      file.skipInstall || !file.targetPath.trim() || getConflictDecision(file.targetPath) === "skip",
    ),
    overwriteExisting: getConflictDecision(file.targetPath) === "overwrite",
  }))
}

export function useModManagement(
  state: WorkspaceState,
  activeGame: Game | null,
  applyBootstrap: (payload: BootstrapPayload) => void,
) {
  const { t } = useTranslation()

  const resetImportModState = useCallback((sourceType: ImportSourceType = "directory") => {
    state.setImportModForm(createDefaultImportModForm(sourceType))
    state.setImportModMappingsState([])
    state.setImportModPreview(null)
    state.setImportConflictDecisions({})
    state.setIsPreviewingMod(false)
  }, [state])

  const closeImportModDialog = useCallback(() => {
    state.setIsImportModDialogOpen(false)
    resetImportModState()
  }, [state, resetImportModState])

  const toggleMod = useCallback(async (modId: string) => {
    const targetMod = state.allMods.find((mod) => mod.id === modId)
    if (!targetMod) {
      return
    }

    const nextEnabledState = !targetMod.enabled
    let toastId: string | number | undefined

    try {
      state.setTogglingModId(modId)
      toastId = toast.loading(t("workspaceActions.updatingModState"))

      const payload = await invokeApi<BootstrapPayload>("update_mod_enabled", {
        modId,
        enabled: nextEnabledState,
      })

      applyBootstrap(payload)
      toast.success(
        nextEnabledState ? t("workspaceActions.modEnabled") : t("workspaceActions.modDisabled"),
        {
          id: toastId,
          description: targetMod.name,
        },
      )
    } catch (error) {
      toast.error(t("workspaceActions.updateModFailed"), {
        id: toastId,
        description: formatApiErrorMessage(error),
      })
    } finally {
      state.setTogglingModId(null)
    }
  }, [applyBootstrap, state, t])

  const confirmDeleteMod = useCallback(async (modId: string) => {
    let toastId: string | number | undefined

    try {
      state.setDeletingModId(modId)
      const modName = state.allMods.find((mod) => mod.id === modId)?.name ?? t("workspacePage.importMod")
      toastId = toast.loading(t("workspaceActions.deletingMod"))

      const payload = await invokeApi<BootstrapPayload>("delete_mod_entry", {
        modId,
      })

      applyBootstrap(payload)
      state.setDeleteTargetModId(null)
      toast.success(t("workspaceActions.modDeleted"), {
        id: toastId,
        description: modName,
      })
    } catch (error) {
      toast.error(t("workspaceActions.deleteModFailed"), {
        id: toastId,
        description: formatApiErrorMessage(error),
      })
    } finally {
      state.setDeletingModId(null)
    }
  }, [applyBootstrap, state, t])

  const confirmRollbackMod = useCallback(async (modId: string) => {
    const modName = state.allMods.find((mod) => mod.id === modId)?.name ?? t("workspacePage.importMod")
    const shouldRollback = await confirm(
      t("workspaceActions.rollbackConfirmDescription", "确认要将游戏资源回滚至安装此 Mod 前的状态吗？\n此操作将清理该 Mod 的所有残留文件。"),
      {
        title: t("workspaceActions.rollbackConfirmTitle", "确认回滚"),
        kind: "warning",
        okLabel: t("workspaceDialogs.rollback", "确认回滚"),
        cancelLabel: t("workspaceDialogs.cancel", "取消"),
      },
    )

    if (!shouldRollback) {
      return
    }

    let toastId: string | number | undefined

    try {
      state.setDeletingModId(modId) // reuse deleting state for UI spinner
      toastId = toast.loading(t("workspaceActions.rollingBack", "正在回滚 Mod 状态..."))

      const payload = await invokeApi<BootstrapPayload>("rollback_mod_state", {
        modId,
      })

      applyBootstrap(payload)
      state.setDeleteTargetModId(null)
      toast.success(t("workspaceActions.rollbackSuccess", "Mod 状态已回滚"), {
        id: toastId,
        description: modName,
      })
    } catch (error) {
      toast.error(t("workspaceActions.rollbackFailed", "Mod 回滚失败"), {
        id: toastId,
        description: formatApiErrorMessage(error),
      })
    } finally {
      state.setDeletingModId(null)
    }
  }, [applyBootstrap, state, t])

  const updateModName = useCallback(async (modId: string, name: string) => {
    const targetMod = state.allMods.find((mod) => mod.id === modId)
    if (!targetMod) {
      return
    }

    const normalizedName = name.trim()
    if (!normalizedName) {
      toast.warning(t("workspaceActions.modNameRequired"))
      return
    }

    if (normalizedName === targetMod.name.trim()) {
      return
    }

    let toastId: string | number | undefined

    try {
      state.setRenamingModId(modId)
      toastId = toast.loading(t("workspaceActions.updatingModName"))

      const payload = await invokeApi<BootstrapPayload>("update_mod_name", {
        modId,
        modName: normalizedName,
      })

      applyBootstrap(payload)
      toast.success(t("workspaceActions.modNameUpdated"), {
        id: toastId,
        description: normalizedName,
      })
    } catch (error) {
      toast.error(t("workspaceActions.updateModNameFailed"), {
        id: toastId,
        description: formatApiErrorMessage(error),
      })
    } finally {
      state.setRenamingModId(null)
    }
  }, [applyBootstrap, state, t])

  const previewImportModSource = useCallback(async (selectedPath: string) => {
    if (!activeGame?.id) {
      toast.warning(t("workspaceActions.currentGame"))
      return
    }

    let toastId: string | number | undefined

    try {
      const sourceType = inferImportSourceType(selectedPath)
      const initialForm = createImportModForm(selectedPath, sourceType)

      state.setImportModForm(initialForm)
      state.setImportModMappingsState([])
      state.setImportModPreview(null)
      state.setIsPreviewingMod(true)
      toastId = toast.loading(t("workspaceActions.previewingMod"))

      const preview = await invokeApi<ModImportPreview>("preview_mod_directory", {
        gameId: activeGame.id,
        modPath: selectedPath,
        modName: initialForm.name || undefined,
      })

      state.setImportModForm({
        dir: selectedPath,
        name: preview.name || initialForm.name,
        sourceType,
      })
      state.setImportModMappingsState(preview.files)
      state.setImportModPreview(preview)
      state.setImportConflictDecisions({})
      toast.success(t("workspaceActions.modPreviewReady"), {
        id: toastId,
        description: preview.name || initialForm.name || t("workspacePage.importMod"),
      })
    } catch (error) {
      state.setImportModMappingsState([])
      state.setImportModPreview(null)
      toast.error(t("workspaceActions.importPreviewFailed"), {
        id: toastId,
        description: formatApiErrorMessage(error),
      })
    } finally {
      state.setIsPreviewingMod(false)
    }
  }, [activeGame, state, t])

  const pickImportModDirectory = useCallback(async () => {
    if (!activeGame?.id) {
      toast.warning(t("workspaceActions.currentGame"))
      return
    }

    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: t("workspaceActions.chooseModDirectoryTitle"),
      })

      if (!selected || Array.isArray(selected)) {
        return
      }

      await previewImportModSource(String(selected))
    } catch (error) {
      toast.error(t("workspaceActions.importPreviewFailed"), {
        description: formatApiErrorMessage(error),
      })
    }
  }, [activeGame, previewImportModSource, t])

  const pickImportModArchive = useCallback(async () => {
    if (!activeGame?.id) {
      toast.warning(t("workspaceActions.currentGame"))
      return
    }

    try {
      const selected = await open({
        multiple: false,
        title: t("workspaceActions.chooseModArchiveTitle"),
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
      toast.error(t("workspaceActions.importPreviewFailed"), {
        description: formatApiErrorMessage(error),
      })
    }
  }, [activeGame, previewImportModSource, t])

  const pickImportModSource = useCallback(async (sourceType?: ImportSourceType) => {
    const nextSourceType = sourceType ?? state.importModForm.sourceType

    if (sourceType) {
      state.setImportModForm((current) => ({
        ...current,
        sourceType,
      }))
    }

    if (nextSourceType === "zip") {
      await pickImportModArchive()
      return
    }

    await pickImportModDirectory()
  }, [state, pickImportModArchive, pickImportModDirectory])

  const getImportConflictDecision = useCallback(
    (targetPath: string) =>
      state.importConflictDecisions[normalizeConflictTargetPath(targetPath)] ?? null,
    [state.importConflictDecisions],
  )

  const confirmImportMod = useCallback(async () => {
    if (!activeGame?.id) {
      toast.warning(t("workspaceActions.currentGame"))
      return
    }
    if (!state.importModForm.dir.trim()) {
      toast.warning(t("workspaceActions.selectModDirectoryFirst"))
      return
    }
    if (!state.importModPreview) {
      toast.warning(t("workspaceActions.scanModFirst"))
      return
    }

    let toastId: string | number | undefined

    try {
      state.setIsImportingMod(true)
      toastId = toast.loading(t("workspaceActions.importingMod"))

      const activeConflictTargets = getActiveConflictTargets({
        preview: state.importModPreview,
        mappings: state.importModMappings,
      })

      const unresolvedConflictTargets = activeConflictTargets.filter(
        (targetPath) => !state.importConflictDecisions[targetPath],
      )

      if (unresolvedConflictTargets.length > 0) {
        toast.warning(
          t("workspaceActions.resolveImportConflictsFirst", { count: unresolvedConflictTargets.length }),
          {
            id: toastId,
          },
        )
        return
      }

      const preparedMappings = prepareImportMappings({
        mappings: state.importModMappings,
        getConflictDecision: getImportConflictDecision,
      })
      const skippedMappingsCount = preparedMappings.filter((file) => file.skipInstall).length

      if (skippedMappingsCount > 0) {
        state.setImportModMappingsState(preparedMappings)
        toast.info(t("workspaceActions.emptyTargetPathsHandled", { count: skippedMappingsCount }))
      }

      const submitImport = (mappings: PreparedImportMapping[]) =>
        invokeApi<BootstrapPayload>("import_mod_directory", {
          gameId: activeGame.id,
          modPath: state.importModForm.dir.trim(),
          modName: state.importModForm.name.trim() || undefined,
          files: mappings.map((file) => ({
            relativePath: file.relativePath,
            targetPath: file.targetPath,
            skipInstall: Boolean(file.skipInstall || !file.targetPath.trim()),
            overwriteExisting: Boolean(file.overwriteExisting),
          })),
        })

      let payload: BootstrapPayload

      try {
        payload = await submitImport(preparedMappings)
      } catch (error) {
        const errorMessage = formatApiErrorMessage(error)
        if (!hasInstallableMappings(preparedMappings) || !shouldOfferOverwriteRetry(errorMessage)) {
          throw error
        }

        const shouldOverwrite = await confirm(
          t("workspaceActions.overwriteInstallTargetsConfirmDescription"),
          {
            title: t("workspaceActions.overwriteInstallTargetsConfirmTitle"),
            kind: "warning",
            okLabel: t("workspaceDialogs.overwrite"),
            cancelLabel: t("workspaceDialogs.cancel"),
          },
        )
        if (!shouldOverwrite) {
          toast.error(t("workspaceActions.importModFailed"), {
            id: toastId,
            description: errorMessage,
          })
          return
        }

        const overwriteMappings = forceOverwriteInstallableMappings(preparedMappings)
        state.setImportModMappingsState(overwriteMappings)
        toast.loading(t("workspaceActions.retryingOverwriteInstall"), {
          id: toastId,
        })
        payload = await submitImport(overwriteMappings)
      }

      applyBootstrap(payload)
      toast.success(t("workspaceActions.modImported"), {
        id: toastId,
        description: state.importModPreview.name || state.importModForm.name || t("workspacePage.importMod"),
      })
      closeImportModDialog()
    } catch (error) {
      toast.error(t("workspaceActions.importModFailed"), {
        id: toastId,
        description: formatApiErrorMessage(error),
      })
    } finally {
      state.setIsImportingMod(false)
    }
  }, [activeGame, applyBootstrap, closeImportModDialog, state, getImportConflictDecision, t])

  const setImportModSourceType = useCallback((value: ImportSourceType) => {
    resetImportModState(value)
  }, [resetImportModState])

  const updateImportModMappingTarget = useCallback((relativePath: string, targetPath: string) => {
    state.setImportModMappingsState((current) =>
      current.map((file) =>
        file.relativePath === relativePath
          ? {
              ...file,
              targetPath,
              targetFolder: inferTargetFolderFromPath(targetPath),
              skipInstall: !targetPath.trim(),
            }
          : file,
      ),
    )
  }, [state])

  return {
    resetImportModState,
    closeImportModDialog,
    toggleMod,
    confirmDeleteMod,
    confirmRollbackMod,
    updateModName,
    pickImportModSource,
    confirmImportMod,
    setImportModSourceType,
    updateImportModMappingTarget,
  }
}
