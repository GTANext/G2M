import { useCallback, useEffect, useMemo, useState } from "react"

import { useAppPreferences } from "@/components/app/preferencesProvider"
import {
  APP_UPDATE_CACHE_MAX_AGE,
  buildGitHubReleaseTag,
  buildGitHubDownloadUrl,
  buildGitHubReleaseUrl,
  G2M_GITHUB_RELEASES_API,
  normalizeVersionValue,
  isRemoteVersionNewer,
  resolveAppUpdateError,
  resolvePreferredGitHubAsset,
  resolveGitHubReleaseVersion,
  resolveLatestGitHubRcRelease,
  type AppUpdateApiSource,
  type AppUpdateDownloadSource,
  type AppUpdateErrorDetails,
  type GitHubReleasePayload,
} from "@/lib/appUpdate"
import type { ModxAppPayload } from "@/lib/modxAuth"
import { useModxApi } from "@/hooks/useModxApi"

type AppUpdateState = {
  status: "idle" | "checking" | "success" | "error"
  remoteVersion: string | null
  hasUpdate: boolean
  checkedAt: number | null
  releaseTag: string | null
  downloadAssetUrl: string | null
  checkError: AppUpdateErrorDetails | null
}

type AppUpdateCache = {
  version: number
  checkedAt: number
  currentVersion: string
  hasUpdate: boolean
  remoteVersion: string | null
  downloadAssetUrl: string | null
  releaseTag: string | null
  source: AppUpdateApiSource
}

const APP_UPDATE_CACHE_STORAGE_KEY = "g2m:app-update-cache"
const APP_UPDATE_CACHE_VERSION = 2

const DEFAULT_APP_UPDATE_STATE: AppUpdateState = {
  status: "idle",
  remoteVersion: null,
  hasUpdate: false,
  checkedAt: null,
  releaseTag: null,
  downloadAssetUrl: null,
  checkError: null,
}

function useAppUpdate(currentVersion: string | null | undefined) {
  const { appUpdateApiSource, appUpdateDownloadSource } = useAppPreferences()
  const { isHydrated, requestModxApi } = useModxApi()
  const [state, setState] = useState<AppUpdateState>(DEFAULT_APP_UPDATE_STATE)

  const normalizedCurrentVersion = useMemo(
    () => (typeof currentVersion === "string" ? currentVersion.trim() : ""),
    [currentVersion],
  )

  const resolveDownloadUrl = useCallback(
    (downloadAssetUrl: string | null | undefined, releaseTag: string | null | undefined) => {
      const assetDownloadUrl = buildGitHubDownloadUrl(downloadAssetUrl, appUpdateDownloadSource)
      if (assetDownloadUrl) {
        return assetDownloadUrl
      }

      return buildGitHubReleaseUrl(releaseTag, appUpdateDownloadSource)
    },
    [appUpdateDownloadSource],
  )

  const checkForUpdates = useCallback(
    async (options?: { force?: boolean }) => {
      if (!normalizedCurrentVersion) {
        setState(DEFAULT_APP_UPDATE_STATE)
        return
      }

      if (appUpdateApiSource === "gtamodx" && !isHydrated) {
        return
      }

      if (!options?.force) {
        const cachedState = loadCachedAppUpdateState(normalizedCurrentVersion, appUpdateApiSource)
        if (cachedState) {
          setState({
            ...cachedState,
            status: "success",
          })
          return
        }
      }

      setState((current) => ({
        ...current,
        status: "checking",
      }))

      try {
        const resolved =
          appUpdateApiSource === "gtamodx"
            ? await fetchFromModx(requestModxApi)
            : await fetchFromGitHub(appUpdateDownloadSource)

        const nextState: AppUpdateState = {
          status: "success",
          remoteVersion: resolved.remoteVersion,
          hasUpdate: isRemoteVersionNewer(normalizedCurrentVersion, resolved.remoteVersion),
          checkedAt: Date.now(),
          releaseTag: resolved.releaseTag,
          downloadAssetUrl: resolved.downloadAssetUrl,
          checkError: null,
        }

        setState(nextState)
        storeCachedAppUpdateState(
          {
            version: APP_UPDATE_CACHE_VERSION,
            checkedAt: nextState.checkedAt ?? Date.now(),
            currentVersion: normalizedCurrentVersion,
            hasUpdate: nextState.hasUpdate,
            remoteVersion: nextState.remoteVersion,
            releaseTag: nextState.releaseTag,
            downloadAssetUrl: nextState.downloadAssetUrl,
            source: appUpdateApiSource,
          },
          resolveDownloadUrl,
        )
      } catch (error) {
        const resolvedError = resolveAppUpdateError(error, "check")
        setState((current) => ({
          ...current,
          status: "error",
          checkError: resolvedError,
        }))
      }
    },
    [
      normalizedCurrentVersion,
      appUpdateApiSource,
      isHydrated,
      requestModxApi,
      appUpdateDownloadSource,
      resolveDownloadUrl,
    ],
  )

  useEffect(() => {
    void checkForUpdates()
  }, [checkForUpdates])

  return {
    ...state,
    apiSource: appUpdateApiSource,
    currentVersion: normalizedCurrentVersion,
    downloadSource: appUpdateDownloadSource,
    downloadUrl: resolveDownloadUrl(state.downloadAssetUrl, state.releaseTag),
    hasChecked: state.status === "success" || state.status === "error",
    checkForUpdates,
  }
}

