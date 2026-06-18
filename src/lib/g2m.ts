import { convertFileSrc } from "@tauri-apps/api/core"

import { i18n } from "@/i18n"

export type Game = {
  id: string
  gameType: "sa" | "vc" | "iii"
  name: string
  shortName: string
  version: string
  modCount: number
  gamePath: string
  exeName: string
  imagePath: string
  createdAt: number
  updatedAt: number
  status: "ready" | "pending"
}

export type ModType = "ModLoader" | "CLEO" | "CLEO Redux" | "ASI" | "Mixed"

export type ModConflictItem = {
  id: string
  fileName: string
  targetPath: string
  sourcePath: string
  targetFolder: string
  otherModName: string
  otherSourcePath: string
}

export type ModImportFileEntry = {
  relativePath: string
  targetPath: string
  targetFolder: string
}

export type ManagedMod = {
  id: string
  gameId: string
  name: string
  type: ModType
  author: string
  enabled: boolean
  fileCount: number
  conflicts: number
  health: "healthy" | "warning"
  size: string
  installedAt: string
  description: string
  targetFolders: string[]
  previewFiles: string[]
  conflictFiles: ModConflictItem[]
  conflictWith: string[]
}

export type BackendGame = {
  id: string
  gameType: "sa" | "vc" | "iii"
  name: string
  path: string
  exeName: string
  version: string
  imagePath: string
  createdAt: number
  updatedAt: number
  configured: boolean
}

export type DetectedGame = {
  gameType: "sa" | "vc" | "iii"
  name: string
  path: string
  exeName: string
  version: string
}

export type BackendMod = {
  id: string
  gameId: string
  name: string
  modType: ModType
  author: string
  enabled: boolean
  fileCount: number
  conflicts: number
  sizeBytes: number
  installedAt: number
  description: string
  sourceDir: string
  targetFolders: string[]
  previewFiles: string[]
  conflictFiles: ModConflictItem[]
  conflictWith: string[]
}

export type ModImportPreview = {
  name: string
  modType: ModType
  fileCount: number
  sizeBytes: number
  sourceDir: string
  hasG2mManifest: boolean
  g2mManifestPath: string | null
  targetFolders: string[]
  previewFiles: string[]
  files: ModImportFileEntry[]
  conflictFiles: ModConflictItem[]
  conflictWith: string[]
}

export type ModFileTreeNode = {
  key: string
  name: string
  fullPath: string
  kind: "folder" | "file"
  children: ModFileTreeNode[]
  file: ModImportFileEntry | null
}

export type BootstrapPayload = {
  dataDir: string
  databasePath: string
  games: BackendGame[]
  mods: BackendMod[]
}

export type WorkspaceStats = {
  total: number
  enabled: number
  disabled: number
  conflicts: number
  files: number
}

export function buildDisplayMods(sourceMods: BackendMod[]): ManagedMod[] {
  return sourceMods.map((mod) => ({
    id: mod.id,
    gameId: mod.gameId,
    name: mod.name,
    type: mod.modType,
    author: mod.author || i18n.t("common.notProvided"),
    enabled: mod.enabled,
    fileCount: mod.fileCount,
    conflicts: mod.conflicts,
    health: mod.conflicts > 0 ? "warning" : "healthy",
    size: formatFileSize(mod.sizeBytes),
    installedAt: formatGameTimestamp(mod.installedAt),
    description: mod.description || i18n.t("demo.syncedDescription"),
    targetFolders: mod.targetFolders.length > 0 ? mod.targetFolders : [i18n.t("demo.targetPending")],
    previewFiles: mod.previewFiles.length > 0 ? mod.previewFiles : [i18n.t("demo.previewPending")],
    conflictFiles: mod.conflictFiles,
    conflictWith: mod.conflictWith,
  }))
}

export function buildWorkspaceStats(mods: ManagedMod[]): WorkspaceStats {
  const enabled = mods.filter((mod) => mod.enabled).length
  const conflicts = mods.reduce((count, mod) => count + mod.conflicts, 0)
  const files = mods.reduce((count, mod) => count + mod.fileCount, 0)

  return {
    total: mods.length,
    enabled,
    disabled: mods.length - enabled,
    conflicts,
    files,
  }
}

