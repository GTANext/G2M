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
  sortOrder: number
  status: "ready" | "pending"
  prerequisites: GamePrerequisite[]
}

export type GamePrerequisite = {
  key: string
  label: string
  detected: boolean
  canInstall: boolean
  scanScope: "root" | "scriptsPlugins" | string
  detectedPath: string | null
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
  skipInstall?: boolean
}

export type GameTypeTarget = "iii" | "vc" | "sa"

export type BuilderGameTargetNode = {
  children: BuilderGameTargetNode[]
  fileCount: number
  kind: "file" | "folder"
  path: string
  targetPath: string
}

export type ExistingBuilderManifestFile = {
  path: string
  installTo: string
  games: string[]
}

export type ExistingBuilderManifestLink = {
  kind?: string
  label: string
  url: string
}

export type ExistingBuilderManifestUpdate = {
  md5: string
  md5Mode: string
}

export type BuilderCustomPrerequisite = {
  name: string
  url: string
}

export type ExistingBuilderManifest = {
  name: string
  version: string
  author: string
  modType: string
  links: ExistingBuilderManifestLink[]
  prerequisites: string[]
  customPrerequisites: BuilderCustomPrerequisite[]
  update: ExistingBuilderManifestUpdate | null
  files: ExistingBuilderManifestFile[]
}

export type ManifestSourceDigest = {
  md5: string
  md5Mode: "archive" | "directory" | string
}

export type ModMappingSummary = {
  id: string
  sourcePath: string
  targetPath: string
  targetFolder: string
  kind: "file" | "folder"
  fileCount: number
  files: ModImportFileEntry[]
}

export type ManagedMod = {
  id: string
  gameId: string
  name: string
  version: string
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
  sortOrder: number
  prerequisites: GamePrerequisite[]
}

export interface DetectedGame {
  gameType: "sa" | "vc" | "iii" | string
  name: string
  path: string
  exeName: string
  version: string
  coverBase64: string | null
}

export type BackendMod = {
  id: string
  gameId: string
  name: string
  version: string
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
  existingManifest: ExistingBuilderManifest | null
  conflictFiles: ModConflictItem[]
  conflictWith: string[]
}

export type ModFileTreeNode = {
  key: string
  name: string
  fullPath: string
  kind: "folder" | "file"
  fileCount: number
  children: ModFileTreeNode[]
  file: ModImportFileEntry | null
  isPresetFolder?: boolean
}

export type BootstrapPayload = {
  dataDir: string
  databasePath: string
  isElevated: boolean
  games: BackendGame[]
  mods: BackendMod[]
}

export type AppInfoPayload = {
  productName: string
  version: string
}

export type WorkspaceStats = {
  total: number
  enabled: number
  disabled: number
  conflicts: number
  files: number
}

export type ImportSourceType = "directory" | "zip"

