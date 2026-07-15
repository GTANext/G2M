import { ArrowRight, CalendarDays, FolderOpen } from "lucide-react"
import { useTranslation } from "react-i18next"

import { formatGameTimestamp, resolveGameImageSrc, type Game } from "@/lib/g2m"

import { G2MPill } from "@/components/g2m/surface"

type G2MGameCoverCardProps = {
  game: Game
  onClick: () => void
  showMoreInfo?: boolean
}

function G2MGameCoverCard({ game, onClick, showMoreInfo = false }: G2MGameCoverCardProps) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      className="group block w-full cursor-pointer text-left"
    >
      <div className="overflow-hidden rounded-[30px] border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_22px_70px_rgba(15,23,42,0.1)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_90px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.92))] dark:hover:shadow-[0_30px_90px_rgba(0,0,0,0.42)]">
        <div className="relative h-64 overflow-hidden">
          <img
            src={resolveGameImageSrc(game.imagePath, game.gameType)}
            alt={game.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_0%,rgba(15,23,42,0.18)_38%,rgba(15,23,42,0.84)_100%)]" />

          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5">
            <G2MPill className="border-0 bg-black/28 text-white backdrop-blur-md">
              {game.shortName}
            </G2MPill>
            <G2MPill className="border-0 bg-white/18 text-white backdrop-blur-md">
              {t("gameCard.modCount", { count: game.modCount })}
            </G2MPill>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-6 text-white">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-2xl font-semibold tracking-tight">{game.name}</p>
                <p className="mt-1 text-sm text-white/75">{game.version || t("gameCard.versionFallback")}</p>
              </div>
              <ArrowRight className="size-5 shrink-0 text-white/80 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {showMoreInfo && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <InfoTile
                  label={t("gameCard.createdAt")}
                  value={formatGameTimestamp(game.createdAt)}
                />
                <InfoTile
                  label={t("gameCard.updatedAt")}
                  value={formatGameTimestamp(game.updatedAt)}
                />
              </div>

              <div className="rounded-[22px] border border-black/5 bg-[linear-gradient(135deg,rgba(248,250,252,0.95),rgba(241,245,249,0.88))] px-4 py-4 dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.6),rgba(15,23,42,0.78))]">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  <FolderOpen className="size-3.5" />
                  {t("gameCard.installPath")}
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {game.gamePath}
                </p>
              </div>
            </>
          )}

          <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 px-4 py-3 text-sm dark:border-white/10">
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">{t("gameCard.openWorkspace")}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t("gameCard.openWorkspaceDescription")}
              </p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <ArrowRight className="size-4" />
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-slate-100/80 px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        <CalendarDays className="size-3.5" />
        {label}
      </div>
      <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  )
}

export { G2MGameCoverCard }