export { useAppUpdate }
export type { AppUpdateState }
export type UseAppUpdateResult = ReturnType<typeof useAppUpdate>

async function fetchFromModx(
  requestModxApi: <T>(path: string, init?: RequestInit) => Promise<T>,
) {
  const payload = await requestModxApi<ModxAppPayload>("/mods/g2m")
  const remoteVersion = resolveModxVersion(payload)
  if (!remoteVersion) {
    throw new Error("Missing version in GTAMODX /mods/g2m response")
  }

  const releaseTag = buildGitHubReleaseTag(remoteVersion)
  const release =
    (releaseTag ? await fetchGitHubReleaseByTag(releaseTag) : null) ??
    (await fetchLatestGitHubRcRelease())
  const preferredAsset = resolvePreferredGitHubAsset(release)
  const resolvedReleaseTag =
    buildGitHubReleaseTag(release?.tag_name ?? release?.name ?? "") || releaseTag

  return {
    remoteVersion: release ? resolveGitHubReleaseVersion(release) || remoteVersion : remoteVersion,
    releaseTag: resolvedReleaseTag,
    downloadAssetUrl: preferredAsset?.browser_download_url?.trim() ?? null,
  }
}

async function fetchFromGitHub(downloadSource: AppUpdateDownloadSource) {
  const release = await fetchLatestGitHubRcRelease()

  const remoteVersion = resolveGitHubReleaseVersion(release)
  if (!remoteVersion) {
    throw new Error("Missing version in GitHub release response")
  }

  const releaseTag = buildGitHubReleaseTag(release.tag_name ?? release.name ?? "")
  const preferredAsset = resolvePreferredGitHubAsset(release)

  return {
    remoteVersion,
    releaseTag,
    downloadAssetUrl:
      preferredAsset?.browser_download_url?.trim() ??
      appUpdateReleaseUrl(release.html_url, releaseTag, downloadSource),
  }
}

function appUpdateReleaseUrl(
  releasePageUrl: string | null | undefined,
  releaseTag: string,
  downloadSource: AppUpdateDownloadSource,
) {
  if (downloadSource === "official" && releasePageUrl?.trim()) {
    return releasePageUrl.trim()
  }

  return buildGitHubReleaseUrl(releaseTag, downloadSource)
}

function loadCachedAppUpdateState(
  currentVersion: string,
  source: AppUpdateApiSource,
): AppUpdateState | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const raw = window.localStorage.getItem(APP_UPDATE_CACHE_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as AppUpdateCache | null
    if (
      !parsed ||
      parsed.version !== APP_UPDATE_CACHE_VERSION ||
      parsed.source !== source ||
      parsed.currentVersion !== currentVersion ||
      typeof parsed.checkedAt !== "number" ||
      Date.now() - parsed.checkedAt > APP_UPDATE_CACHE_MAX_AGE
    ) {
      return null
    }

    return {
      status: "success",
      remoteVersion: parsed.remoteVersion,
      hasUpdate: parsed.hasUpdate,
      checkedAt: parsed.checkedAt,
      releaseTag: parsed.releaseTag,
      downloadAssetUrl: parsed.downloadAssetUrl,
      checkError: null,
    }
  } catch {
    return null
  }
}

function storeCachedAppUpdateState(
  value: AppUpdateCache,
  resolveDownloadUrl: (downloadAssetUrl: string | null | undefined, releaseTag: string | null | undefined) => string,
) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(
    APP_UPDATE_CACHE_STORAGE_KEY,
    JSON.stringify({
      ...value,
      downloadAssetUrl:
        value.downloadAssetUrl && value.downloadAssetUrl.trim()
          ? value.downloadAssetUrl.trim()
          : resolveDownloadUrl(null, value.releaseTag),
    }),
  )
}

async function fetchGitHubReleaseByTag(tag: string): Promise<GitHubReleasePayload | null> {
  const normalizedTag = normalizeVersionValue(tag)
  if (!normalizedTag) {
    return null
  }

  const response = await fetch(`${G2M_GITHUB_RELEASES_API}/tags/${encodeURIComponent(normalizedTag)}`)
  if (!response.ok) {
    return null
  }

  return (await response.json()) as GitHubReleasePayload
}

async function fetchLatestGitHubRcRelease(): Promise<GitHubReleasePayload> {
  const response = await fetch(`${G2M_GITHUB_RELEASES_API}?per_page=10`)
  if (!response.ok) {
    throw new Error(response.statusText || "Failed to fetch GitHub releases")
  }

  const releases = (await response.json()) as GitHubReleasePayload[]
  const release = resolveLatestGitHubRcRelease(releases)
  if (!release) {
    throw new Error("Missing release in GitHub releases response")
  }

  return release
}

function resolveModxVersion(payload: ModxAppPayload | null | undefined): string {
  if (!payload || typeof payload !== "object") {
    return ""
  }

  const candidateKeys = ["version", "latestVersion", "currentVersion", "buildVersion"] as const
  for (const key of candidateKeys) {
    const value = normalizeVersionValue(payload[key])
    if (value) {
      return value
    }
  }

  return ""
}
