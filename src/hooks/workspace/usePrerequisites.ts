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
          loading: "正在一键补齐前置组件...",
          success: "所有前置组件已补齐",
          error: "补齐前置组件失败",
        },
      })
    } finally {
      state.setInstallingPrerequisiteKey(null)
    }
  }, [activeGame, applyBootstrap, state, t])

  const fixMisplacedPrerequisite = useCallback(async (path: string) => {
    await executePrerequisiteAction({
      command: "fix_misplaced_cleo_redux",
      args: {
        path,
      },
      applyBootstrap,
      messages: {
        loading: "正在处理...",
        success: "处理完成",
        error: "处理失败",
      },
    })
  }, [applyBootstrap])

  return {
    installGamePrerequisite,
    installAllGamePrerequisites,
    fixMisplacedPrerequisite,
  }
}
