export type AppUpdateApiSource = "gtamodx" | "github"
export type AppUpdateDownloadSource = "proxy" | "official"
export type AppUpdateErrorCode =
  | "network"
  | "updater-source-unsupported"
  | "updater-pubkey-missing"
  | "updater-signature-invalid"
  | "updater-manifest-invalid"
  | "updater-no-update"
  | "unknown"
export type AppUpdateErrorDetails = {
  code: AppUpdateErrorCode
  message: string
}

export type GitHubReleasePayload = {
  tag_name?: string | null
  name?: string | null
  html_url?: string | null
  prerelease?: boolean | null
  draft?: boolean | null
  assets?: GitHubReleaseAssetPayload[] | null
}

export type GitHubReleaseAssetPayload = {
  name?: string | null
  browser_download_url?: string | null
  content_type?: string | null
  state?: string | null
}

export const APP_UPDATE_API_SOURCE_DEFAULT: AppUpdateApiSource = "gtamodx"
export const APP_UPDATE_DOWNLOAD_SOURCE_DEFAULT: AppUpdateDownloadSource = "proxy"
export const APP_UPDATE_CACHE_MAX_AGE = 24 * 60 * 60 * 1000

export const G2M_GITHUB_REPO = "GTANext/G2M"
export const G2M_GITHUB_RELEASES_API = `https://api.github.com/repos/${G2M_GITHUB_REPO}/releases`
export const G2M_GITHUB_RELEASES_URL = `https://github.com/${G2M_GITHUB_REPO}/releases`
export const G2M_GITHUB_PROXY_RELEASES_URL = `https://gh-proxy.com/github.com/${G2M_GITHUB_REPO}/releases`
export const G2M_GITHUB_PROXY_DOWNLOAD_PREFIX = "https://gh-proxy.com/"

export function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.trim()
  }

  if (typeof error === "string") {
    return error.trim()
  }

  return String(error ?? "").trim()
}

export function resolveAppUpdateError(
  error: unknown,
  context: "check" | "install",
): AppUpdateErrorDetails {
  const message = normalizeErrorMessage(error)
  const normalizedMessage = message.toLowerCase()

  if (
    context === "install" &&
    normalizedMessage.includes("only supports gtamodx source")
  ) {
    return {
      code: "updater-source-unsupported",
      message,
    }
  }

  if (
    normalizedMessage.includes("pubkey") ||
    normalizedMessage.includes("public key")
  ) {
    return {
      code: "updater-pubkey-missing",
      message,
    }
  }

  if (
    normalizedMessage.includes("signature") ||
    normalizedMessage.includes("minisign") ||
    normalizedMessage.includes("verify") ||
    normalizedMessage.includes("verification")
  ) {
    return {
      code: "updater-signature-invalid",
      message,
    }
  }

  if (
    normalizedMessage.includes("manifest") ||
    normalizedMessage.includes("json") ||
    normalizedMessage.includes("serde") ||
    normalizedMessage.includes("204") ||
    normalizedMessage.includes("no content") ||
    normalizedMessage.includes("missing version") ||
    normalizedMessage.includes("missing release") ||
    normalizedMessage.includes("missing url") ||
    normalizedMessage.includes("missing signature")
  ) {
    return {
      code: "updater-manifest-invalid",
      message,
    }
  }

  if (
    normalizedMessage.includes("no update") ||
    normalizedMessage.includes("already up to date")
  ) {
    return {
      code: "updater-no-update",
      message,
    }
  }

  if (
    normalizedMessage.includes("fetch") ||
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("timeout") ||
    normalizedMessage.includes("timed out") ||
    normalizedMessage.includes("connection") ||
    normalizedMessage.includes("dns") ||
    normalizedMessage.includes("tls") ||
    normalizedMessage.includes("certificate") ||
    normalizedMessage.includes("socket") ||
    normalizedMessage.includes("status")
  ) {
    return {
      code: "network",
      message,
    }
  }

  return {
    code: "unknown",
    message,
  }
}

export function normalizeVersionValue(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : ""
}

export function buildGitHubReleaseTag(version: string | null | undefined): string {
  const normalized = normalizeVersionValue(version)
  if (!normalized) {
    return ""
  }

  return normalized.startsWith("v") ? normalized : `v${normalized}`
}

export function buildGitHubReleaseUrl(
  tag: string | null | undefined,
  source: AppUpdateDownloadSource,
): string {
  const normalizedTag = normalizeVersionValue(tag)
  if (!normalizedTag) {
    return source === "proxy" ? G2M_GITHUB_PROXY_RELEASES_URL : G2M_GITHUB_RELEASES_URL
  }

  const baseUrl = source === "proxy" ? G2M_GITHUB_PROXY_RELEASES_URL : G2M_GITHUB_RELEASES_URL
  return `${baseUrl}/tag/${encodeURIComponent(normalizedTag)}`
}

export function buildGitHubDownloadUrl(
  assetUrl: string | null | undefined,
  source: AppUpdateDownloadSource,
): string {
  const normalizedAssetUrl = normalizeVersionValue(assetUrl)
  if (!normalizedAssetUrl) {
    return ""
  }

  if (source === "official") {
    return normalizedAssetUrl
  }

  if (normalizedAssetUrl.startsWith(G2M_GITHUB_PROXY_DOWNLOAD_PREFIX)) {
    return normalizedAssetUrl
  }

  return `${G2M_GITHUB_PROXY_DOWNLOAD_PREFIX}${normalizedAssetUrl}`
}

