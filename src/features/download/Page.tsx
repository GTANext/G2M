import { LockKeyhole, ShieldCheck, ArrowRight, CheckCircle2, Download } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { useModxAuth } from "@/components/app/modxAuthProvider"
import { G2MPageHeroCard } from "@/components/g2m/pageHeroCard"
import { G2MPanel, G2MPill } from "@/components/g2m/surface"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { resolveGameImageSrc } from "@/lib/g2m"

type DownloadCardStatus = "ready" | "downloaded"

type DownloadPreviewPreset = {
  id: string
  title: string
  shortName: string
  exeName: string
  packageName: string
  size: string
  gameType: "sa" | "vc" | "iii"
}

const DOWNLOAD_PREVIEW_PRESETS: DownloadPreviewPreset[] = [
  {
    id: "gta-sa",
    title: "GTA San Andreas",
    shortName: "SA",
    exeName: "gta_sa.exe",
    packageName: "gta_sa_complete.zip",
    size: "4.1 GB",
    gameType: "sa",
  },
  {
    id: "gta-vc",
    title: "GTA Vice City",
    shortName: "VC",
    exeName: "gta-vc.exe",
    packageName: "gta_vc_classic.zip",
    size: "1.6 GB",
    gameType: "vc",
  },
  {
    id: "gta-iii",
    title: "GTA III",
    shortName: "III",
    exeName: "gta3.exe",
    packageName: "gta_iii_archive.zip",
    size: "0.9 GB",
    gameType: "iii",
  },
]

function Page() {
  const { t } = useTranslation()
  const { authState, isAuthenticated, openLoginDialog } = useModxAuth()
  const [cardStatusById, setCardStatusById] = useState<Record<string, DownloadCardStatus>>({})
  const [loginPromptGameId, setLoginPromptGameId] = useState<string | null>(null)

  const loginPromptGame = useMemo(
    () => DOWNLOAD_PREVIEW_PRESETS.find((game) => game.id === loginPromptGameId) ?? null,
    [loginPromptGameId],
  )
  const accountLabel = useMemo(() => {
    const user = authState?.user
    return user?.name ?? user?.nickname ?? user?.username ?? user?.email ?? t("auth.guest")
  }, [authState?.user, t])

  function handleGameAction(gameId: string) {
    const currentStatus = cardStatusById[gameId] ?? "ready"

    if (!isAuthenticated) {
      setLoginPromptGameId(gameId)
      openLoginDialog()
      return
    }

    setLoginPromptGameId(null)

    setCardStatusById((current) => ({
      ...current,
      [gameId]: currentStatus === "ready" ? "downloaded" : "ready",
    }))
  }

  return (
    <div className="mx-auto max-w-[1700px] space-y-4">
      <G2MPageHeroCard
        eyebrow={t("download.eyebrow")}
        title={t("download.title")}
        description={t("download.description")}
        actions={
          isAuthenticated ? (
            <div className="flex items-center gap-2 rounded-[20px] border border-emerald-300/60 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950 shadow-[0_18px_40px_rgba(16,185,129,0.12)] ring-1 ring-emerald-200/60 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100 dark:ring-emerald-400/10">
              <ShieldCheck className="size-4" />
              <span>{t("download.authReady", { account: accountLabel })}</span>
            </div>
          ) : (
            <Button type="button" className="cursor-pointer rounded-xl px-4" onClick={openLoginDialog}>
              <LockKeyhole className="size-4" />
              {t("download.loginNow")}
            </Button>
          )
        }
      />

      {loginPromptGame && (
        <Alert className="rounded-[24px] border-amber-200/70 bg-amber-50/90 px-4 py-4 text-amber-950 ring-1 ring-amber-100/80 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-400/10">
          <LockKeyhole className="mt-1 size-4" />
          <AlertTitle className="text-sm">{t("download.loginPromptTitle")}</AlertTitle>
          <AlertDescription className="mt-1 text-sm leading-7 text-amber-900/90 dark:text-amber-100/85">
            {t("download.loginPromptDescription", { game: loginPromptGame.title })}
          </AlertDescription>
          <AlertAction className="right-4 top-4">
            <Button
              type="button"
              size="sm"
              className="h-9 cursor-pointer rounded-xl px-3"
              onClick={openLoginDialog}
            >
              {t("download.loginNow")}
            </Button>
          </AlertAction>
        </Alert>
      )}

      <G2MPanel>
        <div className="p-5 lg:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                {t("download.catalogEyebrow")}
              </p>
              <h3 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">
                {t("download.catalogTitle")}
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {t("download.catalogDescription")}
              </p>
            </div>
            <G2MPill className="bg-slate-900 text-white dark:bg-white dark:text-slate-900">
              {t("download.previewBadge")}
            </G2MPill>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {DOWNLOAD_PREVIEW_PRESETS.map((game) => (
              <SimpleDownloadCard
                key={game.id}
                game={game}
                status={cardStatusById[game.id] ?? "ready"}
                isAuthenticated={isAuthenticated}
                onAction={() => handleGameAction(game.id)}
                t={t}
              />
            ))}
          </div>
        </div>
      </G2MPanel>
    </div>
  )
}

function SimpleDownloadCard({
  game,
  isAuthenticated,
  onAction,
  status,
  t,
}: {
  game: DownloadPreviewPreset
  isAuthenticated: boolean
  onAction: () => void
  status: DownloadCardStatus
  t: ReturnType<typeof useTranslation>["t"]
}) {
  const isDownloaded = status === "downloaded"
  const imageSrc = resolveGameImageSrc("", game.gameType)

  return (
    <button
      type="button"
      onClick={onAction}
      className="group block w-full cursor-pointer text-left"
    >
      <div className="overflow-hidden rounded-[30px] border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_22px_70px_rgba(15,23,42,0.1)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_90px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.92))] dark:hover:shadow-[0_30px_90px_rgba(0,0,0,0.42)]">
        <div className="relative h-64 overflow-hidden">
          <img
            src={imageSrc}
            alt={game.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_0%,rgba(15,23,42,0.18)_38%,rgba(15,23,42,0.84)_100%)]" />

          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5">
            <G2MPill className="border-0 bg-black/28 text-white backdrop-blur-md">
              {game.shortName}
            </G2MPill>
            <G2MPill className="border-0 bg-white/18 text-white backdrop-blur-md">
              {game.size}
            </G2MPill>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-6 text-white">
            <div className="flex items-end justify-between gap-4">
              <p className="text-2xl font-semibold tracking-tight">{game.title}</p>
              {isDownloaded ? (
                <CheckCircle2 className="size-5 shrink-0 text-white/80" />
              ) : (
                <ArrowRight className="size-5 shrink-0 text-white/80 transition-transform duration-300 group-hover:translate-x-1" />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 px-4 py-3 text-sm dark:border-white/10">
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {isAuthenticated
                  ? isDownloaded
                    ? t("download.extractAction")
                    : t("download.downloadAction")
                  : t("download.loginNow")}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {isDownloaded ? t("download.cardStatusDownloaded") : t("download.cardStatusWaiting")}
              </p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-white transition-transform duration-300 group-hover:translate-x-1 dark:bg-white dark:text-slate-950">
              {isDownloaded ? <CheckCircle2 className="size-4" /> : <Download className="size-4" />}
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}

export { Page }
