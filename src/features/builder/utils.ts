import {
  buildModMappingSummaries,
  inferTargetFolderFromPath,
  normalizeModPath,
  type ExistingBuilderManifest,
  type ExistingBuilderManifestLink,
  type ModImportFileEntry,
  type ModImportPreview,
  type GameTypeTarget,
  type BuilderCustomPrerequisite,
} from "@/lib/g2m"
import type {
  BuilderLinkInput,
  BuilderManifestFileEntry,
} from "@/features/builder/types"
import { GAME_TYPE_TARGETS } from "@/features/builder/types"

function buildManifestEntries(
  files: ModImportFileEntry[],
  gameTargets: Record<string, GameTypeTarget[]>,
): BuilderManifestFileEntry[] {
  const summaries = buildModMappingSummaries(files)
  const summaryEntries = summaries.map((summary) => {
    const games = gameTargets[normalizeModPath(summary.sourcePath)]
    return {
      path: summary.sourcePath,
      installTo: summary.targetPath,
      ...(games && games.length > 0 ? { games } : {}),
    }
  })

  const summaryPaths = new Set(summaryEntries.map((entry) => normalizeModPath(entry.path)))
  const detailEntries = Object.entries(gameTargets)
    .filter(([path, games]) => !summaryPaths.has(path) && games.length > 0)
    .map(([path, games]) => ({
      path,
      installTo: inferManifestDetailTargetPath(path, files),
      games,
    }))
    .filter((entry) => entry.installTo)

  return [...summaryEntries, ...detailEntries]
}

function buildManifestPayload(options: {
  author: string
  description: string
  files: BuilderManifestFileEntry[]
  iconBase64: string
  links: BuilderLinkInput[]
  modName: string
  modType: string
  prerequisites: string[]
  customPrerequisites: BuilderCustomPrerequisite[]
  version: string
}) {
  const links = options.links
    .map((link) => ({
      kind: link.kind,
      label: link.label.trim(),
      url: link.url.trim(),
    }))
    .filter((link) => link.url)

  return {
    name: options.modName,
    version: options.version,
    author: options.author,
    description: options.description,
    ...(options.iconBase64.trim() ? { iconBase64: options.iconBase64.trim() } : {}),
    type: options.modType,
    ...(links.length > 0 ? { links } : {}),
    ...(options.prerequisites.length > 0 ? { prerequisites: options.prerequisites } : {}),
    ...(options.customPrerequisites.length > 0 ? { customPrerequisites: options.customPrerequisites } : {}),
    files: options.files,
  }
}

function buildInitialState(preview: ModImportPreview, fallbackName: string) {
  const existingManifest = preview.existingManifest
  if (!existingManifest) {
    return {
      author: "",
      description: "",
      iconBase64: "",
      links: createDefaultBuilderLinks(),
      name: preview.name || fallbackName,
      prerequisites: [] as string[],
      customPrerequisites: [] as BuilderCustomPrerequisite[],
      version: "",
      mappings: preview.files,
      preview,
      gameTargetsByPath: {} as Record<string, GameTypeTarget[]>,
    }
  }

  const mappings = applyExistingManifestMappings(preview.files, existingManifest)

  return {
    author: existingManifest.author,
    description: existingManifest.description || "",
    iconBase64: existingManifest.iconBase64 || "",
    links: buildBuilderLinks(existingManifest.links),
    name: existingManifest.name || preview.name || fallbackName,
    prerequisites: existingManifest.prerequisites || [],
    customPrerequisites: existingManifest.customPrerequisites || [],
    version: existingManifest.version,
    mappings,
    preview,
    gameTargetsByPath: buildGameTargetsFromManifest(existingManifest),
  }
}

function applyExistingManifestMappings(
  files: ModImportFileEntry[],
  manifest: ExistingBuilderManifest,
): ModImportFileEntry[] {
  const manifestEntries = manifest.files
    .map((entry) => ({
      path: normalizeModPath(entry.path),
      installTo: normalizeModPath(entry.installTo),
    }))
    .filter((entry) => entry.path)
    .sort((left, right) => right.path.length - left.path.length)

  return files.map((file) => {
    const normalizedRelativePath = normalizeModPath(file.relativePath)
    const exactEntry = manifestEntries.find((entry) => entry.path === normalizedRelativePath)

    if (exactEntry) {
      return {
        ...file,
        targetPath: exactEntry.installTo,
        targetFolder: inferTargetFolderFromPath(exactEntry.installTo),
        skipInstall: !exactEntry.installTo,
      }
    }

    const folderEntry = manifestEntries.find((entry) =>
      normalizedRelativePath.startsWith(`${entry.path}/`),
    )
    if (!folderEntry) {
      return file
    }

    const suffix = normalizedRelativePath.slice(folderEntry.path.length).replace(/^\/+/, "")
    const targetPath = joinManifestFolderTargetPath(
      folderEntry.installTo,
      folderEntry.path,
      suffix,
    )
    return {
      ...file,
      targetPath,
      targetFolder: inferTargetFolderFromPath(targetPath),
      skipInstall: !targetPath,
    }
  })
}

