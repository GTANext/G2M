import { Download, RefreshCcw, Settings2 } from "lucide-react"
import { openUrl } from "@tauri-apps/plugin-opener"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { G2MPageHeroCard } from "@/components/g2m/pageHeroCard"
import { G2MPanel, G2MSubtlePanel } from "@/components/g2m/surface"
import { Button } from "@/components/ui/button"
import { useAppPreferences } from "@/components/app/preferencesProvider"
import type { useAppUpdate } from "@/hooks/useAppUpdate"

function Page({
  appUpdate,
}: {
  appUpdate: ReturnType<typeof useAppUpdate>
}) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { appUpdateApiSource, appUpdateDownloadSource } = useAppPreferences()

  return (
    <div className="mx-auto max-w-[1700px] space-y-6">
      <G2MPageHeroCard
        eyebrow={t("update.eyebrow")}
        title={t("update.title")}
        description={t("update.description")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer rounded-xl border-border/70 bg-background/70 px-4 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              onClick={() => navigate("/settings")}
            >
              <Settings2 className="size-4" />
              {t("update.openSettings")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer rounded-xl border-border/70 bg-background/70 px-4 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              onClick={() => void appUpdate.checkForUpdates({ force: true })}
              disabled={appUpdate.status === "checking"}
            >
              <RefreshCcw className="size-4" />
              {appUpdate.status === "checking"
                ? t("update.checking")
                : t("update.checkNow")}
            </Button>
            <Button
              type="button"
              className="cursor-pointer rounded-xl px-4"
              onClick={() => void openUrl(appUpdate.downloadUrl)}
            >
              <Download className="size-4" />
              {t("update.downloadNow")}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <G2MPanel className="p-6 lg:p-7">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <UpdateStat label={t("update.currentVersion")} value={appUpdate.currentVersion || "-"} />
            <UpdateStat label={t("update.remoteVersion")} value={appUpdate.remoteVersion || "-"} />
            <UpdateStat
              label={t("update.apiSource")}
              value={
                appUpdateApiSource === "gtamodx"
                  ? t("update.sourceGtmodx")
                  : t("update.sourceGithub")
              }
            />
            <UpdateStat
              label={t("update.downloadSource")}
              value={
                appUpdateDownloadSource === "proxy"
                  ? t("update.downloadSourceProxy")
                  : t("update.downloadSourceOfficial")
              }
            />
          </div>

          {appUpdate.status === "error" && appUpdate.checkError ? (
            <div className="mt-4 rounded-[20px] border border-amber-200/70 bg-amber-50/80 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-100/80 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-400/10">
              <p className="font-medium">{resolveCheckErrorDescription(appUpdate, t)}</p>
              {appUpdate.checkError.message ? (
                <p className="mt-2 break-all text-xs leading-5 text-amber-800/90 dark:text-amber-100/85">
                  {t("update.checkErrorDetailsLabel")}: {appUpdate.checkError.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 rounded-[24px] border border-black/5 bg-white/70 p-5 ring-1 ring-black/[0.03] dark:border-white/10 dark:bg-white/[0.03] dark:ring-white/[0.04]">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
              {t("update.statusLabel")}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              {resolveStatusTitle(appUpdate, t)}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              {resolveStatusDescription(appUpdate, t)}
            </p>
          </div>
        </G2MPanel>

        <G2MSubtlePanel className="p-5">
          <div className="space-y-5">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                {t("update.releaseLink")}
              </p>
              <p className="mt-3 break-all text-sm leading-6 text-slate-700 dark:text-slate-200">
                {appUpdate.downloadUrl}
              </p>
            </div>

            <div className="rounded-[20px] border border-black/5 bg-white/70 p-4 text-sm leading-6 text-slate-600 ring-1 ring-black/[0.03] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:ring-white/[0.04]">
              {t("update.hint")}
            </div>
          </div>
        </G2MSubtlePanel>
      </div>
    </div>
  )
}

function UpdateStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-black/5 bg-white/70 p-4 ring-1 ring-black/[0.03] dark:border-white/10 dark:bg-white/[0.03] dark:ring-white/[0.04]">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
        {value}
      </p>
    </div>
  )
}

function resolveStatusTitle(
  appUpdate: ReturnType<typeof useAppUpdate>,
  t: ReturnType<typeof useTranslation>["t"],
) {
  if (appUpdate.status === "checking") {
    return t("update.checking")
  }

  if (appUpdate.hasUpdate && appUpdate.remoteVersion) {
    return t("update.availableTitle", {
      version: appUpdate.remoteVersion,
    })
  }

  if (appUpdate.status === "error") {
    return t("update.checkFailed")
  }

  return t("update.latestTitle")
}

function resolveStatusDescription(
  appUpdate: ReturnType<typeof useAppUpdate>,
  t: ReturnType<typeof useTranslation>["t"],
) {
  if (appUpdate.status === "checking") {
    return t("update.checkingDescription")
  }

  if (appUpdate.hasUpdate && appUpdate.remoteVersion) {
    return t("update.availableDescription", {
      currentVersion: appUpdate.currentVersion,
      remoteVersion: appUpdate.remoteVersion,
    })
  }

  if (appUpdate.status === "error") {
    return resolveCheckErrorDescription(appUpdate, t)
  }

  return t("update.latestDescription", {
    version: appUpdate.currentVersion,
  })
}

export { Page }

function resolveCheckErrorDescription(
  appUpdate: ReturnType<typeof useAppUpdate>,
  t: ReturnType<typeof useTranslation>["t"],
) {
  switch (appUpdate.checkError?.code) {
    case "network":
      return t("update.checkFailedDescriptionNetwork")
    case "updater-manifest-invalid":
      return t("update.checkFailedDescriptionManifest")
    default:
      return t("update.checkFailedDescriptionUnknown")
  }
}
