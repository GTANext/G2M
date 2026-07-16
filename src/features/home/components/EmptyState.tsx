import { Gamepad2, HardDriveDownload, Plus } from "lucide-react"

import { useTranslation } from "react-i18next"
import { G2MPanel, G2MSubtlePanel } from "@/components/g2m/surface"
import { Button } from "@/components/ui/button"
import type { HomeWorkspaceState } from "@/features/home/types"

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

function EmptyState({ workspace }: { workspace: HomeWorkspaceState }) {
    const { t } = useTranslation()

    return (
        <G2MPanel>
            <div className="grid gap-8 p-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:p-10">
                <div className="flex flex-col justify-center">
                    <div className="flex size-16 items-center justify-center rounded-3xl bg-violet-100 text-violet-700 ring-1 ring-violet-200/80 dark:bg-violet-500/15 dark:text-violet-200 dark:ring-violet-400/30">
                        <Gamepad2 className="size-8" />
                    </div>
                    <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                        {t("home.emptyTitle")}
                    </h2>
                    <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
                        {t("home.emptyDescription")}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
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
                    </div>
                </div>

                <G2MSubtlePanel>
                    <div className="p-5">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("home.detectionRules")}</p>
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

export { EmptyState }
