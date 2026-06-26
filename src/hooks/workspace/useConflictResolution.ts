import { useCallback } from "react"
import { toast } from "sonner"
import { useI18n } from "@/components/app/i18nProvider"
import type { ManagedMod } from "@/lib/g2m"
import type { ConflictDecision, WorkspaceState } from "./types"

function buildConflictDecisionKey(modId: string, conflictId: string): string {
  return `${modId}::${conflictId}`
}

function normalizeConflictTargetPath(targetPath: string): string {
  return targetPath.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")
}

export function useConflictResolution(state: WorkspaceState, mods: ManagedMod[]) {
  const { copy } = useI18n()

  const resolveConflict = useCallback(
    (modId: string, conflictId: string, decision: ConflictDecision) => {
      state.setConflictDecisions((current) => ({
        ...current,
        [buildConflictDecisionKey(modId, conflictId)]: decision,
      }))

      const mod = mods.find((item) => item.id === modId)
      const conflict = mod?.conflictFiles.find((item) => item.id === conflictId)

      toast.success(decision === "overwrite" ? copy.workspaceActions.conflictSetOverwrite : copy.workspaceActions.conflictSetSkip, {
        description: conflict?.fileName ?? copy.workspaceActions.conflictUpdated,
      })
    },
    [state, mods, copy],
  )

  const getConflictDecision = useCallback(
    (modId: string, conflictId: string) =>
      state.conflictDecisions[buildConflictDecisionKey(modId, conflictId)] ?? null,
    [state.conflictDecisions],
  )

  const resolveImportConflict = useCallback((targetPath: string, decision: ConflictDecision) => {
    state.setImportConflictDecisions((current) => ({
      ...current,
      [normalizeConflictTargetPath(targetPath)]: decision,
    }))

    toast.success(
      decision === "overwrite"
        ? copy.workspaceActions.conflictSetOverwrite
        : copy.workspaceActions.conflictSetSkip,
      {
        description: targetPath,
      },
    )
  }, [state, copy])

  const resolveImportConflicts = useCallback(
    (targetPaths: string[], decision: ConflictDecision) => {
      const normalizedTargetPaths = Array.from(
        new Set(
          targetPaths
            .map((targetPath) => normalizeConflictTargetPath(targetPath))
            .filter(Boolean),
        ),
      )
      if (normalizedTargetPaths.length === 0) {
        return
      }

      state.setImportConflictDecisions((current) => {
        const next = { ...current }
        for (const targetPath of normalizedTargetPaths) {
          next[targetPath] = decision
        }
        return next
      })

      toast.success(
        decision === "overwrite"
          ? copy.workspaceActions.conflictSetOverwrite
          : copy.workspaceActions.conflictSetSkip,
        {
          description:
            normalizedTargetPaths.length === 1
              ? normalizedTargetPaths[0]
              : `${normalizedTargetPaths[0]} +${normalizedTargetPaths.length - 1}`,
        },
      )
    },
    [state, copy],
  )

  const getImportConflictDecision = useCallback(
    (targetPath: string) =>
      state.importConflictDecisions[normalizeConflictTargetPath(targetPath)] ?? null,
    [state.importConflictDecisions],
  )

  return {
    resolveConflict,
    getConflictDecision,
    resolveImportConflict,
    resolveImportConflicts,
    getImportConflictDecision,
  }
}