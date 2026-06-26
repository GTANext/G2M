import { useCallback } from "react"
import { toast } from "sonner"

import { useI18n } from "@/components/app/i18nProvider"
import { formatApiErrorMessage, invokeApi } from "@/lib/api"
import type { BootstrapPayload, Game } from "@/lib/g2m"
import type { WorkspaceState } from "./types"

export function usePrerequisites(state: WorkspaceState, activeGame: Game | null, applyBootstrap: (payload: BootstrapPayload) => void) {
  const { copy } = useI18n()

  const installGamePrerequisite = useCallback(async (prerequisiteKey: string) => {
    if (!activeGame?.id) {
      toast.warning(copy.workspaceActions.currentGame)
      return
    }

    let toastId: string | number | undefined

    try {
      state.setInstallingPrerequisiteKey(prerequisiteKey)
      toastId = toast.loading(copy.workspaceActions.installingPrerequisite)

      const payload = await invokeApi<BootstrapPayload>("install_game_prerequisite_module", {
        gameId: activeGame.id,
        prerequisiteKey,
      })

      applyBootstrap(payload)
      toast.success(copy.workspaceActions.prerequisiteInstalled, {
        id: toastId,
      })
    } catch (error) {
      toast.error(copy.workspaceActions.installPrerequisiteFailed, {
        id: toastId,
        description: formatApiErrorMessage(error),
      })
    } finally {
      state.setInstallingPrerequisiteKey(null)
    }
  }, [activeGame, copy, state, applyBootstrap])

  const installAllGamePrerequisites = useCallback(async () => {
    if (!activeGame?.id) {
      toast.warning(copy.workspaceActions.currentGame)
      return
    }

    let toastId: string | number | undefined

    try {
      state.setInstallingPrerequisiteKey("all")
      toastId = toast.loading("正在一键补齐前置组件...")

      const payload = await invokeApi<BootstrapPayload>("install_all_game_prerequisites", {
        gameId: activeGame.id,
      })

      applyBootstrap(payload)
      toast.success("所有前置组件已补齐", {
        id: toastId,
      })
    } catch (error) {
      toast.error("补齐前置组件失败", {
        id: toastId,
        description: formatApiErrorMessage(error),
      })
    } finally {
      state.setInstallingPrerequisiteKey(null)
    }
  }, [activeGame, copy, state, applyBootstrap])

  const fixMisplacedPrerequisite = useCallback(async (path: string) => {
    let toastId: string | number | undefined
    try {
      toastId = toast.loading("正在处理...")
      const payload = await invokeApi<BootstrapPayload>("fix_misplaced_cleo_redux", {
        path,
      })
      applyBootstrap(payload)
      toast.success("处理完成", { id: toastId })
    } catch (error) {
      toast.error("处理失败", {
        id: toastId,
        description: formatApiErrorMessage(error),
      })
    }
  }, [applyBootstrap])

  return {
    installGamePrerequisite,
    installAllGamePrerequisites,
    fixMisplacedPrerequisite,
  }
}