export function buildDisplayMods(sourceMods: BackendMod[]): ManagedMod[] {
  return sourceMods.map((mod) => ({
    id: mod.id,
    gameId: mod.gameId,
    name: mod.name,
    version: mod.version || i18n.t("common.notProvided"),
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
    sortOrder: game.sortOrder,
    status: game.configured ? "ready" : "pending",
    prerequisites: game.prerequisites ?? [],
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

  // If it's a URL or base64, return it as-is
  if (normalized.startsWith("http://") || normalized.startsWith("https://") || normalized.startsWith("data:image/")) {
    return normalized
  }

  // Handle absolute paths by using convertFileSrc, which resolves Tauri's asset:// protocol
  if (/^[A-Za-z]:\\|^\//.test(normalized)) {
    return convertFileSrc(normalized)
  }

  // Handle relative paths (though unexpected in most cases, fallback)
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
  includePresets: boolean = false,
): ModFileTreeNode[] {
  const root = new Map<string, ModFileTreeNode>()

  if (mode === "target" && includePresets) {
    const PRESETS = ["modloader", "CLEO", "scripts", "plugins", "models", "data", "audio", "text", "anim", "movies"]
    for (const preset of PRESETS) {
      root.set(preset, {
        key: preset,
        kind: "folder",
        name: preset,
        fullPath: preset,
        fileCount: 0,
        file: null,
        children: [],
        isPresetFolder: true,
      })
    }
  }

  for (const file of files) {
    if (mode === "target" && file.skipInstall) {
      continue
    }

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
        fileCount: 0,
        children: [],
        file: isLeaf ? file : null,
      }

      cursor.set(segment, node)
      cursor = ensureTreeChildren(node)
    }
  }

  syncTreeNodeCounts(Array.from(root.values()))
  return sortTreeNodes(Array.from(root.values()))
}

export function buildMappingTargetNodes(
  files: ModImportFileEntry[],
): BuilderGameTargetNode[] {
  return buildModFileTree(files, "source").map((node) =>
    buildMappingTargetNode(node, files),
  )
}

export function buildModMappingSummaries(files: ModImportFileEntry[]): ModMappingSummary[] {
  const folderGroups = new Map<string, ModImportFileEntry[]>()
  const summaries: ModMappingSummary[] = []

  for (const file of files) {
    const segments = file.relativePath.split("/").filter(Boolean)
    if (segments.length <= 1) {
      summaries.push({
        id: `file:${file.relativePath}`,
        sourcePath: file.relativePath,
        targetPath: file.targetPath,
        targetFolder: file.targetFolder,
        kind: "file",
        fileCount: 1,
        files: [file],
      })
      continue
    }

    const folderPath = segments[0]
    const group = folderGroups.get(folderPath) ?? []
    group.push(file)
    folderGroups.set(folderPath, group)
  }

  for (const [folderPath, groupFiles] of folderGroups.entries()) {
    summaries.push({
      id: `folder:${folderPath}`,
      sourcePath: folderPath,
      targetPath: inferFolderSummaryTargetPath(folderPath, groupFiles),
      targetFolder: inferTargetFolderFromPath(groupFiles[0]?.targetPath ?? ""),
      kind: "folder",
      fileCount: groupFiles.length,
      files: groupFiles,
    })
  }

  return summaries.sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === "folder" ? -1 : 1
    }

    return left.sourcePath.localeCompare(right.sourcePath)
  })
}

