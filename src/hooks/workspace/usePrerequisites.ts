import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { formatApiErrorMessage, invokeApi } from "@/lib/api"
import type { BootstrapPayload, Game } from "@/lib/g2m"
import type { WorkspaceState } from "./types"

type PrerequisiteActionMessages = {
  loading: string
  success: string
  error: string
}

async function executePrerequisiteAction({
  command,
  args,
  applyBootstrap,
  messages,
}: {
  command: string
  args: Record<string, unknown>
  applyBootstrap: (payload: BootstrapPayload) => void
  messages: PrerequisiteActionMessages
}): Promise<void> {
  let toastId: string | number | undefined

  try {
    toastId = toast.loading(messages.loading)
    const payload = await invokeApi<BootstrapPayload>(command, args)
    applyBootstrap(payload)
    toast.success(messages.success, {
      id: toastId,
    })
  } catch (error) {
    toast.error(messages.error, {
      id: toastId,
      description: formatApiErrorMessage(error),
    })
  }
}

export function usePrerequisites(
  state: WorkspaceState,
  activeGame: Game | null,
  applyBootstrap: (payload: BootstrapPayload) => void,
) {
  const { t } = useTranslation()

  const installGamePrerequisite = useCallback(async (prerequisiteKey: string) => {
    if (!activeGame?.id) {
      toast.warning(t("workspaceActions.currentGame"))
      return
    }

    try {
      state.setInstallingPrerequisiteKey(prerequisiteKey)
      await executePrerequisiteAction({
        command: "install_game_prerequisite_module",
        args: {
          gameId: activeGame.id,
          prerequisiteKey,
        },
        applyBootstrap,
        messages: {
          loading: t("workspaceActions.installingPrerequisite"),
          success: t("workspaceActions.prerequisiteInstalled"),
          error: t("workspaceActions.installPrerequisiteFailed"),
        },
      })
    } finally {
      state.setInstallingPrerequisiteKey(null)
    }
  }, [activeGame, applyBootstrap, state, t])

  const installAllGamePrerequisites = useCallback(async () => {
    if (!activeGame?.id) {
      toast.warning(t("workspaceActions.currentGame"))
      return
    }

    try {
      state.setInstallingPrerequisiteKey("all")
      await executePrerequisiteAction({
        command: "install_all_game_prerequisites",
        args: {
          gameId: activeGame.id,
        },
        applyBootstrap,
        messages: {
          loading: t("workspaceActions.installingAllPrerequisites"),
          success: t("workspaceActions.allPrerequisitesInstalled"),
          error: t("workspaceActions.installAllPrerequisitesFailed"),
        },
      })
    } finally {
      state.setInstallingPrerequisiteKey(null)
    }
  }, [activeGame, applyBootstrap, state, t])

  const uninstallGamePrerequisite = useCallback(async (prerequisiteKey: string) => {
    if (!activeGame?.id) {
      toast.warning(t("workspaceActions.currentGame"))
      return
    }

    try {
      state.setInstallingPrerequisiteKey(prerequisiteKey)
      await executePrerequisiteAction({
        command: "uninstall_game_prerequisite_module",
        args: {
          gameId: activeGame.id,
          prerequisiteKey,
        },
        applyBootstrap,
        messages: {
          loading: t("workspaceActions.uninstallingPrerequisite"),
          success: t("workspaceActions.prerequisiteUninstalled"),
          error: t("workspaceActions.uninstallPrerequisiteFailed"),
        },
      })
    } finally {
      state.setInstallingPrerequisiteKey(null)
    }
  }, [activeGame, applyBootstrap, state, t])

  const repairGameSymlinks = useCallback(async () => {
    if (!activeGame?.id) {
      toast.warning(t("workspaceActions.currentGame"))
      return
    }

    try {
      state.setRepairingGameLinksId(activeGame.id)
      await executePrerequisiteAction({
        command: "repair_game_symlinks",
        args: {
          gameId: activeGame.id,
        },
        applyBootstrap,
        messages: {
          loading: t("workspaceActions.repairingGameLinks"),
          success: t("workspaceActions.gameLinksRepaired"),
          error: t("workspaceActions.repairGameLinksFailed"),
        },
      })
    } finally {
      state.setRepairingGameLinksId(null)
    }
  }, [activeGame, applyBootstrap, state, t])

  const resolvePrerequisiteConflict = useCallback(async (prerequisiteKey: string) => {
    if (!activeGame?.id) {
      toast.warning(t("workspaceActions.currentGame"))
      return
    }

    await executePrerequisiteAction({
      command: "resolve_prerequisite_conflict",
      args: {
        gameId: activeGame.id,
        prerequisiteKey,
      },
      applyBootstrap,
      messages: {
        loading: t("workspaceActions.fixingPrerequisite"),
        success: t("workspaceActions.prerequisiteFixed"),
        error: t("workspaceActions.fixPrerequisiteFailed"),
      },
    })
  }, [activeGame, applyBootstrap, t])

  return {
    installGamePrerequisite,
    uninstallGamePrerequisite,
    installAllGamePrerequisites,
    repairGameSymlinks,
    resolvePrerequisiteConflict,
  }
}
