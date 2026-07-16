import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd"

import { useTranslation } from "react-i18next"
import { useAppPreferences } from "@/components/app/preferencesProvider"
import { G2MPanel, G2MPill } from "@/components/g2m/surface"
import { GameRow } from "@/features/home/components/GameRow"
import { useGameSortDnD } from "@/features/home/hooks/useGameSortDnD"
import type { HomeWorkspaceState } from "@/features/home/types"

function GamesList({
    workspace,
    onOpenGame,
}: {
    workspace: HomeWorkspaceState
    onOpenGame: (gameId: string) => void
}) {
    const { t } = useTranslation()
    const { showHomeGameDetails } = useAppPreferences()
    const { localGames, handleDragEnd } = useGameSortDnD(workspace)

    return (
        <G2MPanel>
            <div className="p-5 lg:p-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                            {t("workspace.breadcrumbHome")}
                        </p>
                        <h3 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">
                            {t("home.configuredTitle")}
                        </h3>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {t("home.configuredDescription")}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <G2MPill className="bg-background/80 px-3 py-1 text-slate-500 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
                            {t("home.configuredCount", { count: localGames.length })}
                        </G2MPill>
                    </div>
                </div>

                <div className="mt-5">
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="games-grid" direction="vertical">
                            {(provided) => (
                                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                                    {localGames.map((game, index) => (
                                        <Draggable key={game.id} draggableId={game.id} index={index}>
                                            {(dragProvided, snapshot) => (
                                                <div
                                                    ref={dragProvided.innerRef}
                                                    {...dragProvided.draggableProps}
                                                    {...dragProvided.dragHandleProps}
                                                    style={{
                                                        ...dragProvided.draggableProps.style,
                                                        opacity: snapshot.isDragging ? 0.8 : 1,
                                                    }}
                                                >
                                                    <GameRow
                                                        game={game}
                                                        onClick={() => onOpenGame(game.id)}
                                                        showMoreInfo={showHomeGameDetails}
                                                    />
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

export { GamesList }
