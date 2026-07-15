import type { ManagedMod } from "@/lib/g2m"

export function buildConflictDecisionKey(modId: string, conflictId: string): string {
  return `${modId}::${conflictId}`
}

export function normalizeConflictTargetPath(targetPath: string): string {
  return targetPath.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")
}

export function matchesModSearch(mod: ManagedMod, keyword: string): boolean {
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
