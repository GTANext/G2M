import { HardDriveDownload, Layers3, Play, RefreshCw, Search, ShieldCheck } from "lucide-react"
import { useState } from "react"

import { useTranslation } from "react-i18next"
import { SelectedModSheet, WorkspaceSidebar } from "@/components/g2m/workspacePanels"
import { G2MPanel, G2MPill, G2MSubtlePanel } from "@/components/g2m/surface"
import { G2MWorkspaceBreadcrumb, G2MWorkspaceHero } from "@/components/g2m/workspaceHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useWorkspacePrerequisiteState } from "@/hooks/workspace/useWorkspacePrerequisiteState"
import { Alerts } from "@/features/workspace/components/Alerts"
import { Drawer } from "@/features/workspace/components/Drawer"
import { ModList } from "@/features/workspace/components/ModList"
import { StatsCard } from "@/features/workspace/components/States"
import { useRouteSync } from "@/features/workspace/hooks/useRouteSync"
import type { WorkspaceState } from "@/features/workspace/types"
import { softOutlineButtonClass } from "@/features/workspace/types"

function Page({ workspace }: { workspace: WorkspaceState }) {
    const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)
    const { t } = useTranslation()
    const { navigate } = useRouteSync(workspace)
    const activeGame = workspace.activeGame

    const {
        handleInstallSelectedPrerequisites,
        isInstallingMissingPrerequisites,
        isPrerequisiteDrawerOpen,
        localSelectedPrerequisiteKeys,
        missingLoadedModPrerequisites,
        missingPrerequisiteSummary,
        duplicateAsiPrerequisites,
        onTogglePrerequisiteKey,
        setIsPrerequisiteDrawerOpen,
    } = useWorkspacePrerequisiteState({
        activeGame,
        activeGameMods: workspace.activeGameMods,
        installingPrerequisiteKey: workspace.installingPrerequisiteKey,
        installGamePrerequisite: workspace.installGamePrerequisite,
    })

    if (!activeGame) {
        return null
    }

    const hasMods = workspace.mods.length > 0
    const hasConflicts = (workspace.selectedMod?.conflictFiles.length ?? 0) > 0
    const hasLinkIssues = activeGame.linkHealth.hasIssues

    return (
        <div className="mx-auto max-w-[1700px] space-y-4">
            <G2MWorkspaceBreadcrumb
                gameName={activeGame.name}
                onHomeClick={() => navigate("/")}
            />

            <G2MWorkspaceHero
                game={activeGame}
                stats={workspace.stats}
                onLaunchGame={() => void workspace.launchGame()}
                onOpenDirectory={() => void workspace.openGameDirectory()}
                onEditGame={() => workspace.openEditGameDialog(activeGame.id)}
            />

            <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
                <aside className="xl:sticky xl:top-24 xl:self-start">
                    <WorkspaceSidebar workspace={workspace} />
                </aside>

                <div className="space-y-4">
                    <G2MPanel>
                        <div className="p-5 lg:p-6">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                <div>
                                    <p className="text-sm font-medium text-violet-600 dark:text-violet-300">{t("workspacePage.mods")}</p>
                                    <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                                        {t("workspacePage.currentLoadedMods")}
                                    </h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                        {t("workspacePage.selectedModDescription")}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <Button
                                        className="cursor-pointer rounded-xl px-4"
                                        onClick={workspace.openImportModDialog}
                                        disabled={workspace.isImportingMod || workspace.isPreviewingMod}
                                    >
                                        <HardDriveDownload className="size-4" />
                                        {t("workspacePage.importMod")}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className={softOutlineButtonClass}
                                        onClick={() => void workspace.launchGame()}
                                    >
                                        <Play className="size-4" />
                                        {t("workspacePage.launchGame")}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className={softOutlineButtonClass}
                                        onClick={() => void workspace.refreshWorkspace()}
                                    >
                                        <RefreshCw className="size-4" />
                                        {t("workspacePage.refresh")}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className={softOutlineButtonClass}
                                        onClick={() => setIsDetailSheetOpen(true)}
                                        disabled={!workspace.selectedMod}
                                    >
                                        <Layers3 className="size-4" />
                                        {t("workspacePage.currentFocus")}
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-5 grid gap-3 lg:grid-cols-4">
                                <StatsCard
                                    label={t("workspacePage.totalMods")}
                                    value={String(workspace.stats.total)}
                                    caption={t("workspacePage.disabledCount", { count: workspace.stats.disabled })}
                                />
                                <StatsCard
                                    label={t("workspacePage.enabled")}
                                    value={String(workspace.stats.enabled)}
                                    caption={t("workspacePage.enabledMods")}
                                    tone="success"
                                />
                                <StatsCard
                                    label={t("workspacePage.conflictFiles")}
                                    value={String(workspace.stats.conflicts)}
                                    caption={hasConflicts ? t("workspacePage.conflictWarning") : t("workspacePage.conflictFree")}
                                    tone={hasConflicts ? "warning" : "success"}
                                />
                                <StatsCard
                                    label={t("workspacePage.fileScale")}
                                    value={String(workspace.stats.files)}
                                    caption={t("workspacePage.filesDetected")}
                                />
                            </div>

                            <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                                <div className="relative">
                                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                    <Input
                                        value={workspace.modSearchQuery}
                                        onChange={(event) => workspace.setModSearchQuery(event.currentTarget.value)}
                                        className="h-12 rounded-2xl border-border/70 bg-background/75 pl-10 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                                        placeholder={t("workspacePage.searchPlaceholder")}
                                    />
                                </div>
                                <G2MSubtlePanel>
                                    <div className="flex h-full items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                                        <G2MPill className="bg-muted px-3 py-1 dark:bg-white/10">
                                            {workspace.bootstrapping ? t("common.current") : t("workspacePage.allTypes")}
                                        </G2MPill>
                                        <G2MPill className="bg-violet-100 px-3 py-1 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                                            {t("workspacePage.usingDatabase")}
                                        </G2MPill>
                                    </div>
                                </G2MSubtlePanel>
                                <G2MSubtlePanel>
                                    <div className="flex h-full items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                                        <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                                        {t("workspacePage.softLinkMode")}
                                    </div>
                                </G2MSubtlePanel>
                            </div>
                        </div>
                    </G2MPanel>

                    <Alerts
                        workspace={workspace}
                        hasConflicts={hasConflicts}
                        hasLinkIssues={hasLinkIssues}
                        duplicateAsiPrerequisites={duplicateAsiPrerequisites}
                        missingLoadedModPrerequisitesCount={missingLoadedModPrerequisites.length}
                        missingPrerequisiteSummary={missingPrerequisiteSummary}
                        onOpenMissingPrerequisites={() => setIsPrerequisiteDrawerOpen(true)}
                    />

                    <ModList
                        workspace={workspace}
                        hasMods={hasMods}
                        onOpenDetails={() => setIsDetailSheetOpen(true)}
                    />
                </div>
            </div>

            <SelectedModSheet
                workspace={workspace}
                open={isDetailSheetOpen}
                onOpenChange={setIsDetailSheetOpen}
            />
            <Drawer
                open={isPrerequisiteDrawerOpen}
                onOpenChange={setIsPrerequisiteDrawerOpen}
                items={missingLoadedModPrerequisites}
                selectedKeys={localSelectedPrerequisiteKeys}
                installing={isInstallingMissingPrerequisites}
                onToggleKey={onTogglePrerequisiteKey}
                onInstallSelected={() => void handleInstallSelectedPrerequisites()}
            />
        </div>
    )
}

export { Page }
