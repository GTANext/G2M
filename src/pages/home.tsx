import type { ReactNode } from "react"
import { ArrowRight, CalendarDays, FolderOpen, Gamepad2, HardDriveDownload, Plus } from "lucide-react"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

import { useI18n } from "@/components/app/i18nProvider"
import { useAppPreferences } from "@/components/app/preferencesProvider"
import { G2MGameCoverCard } from "@/components/g2m/gameCoverCard"
import { G2MPanel, G2MPill, G2MSubtlePanel } from "@/components/g2m/surface"
import { Button } from "@/components/ui/button"
import type { UseG2mWorkspaceResult } from "@/hooks/useG2MWorkspace"
import { formatGameTimestamp, resolveGameImageSrc } from "@/lib/g2m"

type WorkspaceState = UseG2mWorkspaceResult

function HomePage({ workspace }: { workspace: WorkspaceState }) {
  const navigate = useNavigate()
  const { copy } = useI18n()

  useEffect(() => {
    workspace.goHome()
  }, [workspace])

  function openGameRoute(gameId: string) {
    navigate(`/game/${gameId}`)
  }

  return (
    <div className="mx-auto max-w-[1700px] space-y-6">
      <G2MPanel>
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <G2MPill className="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
              {copy.home.heroEyebrow}
            </G2MPill>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              {copy.home.heroTitle}
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              {copy.home.heroDescription}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              className="cursor-pointer rounded-xl px-4"
              onClick={workspace.startAddGame}
            >
              <Plus className="size-4" />
              {copy.home.addGame}
            </Button>
            <Button
              variant="outline"
              className="cursor-pointer rounded-xl border-border/70 bg-background/70 px-4 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              onClick={() => void workspace.openGamesDownloadPage()}
            >
              <HardDriveDownload className="size-4" />
              {copy.home.downloadGame}
            </Button>
          </div>
        </div>
      </G2MPanel>

      {!workspace.hasConfiguredGames ? (
        <EmptyHero workspace={workspace} />
      ) : (
        <ConfiguredGamesGrid workspace={workspace} onOpenGame={openGameRoute} />
      )}
    </div>
  )
}

function EmptyHero({ workspace }: { workspace: WorkspaceState }) {
  const { copy } = useI18n()

  return (
    <G2MPanel>
      <div className="grid gap-8 p-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:p-10">
        <div className="flex flex-col justify-center">
          <div className="flex size-16 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-lg dark:bg-slate-100 dark:text-slate-950">
            <Gamepad2 className="size-7" />
          </div>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
            {copy.home.emptyTitle}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
            {copy.home.emptyDescription}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              className="cursor-pointer rounded-xl px-4"
              onClick={workspace.startAddGame}
            >
              <Plus className="size-4" />
              {copy.home.addGame}
            </Button>
            <Button
              variant="outline"
              className="cursor-pointer rounded-xl border-border/70 bg-background/70 px-4 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              onClick={() => void workspace.openGamesDownloadPage()}
            >
              <HardDriveDownload className="size-4" />
              {copy.home.downloadGame}
            </Button>
          </div>
        </div>

        <G2MSubtlePanel>
          <div className="p-5">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{copy.home.detectionRules}</p>
            <div className="mt-4 space-y-3">
              <DetectionRule gameType="GTA San Andreas" exeName="gta_sa.exe / gta-sa.exe" />
              <DetectionRule gameType="GTA Vice City" exeName="gta-vc.exe / gta_vc.exe" />
              <DetectionRule gameType="GTA III" exeName="gta3.exe" />
            </div>
          </div>
        </G2MSubtlePanel>
      </div>
    </G2MPanel>
  )
}

function ConfiguredGamesGrid({
  workspace,
  onOpenGame,
}: {
  workspace: WorkspaceState
  onOpenGame: (gameId: string) => void
}) {
  const { copy } = useI18n()
  const { homeViewMode, showHomeGameDetails } = useAppPreferences()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">{copy.home.configuredTitle}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {copy.home.configuredDescription}
          </p>
        </div>
        <G2MPill className="bg-background/80 text-slate-500 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
          {copy.home.configuredCount(workspace.configuredGames.length)}
        </G2MPill>
      </div>

      {homeViewMode === "card" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspace.configuredGames.map((game) => (
            <G2MGameCoverCard
              key={game.id}
              game={game}
              onClick={() => onOpenGame(game.id)}
              showMoreInfo={showHomeGameDetails}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {workspace.configuredGames.map((game) => (
            <GameListRow
              key={game.id}
              game={game}
              onClick={() => onOpenGame(game.id)}
              showMoreInfo={showHomeGameDetails}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function GameListRow({
  game,
  onClick,
  showMoreInfo,
}: {
  game: WorkspaceState["configuredGames"][number]
  onClick: () => void
  showMoreInfo: boolean
}) {
  const { copy } = useI18n()

  return (
    <button
      type="button"
      onClick={onClick}
      className="group block w-full cursor-pointer text-left"
    >
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
              <span className="text-xs text-white/80">{copy.gameCard.modCount(game.modCount)}</span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h3 className="truncate text-xl font-semibold text-slate-950 dark:text-slate-50">{game.name}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {game.version || copy.gameCard.versionFallback}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start">
                <G2MPill className="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                  {copy.home.listView}
                </G2MPill>
                <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-white transition-transform duration-300 group-hover:translate-x-1 dark:bg-white dark:text-slate-950">
                  <ArrowRight className="size-4" />
                </div>
              </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {copy.gameCard.openWorkspaceDescription}
            </p>

            {showMoreInfo && (
              <div className="mt-4 grid gap-3 lg:grid-cols-[repeat(2,minmax(0,180px))_minmax(0,1fr)]">
                <ListInfoChip
                  icon={<CalendarDays className="size-3.5" />}
                  label={copy.gameCard.createdAt}
                  value={formatGameTimestamp(game.createdAt)}
                />
                <ListInfoChip
                  icon={<CalendarDays className="size-3.5" />}
                  label={copy.gameCard.updatedAt}
                  value={formatGameTimestamp(game.updatedAt)}
                />
                <ListInfoChip
                  icon={<FolderOpen className="size-3.5" />}
                  label={copy.gameCard.installPath}
                  value={game.gamePath}
                  clamp={false}
                />
              </div>
            )}
          </div>
        </div>
      </G2MPanel>
    </button>
  )
}

function ListInfoChip({
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
      <p className={clamp ? "mt-2 truncate text-sm font-medium text-slate-900 dark:text-slate-100" : "mt-2 break-all text-sm font-medium text-slate-900 dark:text-slate-100"}>
        {value}
      </p>
    </div>
  )
}

function DetectionRule({
  gameType,
  exeName,
}: {
  gameType: string
  exeName: string
}) {
  return (
    <div className="rounded-2xl bg-background px-4 py-3 ring-1 ring-black/5 dark:bg-white/[0.06] dark:ring-white/10">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{gameType}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{exeName}</p>
    </div>
  )
}

export { HomePage }