function buildGameTargetsFromManifest(
  manifest: ExistingBuilderManifest,
): Record<string, GameTypeTarget[]> {
  const targets: Record<string, GameTypeTarget[]> = {}

  for (const entry of manifest.files) {
    const games = entry.games.filter(isGameTypeTarget)
    if (games.length > 0) {
      const normalizedPath = normalizeModPath(entry.path)
      if (normalizedPath) {
        targets[normalizedPath] = games
      }
    }
  }

  return targets
}

function inferManifestDetailTargetPath(path: string, files: ModImportFileEntry[]): string {
  const normalizedPath = normalizeModPath(path)
  if (!normalizedPath) {
    return ""
  }

  const exactFile = files.find((file) => normalizeModPath(file.relativePath) === normalizedPath)
  if (exactFile) {
    return normalizeModPath(exactFile.targetPath)
  }

  const sourcePrefix = `${normalizedPath}/`
  const candidates = files
    .map((file) => {
      const normalizedRelativePath = normalizeModPath(file.relativePath)
      const normalizedTargetPath = normalizeModPath(file.targetPath)
      if (!normalizedRelativePath.startsWith(sourcePrefix) || !normalizedTargetPath) {
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
  return uniqueCandidates.length === 1 ? uniqueCandidates[0] : ""
}

function joinManifestTargetPath(prefix: string, suffix: string): string {
  const normalizedPrefix = normalizeModPath(prefix)
  const normalizedSuffix = normalizeModPath(suffix)

  if (!normalizedPrefix) {
    return normalizedSuffix
  }
  if (!normalizedSuffix) {
    return normalizedPrefix
  }

  return `${normalizedPrefix}/${normalizedSuffix}`
}

function joinManifestFolderTargetPath(
  installTo: string,
  sourcePath: string,
  suffix: string,
): string {
  const normalizedSourcePath = normalizeModPath(sourcePath)
  const sourceFolderName = normalizedSourcePath.split("/").filter(Boolean).pop() ?? ""
  const normalizedInstallTo = normalizeModPath(installTo)

  const baseTargetPath =
    sourceFolderName &&
    normalizedInstallTo &&
    normalizedInstallTo.split("/").filter(Boolean).pop() === sourceFolderName
      ? normalizedInstallTo
      : joinManifestTargetPath(normalizedInstallTo, sourceFolderName)

  return joinManifestTargetPath(baseTargetPath, suffix)
}

function isGameTypeTarget(value: string): value is GameTypeTarget {
  return GAME_TYPE_TARGETS.includes(value as GameTypeTarget)
}

function buildBuilderLinks(links: ExistingBuilderManifestLink[]): BuilderLinkInput[] {
  const builtLinks = createDefaultBuilderLinks()
  const extraLinks: BuilderLinkInput[] = []

  for (const link of links) {
    const kind = normalizeBuilderLinkKind(link.kind)
    if (kind === "gtamodx" || kind === "github") {
      const target = builtLinks.find((item) => item.kind === kind)
      if (target) {
        target.label = link.label || target.label
        target.url = link.url
      }
      continue
    }

    extraLinks.push({
      id: createBuilderLinkId(),
      kind: "external",
      label: link.label,
      url: link.url,
    })
  }

  return [...builtLinks, ...extraLinks]
}

function createBuilderLink(kind: BuilderLinkInput["kind"]): BuilderLinkInput {
  return {
    id: createBuilderLinkId(),
    kind,
    label: kind === "gtamodx" ? "GTAMODX" : kind === "github" ? "GitHub" : "",
    url: "",
  }
}

function createDefaultBuilderLinks(): BuilderLinkInput[] {
  return [createBuilderLink("gtamodx"), createBuilderLink("github")]
}

function getSpecialLinkUrl(
  links: BuilderLinkInput[],
  kind: "gtamodx" | "github",
): string {
  return links.find((link) => link.kind === kind)?.url ?? ""
}

function getExtraLinks(links: BuilderLinkInput[]): BuilderLinkInput[] {
  return links.filter((link) => link.kind === "external")
}

function normalizeBuilderLinkKind(
  kind: string | undefined,
): BuilderLinkInput["kind"] {
  switch ((kind || "").trim().toLowerCase()) {
    case "gtamodx":
      return "gtamodx"
    case "github":
      return "github"
    default:
      return "external"
  }
}

function createBuilderLinkId(): string {
  return `link-${Math.random().toString(36).slice(2, 10)}`
}

export {
  buildInitialState,
  buildManifestEntries,
  buildManifestPayload,
  createBuilderLink,
  createDefaultBuilderLinks,
  getExtraLinks,
  getSpecialLinkUrl,
}
