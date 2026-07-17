import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { formatApiErrorMessage } from "@/lib/api"
import { normalizeVersionValue } from "@/lib/appUpdate"
import type { ManagedMod } from "@/lib/g2m"
import type { ModxRemoteModPayload } from "@/lib/modxAuth"
import { useModxApi } from "@/hooks/useModxApi"

export type ModUpdateCheckState = {
  status: "idle" | "checking" | "success"
  remoteVersion: string | null
  hasUpdate: boolean | null
}

const DEFAULT_UPDATE_CHECK_STATE: ModUpdateCheckState = {
  status: "idle",
  remoteVersion: null,
  hasUpdate: null,
}

function resolveWorkspaceModxLink(mod: ManagedMod): string | null {
  return (
    mod.links.find((link) => {
      const kind = link.kind?.trim().toLowerCase()
      return kind === "gtamodx" || link.url.includes("/mods/")
    })?.url ?? null
  )
}

function resolveRemoteModVersion(mod: ModxRemoteModPayload | null): string {
  if (!mod || typeof mod !== "object") {
    return ""
  }

  const candidateKeys = ["version", "latestVersion", "buildVersion", "currentVersion"]
  for (const key of candidateKeys) {
    const value = mod[key]
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }

  const nestedBuild = mod.build
  if (nestedBuild && typeof nestedBuild === "object") {
    const version = (nestedBuild as Record<string, unknown>).version
    if (typeof version === "string" && version.trim()) {
      return version.trim()
    }
  }

  return ""
}

export function useModUpdateCheck(mod: ManagedMod | null) {
  const { t } = useTranslation()
  const { requestModxApi } = useModxApi()
  const [updateCheckState, setUpdateCheckState] = useState<ModUpdateCheckState>(
    DEFAULT_UPDATE_CHECK_STATE,
  )

  useEffect(() => {
    setUpdateCheckState(DEFAULT_UPDATE_CHECK_STATE)
  }, [mod?.id])

  const modxLink = useMemo(() => (mod ? resolveWorkspaceModxLink(mod) : null), [mod])
  const canCheckModUpdate = Boolean(mod?.modxSlug.trim() && mod?.rawVersion.trim())

  const handleCheckModUpdate = useCallback(async () => {
    if (!mod?.modxSlug.trim()) {
      return
    }

    setUpdateCheckState({
      status: "checking",
      remoteVersion: null,
      hasUpdate: null,
    })

    try {
      const remoteMod = await requestModxApi<ModxRemoteModPayload>(
        `/mods/${encodeURIComponent(mod.modxSlug.trim())}`,
      )
      const remoteVersion = resolveRemoteModVersion(remoteMod)
      if (!remoteVersion) {
        throw new Error(t("workspacePage.updateVersionMissing"))
      }

      const hasUpdate =
        normalizeVersionValue(mod.rawVersion) !== normalizeVersionValue(remoteVersion)

      setUpdateCheckState({
        status: "success",
        remoteVersion,
        hasUpdate,
      })

      toast.success(
        hasUpdate ? t("workspacePage.updateAvailable") : t("workspacePage.updateAlreadyLatest"),
        {
          description: `${t("workspacePage.localVersion")}: ${mod.rawVersion} · ${t("workspacePage.remoteVersion")}: ${remoteVersion}`,
        },
      )
    } catch (error) {
      setUpdateCheckState(DEFAULT_UPDATE_CHECK_STATE)
      toast.error(t("workspacePage.updateCheckFailed"), {
        description: formatApiErrorMessage(error),
      })
    }
  }, [mod, requestModxApi, t])

  return {
    canCheckModUpdate,
    handleCheckModUpdate,
    modxLink,
    updateCheckState,
  }
}
