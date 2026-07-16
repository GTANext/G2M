import { useCallback, useEffect, useState } from "react"
import type { DropResult } from "@hello-pangea/dnd"

import type { HomeWorkspaceState } from "@/features/home/types"

function useGameSortDnD(workspace: HomeWorkspaceState) {
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
        if (!removed) {
            return
        }

        reorderedGames.splice(endIndex, 0, removed)
        setLocalGames(reorderedGames)

        const nextOrders = reorderedGames.map((game, index) => ({
            id: game.id,
            sortOrder: index,
        }))

        void workspace.updateGamesSortOrder(nextOrders)
    }, [localGames, workspace])

    return {
        localGames,
        handleDragEnd,
    }
}

export { useGameSortDnD }
