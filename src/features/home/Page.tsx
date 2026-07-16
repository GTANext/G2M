import { HardDriveDownload, Plus } from "lucide-react"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

import { useTranslation } from "react-i18next"
import { useAppPreferences } from "@/components/app/preferencesProvider"
import { G2MPageHeroCard } from "@/components/g2m/pageHeroCard"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/features/home/components/EmptyState"
import { GamesGrid } from "@/features/home/components/GamesGrid"
import { GamesList } from "@/features/home/components/GamesList"
import type { HomeWorkspaceState } from "@/features/home/types"

function Page({ workspace }: { workspace: HomeWorkspaceState }) {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const { homeViewMode } = useAppPreferences()

    useEffect(() => {
        workspace.goHome()
    }, [workspace])

    function openGameRoute(gameId: string) {
        navigate(`/game/${gameId}`)
    }

    return (
        <div className="mx-auto max-w-[1700px] space-y-4">
            <G2MPageHeroCard
                eyebrow={t("home.heroEyebrow")}
                title={t("home.heroTitle")}
                description={t("home.heroDescription")}
                actions={
                    <>
                        <Button className="cursor-pointer rounded-xl px-4" onClick={workspace.startAddGame}>
                            <Plus className="size-4" />
                            {t("home.addGame")}
                        </Button>
                        <Button
                            variant="outline"
                            className="cursor-pointer rounded-xl border-border/70 bg-background/70 px-4 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                            onClick={() => void workspace.openGamesDownloadPage()}
                        >
                            <HardDriveDownload className="size-4" />
                            {t("home.downloadGame")}
                        </Button>
                    </>
                }
            />

            {!workspace.hasConfiguredGames ? (
                <EmptyState workspace={workspace} />
            ) : homeViewMode === "card" ? (
                <GamesGrid workspace={workspace} onOpenGame={openGameRoute} />
            ) : (
                <GamesList workspace={workspace} onOpenGame={openGameRoute} />
            )}
        </div>
    )
}

export { Page }
