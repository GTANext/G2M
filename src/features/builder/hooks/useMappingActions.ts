import type { Dispatch, SetStateAction } from "react"

import { moveFiles, type DragPayload } from "@/components/g2m/draggableTree"
import {
  inferTargetFolderFromPath,
  normalizeModPath,
  type GameTypeTarget,
  type ModImportFileEntry,
  type ModImportPreview,
} from "@/lib/g2m"

function useMappingActions({
  preview,
  setMappings,
  setGameTargetsByPath,
}: {
  preview: ModImportPreview | null
  setMappings: Dispatch<SetStateAction<ModImportFileEntry[]>>
  setGameTargetsByPath: Dispatch<SetStateAction<Record<string, GameTypeTarget[]>>>
}) {
  function resetMappings() {
    if (!preview) {
      return
    }
    setMappings(preview.files)
    setGameTargetsByPath({})
  }

  function handleDropToFolder(destFolder: string, payload: DragPayload) {
    setMappings((current) => moveFiles(current, payload, destFolder))
  }

  function updateTargetPath(path: string, newTargetPath: string) {
    const key = normalizeModPath(path)
    if (!key) {
      return
    }

    setMappings((current) =>
      current.map((file) => {
        const fileKey = normalizeModPath(file.relativePath)
        if (fileKey === key) {
          return {
            ...file,
            targetPath: newTargetPath,
            targetFolder: inferTargetFolderFromPath(newTargetPath),
            skipInstall: !newTargetPath,
          }
        }
        if (fileKey && fileKey.startsWith(`${key}/`)) {
          const suffix = fileKey.slice(key.length).replace(/^\/+/, "")
          const nextTarget = newTargetPath ? `${newTargetPath}/${suffix}` : ""
          return {
            ...file,
            targetPath: nextTarget,
            targetFolder: inferTargetFolderFromPath(nextTarget),
            skipInstall: !nextTarget,
          }
        }
        return file
      }),
    )
  }

  function toggleGameType(path: string, type: GameTypeTarget) {
    const key = normalizeModPath(path)
    if (!key) {
      return
    }
    setGameTargetsByPath((current) => {
      const existing = current[key] ?? []
      const next = existing.includes(type)
        ? existing.filter((item) => item !== type)
        : [...existing, type]
      if (next.length === 0) {
        const { [key]: _removed, ...rest } = current
        return rest
      }
      return { ...current, [key]: next }
    })
  }

  return {
    handleDropToFolder,
    resetMappings,
    toggleGameType,
    updateTargetPath,
  }
}

export { useMappingActions }
export type { DragPayload }
