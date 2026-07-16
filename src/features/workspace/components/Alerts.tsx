import { AlertTriangle } from "lucide-react"

import { useTranslation } from "react-i18next"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { WorkspaceState } from "@/features/workspace/types"
import type { GamePrerequisite } from "@/lib/g2m"

function Alerts({
    workspace,
    hasConflicts,
    hasLinkIssues,
    duplicateAsiPrerequisites,
    missingLoadedModPrerequisitesCount,
    missingPrerequisiteSummary,
    onOpenMissingPrerequisites,
}: {
    workspace: WorkspaceState
    hasConflicts: boolean
    hasLinkIssues: boolean
    duplicateAsiPrerequisites: GamePrerequisite[]
    missingLoadedModPrerequisitesCount: number
    missingPrerequisiteSummary: string
    onOpenMissingPrerequisites: () => void
}) {
    const { t } = useTranslation()
    const activeGame = workspace.activeGame

    if (!activeGame) {
        return null
    }

    return (
        <>
            {hasConflicts && workspace.selectedMod ? (
                <Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex gap-3">
                            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-300" />
                            <div>
                                <AlertTitle>{t("workspacePage.conflictTitle")}</AlertTitle>
                                <AlertDescription>
                                    {t("workspacePage.conflictWarningDescription", {
                                        modName: workspace.selectedMod.name,
                                        count: workspace.selectedMod.conflictFiles.length,
                                    })}
                                </AlertDescription>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="cursor-pointer rounded-xl border-amber-300 bg-white/90 text-amber-900 backdrop-blur hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/15"
                            onClick={workspace.openConflictDialog}
                        >
                            {t("workspacePage.resolveConflict")}
                        </Button>
                    </div>
                </Alert>
            ) : null}

            {duplicateAsiPrerequisites.map((item) => (
                <Alert
                    key={item.key}
                    className="border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100"
                >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex gap-3">
                            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600 dark:text-rose-300" />
                            <div>
                                <AlertTitle>
                                    {t("workspacePage.duplicateAsiAlertTitle", { name: item.label })}
                                </AlertTitle>
                                <AlertDescription>
                                    {t("workspacePage.duplicateAsiAlertDescription", {
                                        path: item.detectedPath ?? "",
                                    })}
                                </AlertDescription>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="cursor-pointer rounded-xl border-rose-300 bg-white/90 text-rose-900 backdrop-blur hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100 dark:hover:bg-rose-500/15"
                            onClick={() => void workspace.resolvePrerequisiteConflict(item.key)}
                        >
                            {t("workspacePage.fixMisplacedPrerequisite")}
                        </Button>
                    </div>
                </Alert>
            ))}

            {hasLinkIssues ? (
                <Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex gap-3">
                            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-300" />
                            <div>
                                <AlertTitle>{t("workspacePage.linkRepairAlertTitle")}</AlertTitle>
                                <AlertDescription>
                                    {t("workspacePage.linkRepairAlertDescription", {
                                        issues: activeGame.linkHealth.issueCount,
                                        missingSources: activeGame.linkHealth.missingSourceCount,
                                        missingTargets: activeGame.linkHealth.missingTargetCount,
                                    })}
                                </AlertDescription>
                            </div>
                        </div>
                        {activeGame.linkHealth.repairableModCount > 0 ? (
                            <Button
                                variant="outline"
                                className="cursor-pointer rounded-xl border-amber-300 bg-white/90 text-amber-900 backdrop-blur hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/15"
                                disabled={workspace.repairingGameLinksId === activeGame.id}
                                onClick={() => void workspace.repairGameSymlinks()}
                            >
                                {t("workspacePage.repairGameLinks")}
                            </Button>
                        ) : null}
                    </div>
                </Alert>
            ) : null}

            {missingLoadedModPrerequisitesCount > 0 ? (
                <Alert className="border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex gap-3">
                            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600 dark:text-rose-300" />
                            <div>
                                <AlertTitle>{t("workspacePage.missingPrerequisitesAlertTitle")}</AlertTitle>
                                <AlertDescription>
                                    {t("workspacePage.missingPrerequisitesAlertDescription", {
                                        items: missingPrerequisiteSummary,
                                    })}
                                </AlertDescription>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="cursor-pointer rounded-xl border-rose-300 bg-white/90 text-rose-900 backdrop-blur hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100 dark:hover:bg-rose-500/15"
                            onClick={onOpenMissingPrerequisites}
                        >
                            {t("workspacePage.openMissingPrerequisitesDrawer")}
                        </Button>
                    </div>
                </Alert>
            ) : null}
        </>
    )
}

export { Alerts }
