import { useCallback } from "react"
import { toast } from "sonner"
import { open } from "@tauri-apps/plugin-dialog"

import { useI18n } from "@/components/app/i18nProvider"
import { formatApiErrorMessage, invokeApi } from "@/lib/api"
import {
  type BootstrapPayload,
  type Game,
  inferImportSourceType,
  inferTargetFolderFromPath,
  type ModImportPreview,
} from "@/lib/g2m"
import { createDefaultImportModForm, type WorkspaceState } from "./types"

function toImportDisplayName(selectedPath: string): string {
  const rawName = selectedPath.split(/[\\/]/).pop()?.trim() || ""
  return rawName.replace(/\.(zip|rar|7z)$/i, "")
}

export function useModManagement(state: WorkspaceState, activeGame: Game | null, applyBootstrap: (payload: BootstrapPayload) => void) {
  const { copy } = useI18n()

  const resetImportModState = useCallback((sourceType: "directory" | "zip" = "directory") => {
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
      toastId = toast.loading(copy.workspaceActions.updatingModState)

      const payload = await invokeApi<BootstrapPayload>("update_mod_enabled", {
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
        description: formatApiErrorMessage(error),
      })
    } finally {
      state.setTogglingModId(null)
    }
  }, [state, copy, applyBootstrap])

  const confirmDeleteMod = useCallback(async (modId: string) => {
    let toastId: string | number | undefined

    try {
      state.setDeletingModId(modId)
      const modName = state.allMods.find((mod) => mod.id === modId)?.name ?? copy.workspacePage.importMod
      toastId = toast.loading(copy.workspaceActions.deletingMod)

      const payload = await invokeApi<BootstrapPayload>("delete_mod_entry", {
        modId,
      })

      applyBootstrap(payload)
      state.setDeleteTargetModId(null)
      toast.success(copy.workspaceActions.modDeleted, {
        id: toastId,
        description: modName,
      })
    } catch (error) {
      toast.error(copy.workspaceActions.deleteModFailed, {
        id: toastId,
        description: formatApiErrorMessage(error),
      })
    } finally {
      state.setDeletingModId(null)
    }
  }, [state, copy, applyBootstrap])

  const previewImportModSource = useCallback(async (selectedPath: string) => {
    if (!activeGame?.id) {
      toast.warning(copy.workspaceActions.currentGame)
      return
    }

    let toastId: string | number | undefined

    try {
      const modName = toImportDisplayName(selectedPath)
      const sourceType = inferImportSourceType(selectedPath)
      state.setImportModForm({
        dir: selectedPath,
        name: modName,
        sourceType,
      })
      state.setImportModMappingsState([])
      state.setImportModPreview(null)
      state.setIsPreviewingMod(true)
      toastId = toast.loading(copy.workspaceActions.previewingMod)

      const preview = await invokeApi<ModImportPreview>("preview_mod_directory", {
        gameId: activeGame.id,
        modPath: selectedPath,
        modName: modName || undefined,
      })

      state.setImportModForm({
        dir: selectedPath,
        name: preview.name || modName,
        sourceType,
      })
      state.setImportModMappingsState(preview.files)
      state.setImportModPreview(preview)
      state.setImportConflictDecisions({})
      toast.success(copy.workspaceActions.modPreviewReady, {
        id: toastId,
        description: preview.name || modName || copy.workspacePage.importMod,
      })
    } catch (error) {
      state.setImportModMappingsState([])
      state.setImportModPreview(null)
      toast.error(copy.workspaceActions.importPreviewFailed, {
        id: toastId,
        description: formatApiErrorMessage(error),
      })
    } finally {
      state.setIsPreviewingMod(false)
    }
  }, [activeGame, copy, state])

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
        description: formatApiErrorMessage(error),
      })
    }
  }, [activeGame, copy, previewImportModSource])

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
        description: formatApiErrorMessage(error),
      })
    }
  }, [activeGame, copy, previewImportModSource])

  const pickImportModSource = useCallback(async (sourceType?: "directory" | "zip") => {
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

  function normalizeConflictTargetPath(targetPath: string): string {
    return targetPath.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")
  }

  const getImportConflictDecision = useCallback(
    (targetPath: string) =>
      state.importConflictDecisions[normalizeConflictTargetPath(targetPath)] ?? null,
    [state.importConflictDecisions],
  )

  const confirmImportMod = useCallback(async () => {
    if (!activeGame?.id) {
      toast.warning(copy.workspaceActions.currentGame)
      return
    }
    if (!state.importModForm.dir.trim()) {
      toast.warning(copy.workspaceActions.selectModDirectoryFirst)
      return
    }
    if (!state.importModPreview) {
      toast.warning(copy.workspaceActions.scanModFirst)
      return
    }

    let toastId: string | number | undefined

    try {
      state.setIsImportingMod(true)
      toastId = toast.loading(copy.workspaceActions.importingMod)

      const activeConflictTargets = Array.from(
        new Set(
          state.importModPreview.conflictFiles
            .map((conflict) => normalizeConflictTargetPath(conflict.targetPath))
            .filter((targetPath) =>
              state.importModMappings.some(
                (file) =>
                  normalizeConflictTargetPath(file.targetPath) === targetPath &&
                  !file.skipInstall &&
                  file.targetPath.trim(),
              ),
            ),
        ),
      )

      const unresolvedConflictTargets = activeConflictTargets.filter(
        (targetPath) => !state.importConflictDecisions[targetPath],
      )

      if (unresolvedConflictTargets.length > 0) {
        toast.warning(
          copy.workspaceActions.resolveImportConflictsFirst(unresolvedConflictTargets.length),
          {
            id: toastId,
          },
        )
        return
      }

      const preparedMappings = state.importModMappings.map((file) => ({
        ...file,
        skipInstall: Boolean(
          file.skipInstall ||
            !file.targetPath.trim() ||
            getImportConflictDecision(file.targetPath) === "skip",
        ),
        overwriteExisting: getImportConflictDecision(file.targetPath) === "overwrite",
      }))
      const skippedMappingsCount = preparedMappings.filter((file) => file.skipInstall).length

      if (skippedMappingsCount > 0) {
        state.setImportModMappingsState(preparedMappings)
        toast.info(copy.workspaceActions.emptyTargetPathsHandled(skippedMappingsCount))
      }

      const payload = await invokeApi<BootstrapPayload>("import_mod_directory", {
        gameId: activeGame.id,
        modPath: state.importModForm.dir.trim(),
        modName: state.importModForm.name.trim() || undefined,
        files: preparedMappings.map((file) => ({
          relativePath: file.relativePath,
          targetPath: file.targetPath,
          skipInstall: Boolean(file.skipInstall || !file.targetPath.trim()),
          overwriteExisting: Boolean(file.overwriteExisting),
        })),
      })

      applyBootstrap(payload)
      toast.success(copy.workspaceActions.modImported, {
        id: toastId,
        description: state.importModPreview.name || state.importModForm.name || copy.workspacePage.importMod,
      })
      closeImportModDialog()
    } catch (error) {
      toast.error(copy.workspaceActions.importModFailed, {
        id: toastId,
        description: formatApiErrorMessage(error),
      })
    } finally {
      state.setIsImportingMod(false)
    }
  }, [activeGame, state, copy, applyBootstrap, closeImportModDialog, getImportConflictDecision])

  const setImportModSourceType = useCallback((value: "directory" | "zip") => {
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
    pickImportModSource,
    confirmImportMod,
    setImportModSourceType,
    updateImportModMappingTarget,
  }
}