export function buildGamesFromBackend(
  backendGames: BackendGame[],
  backendMods: BackendMod[],
): Game[] {
  return backendGames.map((game) => ({
    id: game.id,
    gameType: game.gameType,
    name: game.name,
    shortName: getGameShortName(game.gameType),
    version: game.version || getGameVersionLabel(game.gameType),
    modCount: backendMods.filter((mod) => mod.gameId === game.id).length,
    gamePath: game.path,
    exeName: game.exeName,
    imagePath: game.imagePath,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    status: game.configured ? "ready" : "pending",
  }))
}

export function getGameShortName(gameType: Game["gameType"]): string {
  switch (gameType) {
    case "sa":
      return "SA"
    case "vc":
      return "VC"
    case "iii":
      return "III"
  }
}

export function getGameVersionLabel(gameType: Game["gameType"]): string {
  switch (gameType) {
    case "sa":
      return "San Andreas"
    case "vc":
      return "Vice City"
    case "iii":
      return "GTA III"
  }
}

export function getDefaultGameImagePath(gameType: Game["gameType"] | "" | string): string {
  switch (gameType) {
    case "sa":
      return "/images/gtasa.jpg"
    case "vc":
      return "/images/gtavc.jpg"
    case "iii":
      return "/images/gta3.jpg"
    default:
      return "/images/gtasa.jpg"
  }
}

export function resolveGameImageSrc(imagePath: string, gameType: Game["gameType"] | "" | string): string {
  const normalized = imagePath.trim()
  if (!normalized) {
    return getDefaultGameImagePath(gameType)
  }

  if (normalized.startsWith("/")) {
    return normalized
  }

  return convertFileSrc(normalized)
}

export function formatGameTimestamp(timestamp: number): string {
  if (!timestamp) {
    return i18n.t("demo.unknownTime")
  }

  return new Intl.DateTimeFormat(i18n.language || "zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp * 1000))
}

export function formatFileSize(sizeBytes: number): string {
  if (!sizeBytes || sizeBytes <= 0) {
    return "0 B"
  }

  const units = ["B", "KB", "MB", "GB", "TB"]
  let value = sizeBytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const digits = value >= 10 || unitIndex === 0 ? 0 : 1
  return `${value.toFixed(digits)} ${units[unitIndex]}`
}

export function buildModFileTree(
  files: ModImportFileEntry[],
  mode: "source" | "target" = "target",
): ModFileTreeNode[] {
  const root = new Map<string, ModFileTreeNode>()

  for (const file of files) {
    const fullPath = mode === "target" ? file.targetPath : file.relativePath
    const segments = fullPath.split("/").filter(Boolean)
    if (segments.length === 0) {
      continue
    }

    let cursor = root
    let currentPath = ""

    for (const [index, segment] of segments.entries()) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment
      const isLeaf = index === segments.length - 1
      const existing = cursor.get(segment)

      if (existing) {
        cursor = ensureTreeChildren(existing)
        continue
      }

      const node: ModFileTreeNode = {
        key: currentPath,
        name: segment,
        fullPath: currentPath,
        kind: isLeaf ? "file" : "folder",
        children: [],
        file: isLeaf ? file : null,
      }

      cursor.set(segment, node)
      cursor = ensureTreeChildren(node)
    }
  }

  return sortTreeNodes(Array.from(root.values()))
}

function ensureTreeChildren(node: ModFileTreeNode): Map<string, ModFileTreeNode> {
  if (!("__childrenMap" in node)) {
    Object.defineProperty(node, "__childrenMap", {
      value: new Map<string, ModFileTreeNode>(),
      enumerable: false,
      configurable: false,
      writable: false,
    })
  }

  return (node as ModFileTreeNode & { __childrenMap: Map<string, ModFileTreeNode> }).__childrenMap
}

function sortTreeNodes(nodes: ModFileTreeNode[]): ModFileTreeNode[] {
  return nodes
    .map((node) => ({
      ...node,
      children: sortTreeNodes(Array.from(ensureTreeChildren(node).values())),
    }))
    .sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind === "folder" ? -1 : 1
      }

      return left.name.localeCompare(right.name)
    })
}