export function resolveGitHubReleaseVersion(release: GitHubReleasePayload | null | undefined): string {
  if (!release || typeof release !== "object") {
    return ""
  }

  const tagVersion = normalizeVersionValue(release.tag_name).replace(/^v/i, "")
  if (tagVersion) {
    return tagVersion
  }

  return normalizeVersionValue(release.name).replace(/^v/i, "")
}

export function resolveLatestGitHubRcRelease(
  releases: GitHubReleasePayload[] | null | undefined,
): GitHubReleasePayload | null {
  if (!Array.isArray(releases)) {
    return null
  }

  const visibleReleases = releases.filter((release) => !release?.draft)
  return (
    visibleReleases.find((release) => release?.prerelease) ??
    visibleReleases.find(Boolean) ??
    null
  )
}

export function resolvePreferredGitHubAsset(
  release: GitHubReleasePayload | null | undefined,
): GitHubReleaseAssetPayload | null {
  const assets = (release?.assets ?? []).filter(isDownloadableGitHubAsset)
  if (!assets.length) {
    return null
  }

  return (
    assets.find((asset) => matchesAssetPattern(asset.name, /^g2m_setup\.exe$/i)) ??
    assets.find((asset) => matchesAssetPattern(asset.name, /^g2m[-_ ]setup\.exe$/i)) ??
    assets.find((asset) => matchesAssetPattern(asset.name, /setup.*\.exe$/i)) ??
    assets.find((asset) => matchesAssetPattern(asset.name, /\.msi$/i)) ??
    assets.find((asset) => matchesAssetPattern(asset.name, /\.exe$/i)) ??
    assets.find((asset) => matchesAssetPattern(asset.name, /\.zip$/i)) ??
    assets[0] ??
    null
  )
}

export function isRemoteVersionNewer(
  currentVersion: string | null | undefined,
  remoteVersion: string | null | undefined,
): boolean {
  return compareVersions(remoteVersion, currentVersion) > 0
}

export function compareVersions(
  left: string | null | undefined,
  right: string | null | undefined,
): number {
  const parsedLeft = parseComparableVersion(left)
  const parsedRight = parseComparableVersion(right)

  const mainLength = Math.max(parsedLeft.main.length, parsedRight.main.length)
  for (let index = 0; index < mainLength; index += 1) {
    const leftPart = parsedLeft.main[index] ?? 0
    const rightPart = parsedRight.main[index] ?? 0
    if (leftPart !== rightPart) {
      return leftPart - rightPart
    }
  }

  if (!parsedLeft.pre.length && !parsedRight.pre.length) {
    return 0
  }
  if (!parsedLeft.pre.length) {
    return 1
  }
  if (!parsedRight.pre.length) {
    return -1
  }

  const preLength = Math.max(parsedLeft.pre.length, parsedRight.pre.length)
  for (let index = 0; index < preLength; index += 1) {
    const leftPart = parsedLeft.pre[index]
    const rightPart = parsedRight.pre[index]

    if (leftPart === undefined) {
      return -1
    }
    if (rightPart === undefined) {
      return 1
    }

    if (typeof leftPart === "number" && typeof rightPart === "number") {
      if (leftPart !== rightPart) {
        return leftPart - rightPart
      }
      continue
    }

    if (typeof leftPart === "number") {
      return -1
    }
    if (typeof rightPart === "number") {
      return 1
    }

    const compared = leftPart.localeCompare(rightPart, undefined, { numeric: true })
    if (compared !== 0) {
      return compared
    }
  }

  return 0
}

function parseComparableVersion(
  value: string | null | undefined,
): {
  main: number[]
  pre: Array<number | string>
} {
  const normalized = normalizeVersionValue(value)
    .replace(/^v/i, "")
    .replace(/\+.*$/, "")

  if (!normalized) {
    return {
      main: [0],
      pre: [],
    }
  }

  const [mainPart, prePart = ""] = normalized.split("-", 2)
  const main = mainPart
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0))

  const pre = prePart
    ? prePart.split(/[.-]/).map((part) => {
        const numeric = Number.parseInt(part, 10)
        if (String(numeric) === part) {
          return numeric
        }

        return part.toLowerCase()
      })
    : []

  return { main, pre }
}

function isDownloadableGitHubAsset(asset: GitHubReleaseAssetPayload | null | undefined) {
  const assetName = normalizeVersionValue(asset?.name).toLowerCase()
  const assetUrl = normalizeVersionValue(asset?.browser_download_url)
  if (!assetName || !assetUrl) {
    return false
  }

  if (
    assetName.endsWith(".sig") ||
    assetName.endsWith(".json") ||
    assetName.endsWith(".blockmap")
  ) {
    return false
  }

  return true
}

function matchesAssetPattern(name: string | null | undefined, pattern: RegExp) {
  const normalized = normalizeVersionValue(name)
  return normalized ? pattern.test(normalized) : false
}
