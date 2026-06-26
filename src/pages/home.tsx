import type { ReactNode } from "react"
import { ArrowRight, CalendarDays, FolderOpen, Gamepad2, HardDriveDownload, Plus } from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"

import { useI18n } from "@/components/app/i18nProvider"
import { useAppPreferences } from "@/components/app/preferencesProvider"
import { G2MGameCoverCard } from "@/components/g2m/gameCoverCard"
import { G2MPageHeroCard } from "@/components/g2m/pageHeroCard"
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
    <div className="mx-auto max-w-[1700px] space-y-4">
      <G2MPageHeroCard
        eyebrow={copy.home.heroEyebrow}
        title={copy.home.heroTitle}
        description={copy.home.heroDescription}
        actions={
          <>
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
          </>
        }
      />

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
          <div className="flex size-16 items-center justify-center rounded-3xl bg-violet-100 text-violet-700 ring-1 ring-violet-200/80 dark:bg-violet-500/15 dark:text-violet-200 dark:ring-violet-400/30">
            <Gamepad2 className="size-8" />
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
  const [localGames, setLocalGames] = useState(workspace.configuredGames)

  useEffect(() => {
    setLocalGames(workspace.configuredGames)
  }, [workspace.configuredGames])

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) {
      return
    }

    const startIndex = result.source.index
    const endIndex = result.destination.index

    if (startIndex === endIndex) {
      return
    }

    const reorderedGames = Array.from(localGames)
    const [removed] = reorderedGames.splice(startIndex, 1)
    if (!removed) return

    reorderedGames.splice(endIndex, 0, removed)
    setLocalGames(reorderedGames)

    const nextOrders = reorderedGames.map((game, index) => ({
      id: game.id,
      sortOrder: index,
    }))
    
    void workspace.updateGamesSortOrder(nextOrders)
  }, [localGames, workspace])

  return (
    <G2MPanel>
      <div className="p-5 lg:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{copy.home.configuredTitle}</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">{copy.home.configuredTitle}</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {copy.home.configuredDescription}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <G2MPill className="bg-background/80 px-3 py-1 text-slate-500 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
              {copy.home.configuredCount(localGames.length)}
            </G2MPill>
          </div>
        </div>

        <div className="mt-5">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="games-grid" direction={homeViewMode === "card" ? "horizontal" : "vertical"}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={homeViewMode === "card" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}
                >
                  {localGames.map((game, index) => (
                    <Draggable key={game.id} draggableId={game.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...provided.draggableProps.style,
                            opacity: snapshot.isDragging ? 0.8 : 1,
                          }}
                        >
                          {homeViewMode === "card" ? (
                            <G2MGameCoverCard
                              game={game}
                              onClick={() => onOpenGame(game.id)}
                              showMoreInfo={showHomeGameDetails}
                            />
                          ) : (
                            <GameListRow
                              game={game}
                              onClick={() => onOpenGame(game.id)}
                              showMoreInfo={showHomeGameDetails}
                            />
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>
    </G2MPanel>
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
                  {game.shortName}
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
    <div className="rounded-2xl border border-black/5 bg-background/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{gameType}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{exeName}</p>
    </div>
  )
}

export { HomePage }
