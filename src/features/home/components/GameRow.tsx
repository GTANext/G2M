import type { ReactNode } from "react"
import { ArrowRight, CalendarDays, FolderOpen } from "lucide-react"

import { useTranslation } from "react-i18next"
import { G2MPanel, G2MPill } from "@/components/g2m/surface"
import type { HomeWorkspaceState } from "@/features/home/types"
import { formatGameTimestamp, resolveGameImageSrc } from "@/lib/g2m"
import { cn } from "@/lib/utils"

type Game = HomeWorkspaceState["configuredGames"][number]

function InfoChip({
    clamp = true,
    icon,
    label,
    value,
}: {
    clamp?: boolean
    icon: ReactNode
    label: string
    value: string
}) {
    return (
        <div className="rounded-2xl border border-black/5 bg-slate-100/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.05]">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                {icon}
                {label}
            </div>
            <p
                className={cn(
                    clamp
                        ? "mt-2 truncate text-sm font-medium text-slate-900 dark:text-slate-100"
                        : "mt-2 break-all text-sm font-medium text-slate-900 dark:text-slate-100",
                )}
            >
                {value}
            </p>
        </div>
    )
}

function GameRow({
    game,
    onClick,
    showMoreInfo,
}: {
    game: Game
    onClick: () => void
    showMoreInfo: boolean
}) {
    const { t } = useTranslation()

    return (
        <button type="button" onClick={onClick} className="group block w-full cursor-pointer text-left">
            <G2MPanel className="overflow-hidden p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_80px_rgba(15,23,42,0.12)] dark:hover:shadow-[0_28px_80px_rgba(0,0,0,0.36)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="relative h-24 overflow-hidden rounded-[22px] md:w-44 md:shrink-0">
                        <img
                            src={resolveGameImageSrc(game.imagePath, game.gameType)}
                            alt={game.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.52)_100%)]" />
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-3 text-white">
                            <span className="text-sm font-semibold">{game.shortName}</span>
                            <span className="text-xs text-white/80">{t("gameCard.modCount", { count: game.modCount })}</span>
                        </div>
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                                <h3 className="truncate text-xl font-semibold text-slate-950 dark:text-slate-50">{game.name}</h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    {game.version || t("gameCard.versionFallback")}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 self-start">
                                <G2MPill className="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                                    {game.shortName}
                                </G2MPill>
                                <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-white transition-transform duration-300 group-hover:translate-x-1 dark:bg-white dark:text-slate-950">
                                    <ArrowRight className="size-4" />
                                </div>
                            </div>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {t("gameCard.openWorkspaceDescription")}
                        </p>

                        {showMoreInfo ? (
                            <div className="mt-4 grid gap-3 lg:grid-cols-[repeat(2,minmax(0,180px))_minmax(0,1fr)]">
                                <InfoChip
                                    icon={<CalendarDays className="size-3.5" />}
                                    label={t("gameCard.createdAt")}
                                    value={formatGameTimestamp(game.createdAt)}
                                />
                                <InfoChip
                                    icon={<CalendarDays className="size-3.5" />}
                                    label={t("gameCard.updatedAt")}
                                    value={formatGameTimestamp(game.updatedAt)}
                                />
                                <InfoChip
                                    icon={<FolderOpen className="size-3.5" />}
                                    label={t("gameCard.installPath")}
                                    value={game.gamePath}
                                    clamp={false}
                                />
                            </div>
                        ) : null}
                    </div>
                </div>
            </G2MPanel>
        </button>
    )
}

export { GameRow }
