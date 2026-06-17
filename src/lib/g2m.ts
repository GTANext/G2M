import { convertFileSrc } from "@tauri-apps/api/core"

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

export type ManagedMod = {
  id: string
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
  name: string
  enabled: boolean
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

export const demoMods: ManagedMod[] = [
  {
    id: "silentpatch",
    name: "SilentPatch",
    type: "ASI",
    author: "Silent",
    enabled: true,
    fileCount: 3,
    conflicts: 0,
    health: "healthy",
    size: "4.2 MB",
    installedAt: "今天 09:40",
    description: "修复原版引擎兼容性与常见崩溃问题，适合作为基础环境补丁。",
    targetFolders: ["plugins"],
    previewFiles: ["plugins/SilentPatch.asi", "plugins/SilentPatchSA.asi", "plugins/SilentPatch.ini"],
    conflictFiles: [],
    conflictWith: [],
  },
  {
    id: "hd-cars",
    name: "HD Cars",
    type: "ModLoader",
    author: "DK22Pac",
    enabled: true,
    fileCount: 18,
    conflicts: 2,
    health: "warning",
    size: "146 MB",
    installedAt: "昨天 21:14",
    description: "为常见车辆提供高清模型与纹理，包含多组 `.dff` 与 `.txd` 文件。",
    targetFolders: ["modloader"],
    previewFiles: ["modloader/infernus.dff", "modloader/infernus.txd", "modloader/banshee.dff"],
    conflictFiles: [
      {
        id: "hd-cars-infernus-dff",
        fileName: "infernus.dff",
        targetPath: "modloader/infernus.dff",
        sourcePath: "GTA SA/G2M/mods/HD Cars/infernus.dff",
        targetFolder: "modloader",
        otherModName: "Real Cars Pack",
        otherSourcePath: "GTA SA/G2M/mods/Real Cars Pack/infernus.dff",
      },
      {
        id: "hd-cars-infernus-txd",
        fileName: "infernus.txd",
        targetPath: "modloader/infernus.txd",
        sourcePath: "GTA SA/G2M/mods/HD Cars/infernus.txd",
        targetFolder: "modloader",
        otherModName: "Vanilla Remaster Vehicles",
        otherSourcePath: "GTA SA/G2M/mods/Vanilla Remaster Vehicles/infernus.txd",
      },
    ],
    conflictWith: ["Real Cars Pack", "Vanilla Remaster Vehicles"],
  },
  {
    id: "teleport",
    name: "Teleport",
    type: "CLEO",
    author: "Seemann",
    enabled: false,
    fileCount: 1,
    conflicts: 0,
    health: "healthy",
    size: "112 KB",
    installedAt: "昨天 20:51",
    description: "快速传送脚本，导入后会部署到 `cleo/` 目录。",
    targetFolders: ["cleo"],
    previewFiles: ["cleo/teleport.cs"],
    conflictFiles: [],
    conflictWith: [],
  },
  {
    id: "super-pack",
    name: "Super Pack",
    type: "Mixed",
    author: "Community Collection",
    enabled: false,
    fileCount: 26,
    conflicts: 4,
    health: "warning",
    size: "281 MB",
    installedAt: "06-16 18:12",
    description: "混合包示例，同时包含 CLEO、ASI 与 ModLoader 文件，适合展示自动识别能力。",
    targetFolders: ["cleo", "plugins", "modloader"],
    previewFiles: ["cleo/teleport.cs", "plugins/SilentPatch.asi", "modloader/infernus.dff"],
    conflictFiles: [
      {
        id: "super-pack-teleport",
        fileName: "teleport.cs",
        targetPath: "cleo/teleport.cs",
        sourcePath: "GTA SA/G2M/mods/Super Pack/teleport.cs",
        targetFolder: "cleo",
        otherModName: "Teleport",
        otherSourcePath: "GTA SA/G2M/mods/Teleport/teleport.cs",
      },
      {
        id: "super-pack-silentpatch",
        fileName: "SilentPatch.asi",
        targetPath: "plugins/SilentPatch.asi",
        sourcePath: "GTA SA/G2M/mods/Super Pack/SilentPatch.asi",
        targetFolder: "plugins",
        otherModName: "SilentPatch",
        otherSourcePath: "GTA SA/G2M/mods/SilentPatch/SilentPatch.asi",
      },
      {
        id: "super-pack-infernus-dff",
        fileName: "infernus.dff",
        targetPath: "modloader/infernus.dff",
        sourcePath: "GTA SA/G2M/mods/Super Pack/infernus.dff",
        targetFolder: "modloader",
        otherModName: "HD Cars",
        otherSourcePath: "GTA SA/G2M/mods/HD Cars/infernus.dff",
      },
      {
        id: "super-pack-props-col",
        fileName: "vegasnroadblox.col",
        targetPath: "modloader/vegasnroadblox.col",
        sourcePath: "GTA SA/G2M/mods/Super Pack/vegasnroadblox.col",
        targetFolder: "modloader",
        otherModName: "Project Props",
        otherSourcePath: "GTA SA/G2M/mods/Project Props/vegasnroadblox.col",
      },
    ],
    conflictWith: ["Teleport", "SilentPatch", "HD Cars", "Project Props"],
  },
]

export function buildDisplayMods(sourceMods: BackendMod[]): ManagedMod[] {
  return sourceMods.map((mod) => ({
    id: mod.id,
    name: mod.name,
    type: "Mixed",
    author: "Imported",
    enabled: mod.enabled,
    fileCount: 0,
    conflicts: 0,
    health: "healthy",
    size: "待扫描",
    installedAt: "来自数据库",
    description: "第 1 周阶段仅同步基础 Mod 记录，后续导入流程完成后会补齐文件、类型与冲突信息。",
    targetFolders: ["待识别"],
    previewFiles: ["导入功能完成后显示文件清单"],
    conflictFiles: [],
    conflictWith: [],
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
  modCount: number,
): Game[] {
  return backendGames.map((game) => ({
    id: game.id,
    gameType: game.gameType,
    name: game.name,
    shortName: getGameShortName(game.gameType),
    version: game.version || getGameVersionLabel(game.gameType),
    modCount,
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
    return "未记录"
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp * 1000))
}