export function applyMappingSummaryTargetPath(
  files: ModImportFileEntry[],
  summary: ModMappingSummary,
  targetPath: string,
): ModImportFileEntry[] {
  const normalizedTargetPath = normalizeModPath(targetPath)
  if (!normalizedTargetPath) {
    return files
  }

  return files.map((file) => {
    const matchesSummary = summary.files.some(
      (summaryFile) => summaryFile.relativePath === file.relativePath,
    )
    if (!matchesSummary) {
      return file
    }

    if (summary.kind === "file") {
      return {
        ...file,
        targetPath: normalizedTargetPath,
        targetFolder: inferTargetFolderFromPath(normalizedTargetPath),
        skipInstall: !normalizedTargetPath,
      }
    }

    const normalizedSourcePath = normalizeModPath(summary.sourcePath)
    const normalizedRelativePath = normalizeModPath(file.relativePath)
    const suffix = normalizedRelativePath
      .slice(normalizedSourcePath.length)
      .replace(/^\/+/, "")
    const nextTargetPath = suffix
      ? `${normalizedTargetPath}/${suffix}`
      : normalizedTargetPath

    return {
      ...file,
      targetPath: nextTargetPath,
      targetFolder: inferTargetFolderFromPath(nextTargetPath),
      skipInstall: !nextTargetPath,
    }
  })
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

function syncTreeNodeCounts(nodes: ModFileTreeNode[]): number {
  let total = 0

  for (const node of nodes) {
    if (node.kind === "file") {
      node.fileCount = 1
    } else {
      node.fileCount = syncTreeNodeCounts(Array.from(ensureTreeChildren(node).values()))
    }
    total += node.fileCount
  }

  return total
}

function inferFolderSummaryTargetPath(folderPath: string, files: ModImportFileEntry[]): string {
  if (files.every((file) => !normalizeModPath(file.targetPath))) {
    return ""
  }

  const sourcePrefix = `${folderPath}/`
  const candidates = files
    .map((file) => {
      const normalizedRelativePath = normalizeModPath(file.relativePath)
      const normalizedTargetPath = normalizeModPath(file.targetPath)
      if (!normalizedRelativePath.startsWith(sourcePrefix)) {
        return ""
      }

      const remainder = normalizedRelativePath.slice(sourcePrefix.length)
      if (!remainder) {
        return normalizedTargetPath
      }

      const suffix = `/${remainder}`
      if (!normalizedTargetPath.endsWith(suffix)) {
        return ""
      }

      return normalizedTargetPath.slice(0, normalizedTargetPath.length - suffix.length)
    })
    .filter(Boolean)

  const uniqueCandidates = Array.from(new Set(candidates))
  if (uniqueCandidates.length === 1) {
    return uniqueCandidates[0]
  }

  return normalizeModPath(files[0]?.targetFolder || folderPath)
}

function buildMappingTargetNode(
  node: ModFileTreeNode,
  files: ModImportFileEntry[],
): BuilderGameTargetNode {
  return {
    children: node.children.map((child) => buildMappingTargetNode(child, files)),
    fileCount: node.fileCount,
    kind: node.kind,
    path: normalizeModPath(node.fullPath),
    targetPath: inferMappingNodeTargetPath(node.fullPath, files),
  }
}

function inferMappingNodeTargetPath(
  path: string,
  files: ModImportFileEntry[],
): string {
  const normalizedPath = normalizeModPath(path)
  if (!normalizedPath) {
    return ""
  }

  const exactFile = files.find(
    (file) => normalizeModPath(file.relativePath) === normalizedPath,
  )
  if (exactFile) {
    return normalizeModPath(exactFile.targetPath)
  }

  const sourcePrefix = `${normalizedPath}/`
  const candidates = files
    .map((file) => {
      const normalizedRelativePath = normalizeModPath(file.relativePath)
      const normalizedTargetPath = normalizeModPath(file.targetPath)
      if (
        !normalizedRelativePath.startsWith(sourcePrefix) ||
        !normalizedTargetPath
      ) {
        return ""
      }

      const remainder = normalizedRelativePath.slice(sourcePrefix.length)
      if (!remainder) {
        return normalizedTargetPath
      }

      const suffix = `/${remainder}`
      if (!normalizedTargetPath.endsWith(suffix)) {
        return ""
      }

      return normalizedTargetPath.slice(
        0,
        normalizedTargetPath.length - suffix.length,
      )
    })
    .filter(Boolean)

  const uniqueCandidates = Array.from(new Set(candidates))
  return uniqueCandidates.length === 1 ? uniqueCandidates[0] : ""
}

export function inferTargetFolderFromPath(targetPath: string): string {
  const normalized = normalizeModPath(targetPath)
  return normalized.split("/").filter(Boolean)[0] ?? ""
}

export type BuilderManifestFileEntry = {
  games?: string[]
  path: string
  installTo: string
}

export function buildManifestPayload(input: {
  author: string
  links: { kind: string; label: string; url: string }[]
  modName: string
  modType: string
  prerequisites: string[]
  customPrerequisites: BuilderCustomPrerequisite[]
  sourceDigest: ManifestSourceDigest
  version: string
  files: BuilderManifestFileEntry[]
}) {
  const { author, links, modName, modType, sourceDigest, version, prerequisites, customPrerequisites, files } = input
  
  return {
    name: modName.trim(),
    version: version.trim(),
    author: author.trim(),
    type: modType.trim(),
    links: links.map((link) => ({
      kind: link.kind,
      label: link.label,
      url: link.url,
    })),
    prerequisites,
    customPrerequisites,
    update: {
      md5: sourceDigest.md5,
      md5Mode: sourceDigest.md5Mode,
    },
    files: files.map((file) => ({
      path: file.path,
      installTo: file.installTo,
      games: file.games,
    })),
  }
}

export function inferImportSourceType(selectedPath: string): ImportSourceType {
  return selectedPath.toLowerCase().endsWith(".zip") ? "zip" : "directory"
}

export function normalizeModPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/").replace(/\/+$/, "")
}
