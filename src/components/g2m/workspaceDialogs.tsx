import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, CircleHelp, Files, FolderOpen, HardDriveDownload, ImagePlus, MapPinned, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useAppPreferences } from "@/components/app/preferencesProvider"
import { FileMappingModeSwitch } from "@/components/g2m/FileMappingModeSwitch"
import { ModMappingExplorer } from "@/components/g2m/ModMappingExplorer"
import { ModMappingList } from "@/components/g2m/ModMappingList"
import { ModMappingWorkbench } from "@/components/g2m/ModMappingWorkbench"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { UseG2mWorkspaceResult } from "@/hooks/useG2MWorkspace"
import {
  buildMappingTargetNodes,
  formatFileSize,
  inferTargetFolderFromPath,
  normalizeModPath,
  resolveGameImageSrc,
  type GamePrerequisite,
  type ModConflictItem,
  type ModType,
} from "@/lib/g2m"
import {
  DragPayload,
  moveFiles,
} from "@/components/g2m/draggableTree"

type WorkspaceState = UseG2mWorkspaceResult
type MissingPrerequisiteWarning = {
  key: string
  label: string
}

const modalCardClass =
  "rounded-[28px] bg-background/95 shadow-[0_30px_120px_rgba(15,23,42,0.2)] ring-1 ring-black/5 backdrop-blur-2xl dark:bg-[#10131a]/95 dark:shadow-[0_30px_120px_rgba(0,0,0,0.5)] dark:ring-white/10"

const modalSubtleCardClass =
  "rounded-[24px] bg-muted/70 shadow-none ring-1 ring-black/5 dark:bg-white/[0.04] dark:ring-white/10"

const softOutlineButtonClass =
  "cursor-pointer rounded-xl border-border/70 bg-background/70 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"

export const drawerOverlayClass =
  "fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 px-3 pt-10 backdrop-blur-sm sm:px-4"

export const drawerViewportClass = "mx-auto w-full max-w-full lg:w-[1040px]"

export const drawerPanelClass =
  `${modalCardClass} max-h-[calc(100vh-20px)] overflow-hidden rounded-b-none border-b-0`

export const drawerCardContentClass = "flex max-h-[calc(100vh-20px)] flex-col p-0"

export const drawerHandleClass = "px-6 pt-3 lg:px-7"

export const drawerHandleBarClass = "mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-white/15"

export const drawerHeaderClass = "px-6 pb-6 lg:px-7"

export const drawerBodyClass = "flex-1 overflow-y-auto px-6 pb-4 lg:px-7"

export const drawerFooterClass =
  "border-t border-border/60 bg-background/90 px-6 py-4 backdrop-blur dark:border-white/10 dark:bg-[#10131a]/90 lg:px-7"



function WorkspaceDialogs({ workspace }: { workspace: WorkspaceState }) {
  return (
    <>
      <AddGameDialog workspace={workspace} />
      <ConflictDialog workspace={workspace} />
      <DeleteModDialog workspace={workspace} />
      <EditGameDialog workspace={workspace} />
      <ImportModDialog workspace={workspace} />
      <DeleteGameDialog workspace={workspace} />
    </>
  )
}

function ConflictDialog({ workspace }: { workspace: WorkspaceState }) {
  const { t } = useTranslation()
  if (!workspace.isConflictDialogOpen) {
    return null
  }

  const selectedMod = workspace.selectedMod
  if (!selectedMod) {
    return null
  }

  return (
    <div className={drawerOverlayClass}>
      <div className={drawerViewportClass}>
        <Card className={drawerPanelClass}>
          <CardContent className={drawerCardContentClass}>
            <div className={drawerHandleClass}>
              <div className={drawerHandleBarClass} />
            </div>

            <div className={drawerHeaderClass}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="secondary" className="rounded-full bg-amber-100 px-3 py-1 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">{t("workspaceDialogs.conflictBadge")}</Badge>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                    {t("workspaceDialogs.conflictTitle", { name: selectedMod.name })}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {t("workspaceDialogs.conflictDescription")}
                  </p>
                </div>

                <Button
                  variant="outline"
                  className={softOutlineButtonClass}
                  onClick={workspace.closeConflictDialog}
                >
                  {t("workspaceDialogs.cancel")}
                </Button>
              </div>
            </div>

            <div className={drawerBodyClass}>
              {selectedMod.conflictFiles.length > 0 ? (
                <div className="space-y-3">
                  {selectedMod.conflictFiles.map((conflict) => (
                    <Card
                      key={`${selectedMod.id}-${conflict.id}-dialog`}
                      className={modalSubtleCardClass}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{conflict.fileName}</p>
                              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                {t("workspaceDialogs.sameTargetFile", { otherModName: conflict.otherModName })}
                              </p>
                            </div>

                            <div className="grid gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
                                <span className="font-medium text-slate-700 dark:text-slate-200">{t("workspaceDialogs.targetPath")}</span>
                                <p className="mt-1 break-all">{conflict.targetPath}</p>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
                                <span className="font-medium text-slate-700 dark:text-slate-200">{t("workspaceDialogs.currentModSource")}</span>
                                <p className="mt-1 break-all">{conflict.sourcePath}</p>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
                                <span className="font-medium text-slate-700 dark:text-slate-200">{t("workspaceDialogs.otherModSource")}</span>
                                <p className="mt-1 break-all">{conflict.otherSourcePath}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant={
                                workspace.getConflictDecision(selectedMod.id, conflict.id) === "overwrite"
                                  ? "default"
                                  : "outline"
                              }
                              className={softOutlineButtonClass}
                              onClick={() =>
                                workspace.resolveConflict(selectedMod.id, conflict.id, "overwrite")
                              }
                            >
                              {t("workspaceDialogs.overwrite")}
                            </Button>
                            <Button
                              size="sm"
                              variant={
                                workspace.getConflictDecision(selectedMod.id, conflict.id) === "skip"
                                  ? "secondary"
                                  : "outline"
                              }
                              className={softOutlineButtonClass}
                              onClick={() =>
                                workspace.resolveConflict(selectedMod.id, conflict.id, "skip")
                              }
                            >
                              {t("workspaceDialogs.skip")}
                            </Button>
                            <ConflictDecisionBadge
                              decision={workspace.getConflictDecision(selectedMod.id, conflict.id)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                    <div>
                      <AlertTitle>{t("workspaceDialogs.noPendingConflictsTitle")}</AlertTitle>
                      <AlertDescription>
                        {t("workspaceDialogs.noPendingConflictsDescription")}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              )}
            </div>

            <div className={drawerFooterClass}>
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  variant="outline"
                  className={`px-4 ${softOutlineButtonClass}`}
                  onClick={workspace.closeConflictDialog}
                >
                  {t("workspaceDialogs.later")}
                </Button>
                <Button className="cursor-pointer rounded-xl px-4 shadow-sm" onClick={workspace.closeConflictDialog}>
                  {t("workspaceDialogs.finish")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AddGameDialog({ workspace }: { workspace: WorkspaceState }) {
  const { t } = useTranslation()
  if (!workspace.isAddGameDialogOpen) {
    return null
  }

  const hasDirectory = Boolean(workspace.addGameForm.dir.trim())
  const hasDetectedType = Boolean(workspace.addGameForm.type)
  const hasAutoDetectedGame = Boolean(
    workspace.addGameForm.isExeAutoDetected && workspace.addGameForm.exeName.trim(),
  )
  const usingCustomCover = !workspace.addGameForm.useDefaultImage && Boolean(workspace.addGameForm.imagePath)

  return (
    <div className={drawerOverlayClass}>
      <div className={drawerViewportClass}>
        <Card className={drawerPanelClass}>
          <CardContent className={drawerCardContentClass}>
            <div className={drawerHandleClass}>
              <div className={drawerHandleBarClass} />
            </div>

            <div className={drawerHeaderClass}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="secondary" className="rounded-full bg-violet-100 px-3 py-1 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                    {t("workspaceDialogs.addBadge")}
                  </Badge>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                    {t("workspaceDialogs.addTitle")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {t("workspaceDialogs.addDescription")}
                  </p>
                </div>

                <Button
                  variant="outline"
                  className={softOutlineButtonClass}
                  onClick={workspace.closeAddGameDialog}
                >
                  {t("workspaceDialogs.cancel")}
                </Button>
              </div>
            </div>

            <div className={drawerBodyClass}>
              <div className="mt-0">
                <FieldBlock label={t("workspaceDialogs.gameDirectory")}>
                  <div className="flex gap-3">
                    <Input
                      value={workspace.addGameForm.dir}
                      readOnly
                      placeholder={t("workspaceDialogs.gameDirectoryPlaceholder")}
                      className="h-12 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                    />
                    <Button
                      variant="outline"
                      className={`h-12 rounded-2xl px-4 ${softOutlineButtonClass}`}
                      onClick={() => void workspace.pickGameDirectory()}
                      disabled={workspace.isDetectingGame}
                    >
                      <MapPinned className="size-4" />
                      {workspace.isDetectingGame ? t("workspaceDialogs.detecting") : t("workspaceDialogs.selectDirectory")}
                    </Button>
                  </div>
                </FieldBlock>
              </div>

              {(hasDirectory || hasDetectedType) && (
                <Alert className="mt-5 rounded-2xl border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <AlertTitle className="text-emerald-900 dark:text-emerald-100">
                    {hasAutoDetectedGame
                      ? t("workspaceDialogs.directoryDetected")
                      : hasDetectedType
                        ? t("workspaceDialogs.gameTypeSelected")
                        : t("workspaceDialogs.directorySelected")}
                  </AlertTitle>
                  <AlertDescription className="text-emerald-800/90 dark:text-emerald-200/90">
                    {hasAutoDetectedGame
                      ? t("workspaceDialogs.detectedSummary", {
                          gameName: workspace.addGameForm.name || t("workspaceActions.currentGame"),
                          gameType: getGameTypeLabel(workspace.addGameForm.type, t),
                          exeName: workspace.addGameForm.exeName || t("workspaceDialogs.detectedExe"),
                        })
                      : hasDetectedType
                        ? t("workspaceDialogs.manualTypeSummary", {
                            gameType: getGameTypeLabel(workspace.addGameForm.type, t),
                          })
                      : t("workspaceDialogs.directoryWaitingDetection")}
                  </AlertDescription>
                </Alert>
              )}

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <FieldBlock label={t("workspaceDialogs.gameName")}>
                  <Input
                    value={workspace.addGameForm.name}
                    onChange={(event) => workspace.setAddGameForm({ name: event.currentTarget.value })}
                    placeholder={t("workspaceDialogs.gameNamePlaceholder")}
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </FieldBlock>

                <FieldBlock label={t("workspaceDialogs.gameType")}>
                  <GameTypeSelectField
                    value={workspace.addGameForm.type}
                    onValueChange={(value) => workspace.setAddGameForm({ type: value })}
                    placeholder={t("workspaceDialogs.chooseType")}
                    t={t}
                  />
                </FieldBlock>

                <FieldBlock label={t("workspaceDialogs.version")} optionalLabel={t("workspaceDialogs.optional")} optional>
                  <Input
                    value={workspace.addGameForm.version}
                    onChange={(event) => workspace.setAddGameForm({ version: event.currentTarget.value })}
                    placeholder={t("workspaceDialogs.versionPlaceholder")}
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </FieldBlock>

                <FieldBlock label={t("workspaceDialogs.detectedExe")}>
                  <ExecutableField
                    value={workspace.addGameForm.exeName}
                    placeholder={t("workspaceDialogs.notDetectedYet")}
                    actionLabel={t("workspaceDialogs.selectExecutable")}
                    onChange={(value) =>
                      workspace.setAddGameForm({ exeName: value, isExeAutoDetected: false })
                    }
                    onSelect={() => void workspace.pickAddGameExecutable()}
                  />
                </FieldBlock>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <GameCoverPreview
                  title={workspace.addGameForm.name || t("workspaceDialogs.defaultCover")}
                  imageSrc={resolveGameImageSrc(workspace.addGameForm.imagePath, workspace.addGameForm.type)}
                />
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className={softOutlineButtonClass}
                      onClick={() => void workspace.pickAddGameImage()}
                    >
                      <ImagePlus className="size-4" />
                      {t("workspaceDialogs.selectLocalImage")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={softOutlineButtonClass}
                      onClick={workspace.resetAddGameImage}
                    >
                      <RotateCcw className="size-4" />
                      {t("workspaceDialogs.useDefaultCover")}
                    </Button>
                  </div>
                  <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {t("workspaceDialogs.coverDescription")}
                  </p>
                  <p className="break-all rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-xs text-slate-500 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                    {usingCustomCover ? workspace.addGameForm.imagePath : t("workspaceDialogs.usingDefaultCover")}
                  </p>
                </div>
              </div>

              <DialogTipsSection className="mt-6 pb-2">
                <DialogTipCard title={t("workspaceDialogs.detectionRulesTitle")} icon={<CircleHelp className="size-4 text-violet-600" />}>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <DetectionRule gameType={t("workspaceDialogs.gameTypeIii")} exeName="gta3.exe" />
                    <DetectionRule gameType={t("workspaceDialogs.gameTypeVc")} exeName="gta-vc.exe / gta_vc.exe" />
                    <DetectionRule gameType={t("workspaceDialogs.gameTypeSa")} exeName="gta_sa.exe / gta-sa.exe" />
                  </div>
                </DialogTipCard>

                <DialogTipCard title={t("workspaceDialogs.currentStatusTitle")}>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <p>{t("workspaceDialogs.directoryStatus")}：{hasDirectory ? t("workspaceDialogs.selected") : t("workspaceDialogs.notSelected")}</p>
                    <p>{t("workspaceDialogs.typeStatus")}：{hasDetectedType ? getGameTypeLabel(workspace.addGameForm.type, t) : t("workspaceDialogs.notDetected")}</p>
                    <p>{t("workspaceDialogs.coverStatus")}：{usingCustomCover ? t("workspaceDialogs.customImage") : t("workspaceDialogs.defaultCover")}</p>
                  </div>
                </DialogTipCard>

                <DialogTipCard title={t("workspaceDialogs.actionTipsTitle")} icon={<CircleHelp className="size-4 text-violet-600" />}>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <p>{t("workspaceDialogs.step1")}</p>
                    <p>{t("workspaceDialogs.step2")}</p>
                    <p>{t("workspaceDialogs.step3")}</p>
                  </div>
                </DialogTipCard>
              </DialogTipsSection>
            </div>

            <div className={drawerFooterClass}>
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  variant="outline"
                  className={`px-4 ${softOutlineButtonClass}`}
                  onClick={workspace.closeAddGameDialog}
                >
                  {t("workspaceDialogs.later")}
                </Button>
                <Button
                  className="cursor-pointer rounded-xl px-4 shadow-sm"
                  onClick={() => void workspace.confirmAddGame()}
                  disabled={workspace.savingGameId === "add-game" || !workspace.addGameForm.dir}
                >
                  <Plus className="size-4" />
                  {workspace.savingGameId === "add-game" ? t("workspaceDialogs.adding") : t("workspaceDialogs.confirmAddGame")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function EditGameDialog({ workspace }: { workspace: WorkspaceState }) {
  const { t } = useTranslation()
  if (!workspace.isEditGameDialogOpen) {
    return null
  }

  return (
    <div className={drawerOverlayClass}>
      <div className={drawerViewportClass}>
        <Card className={drawerPanelClass}>
          <CardContent className={drawerCardContentClass}>
            <div className={drawerHandleClass}>
              <div className={drawerHandleBarClass} />
            </div>

            <div className={drawerHeaderClass}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="secondary" className="rounded-full bg-violet-100 px-3 py-1 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                    {t("workspaceDialogs.editBadge")}
                  </Badge>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                    {t("workspaceDialogs.editTitle")}
                  </h2>
                </div>

                <Button
                  variant="outline"
                  className={softOutlineButtonClass}
                  onClick={workspace.closeEditGameDialog}
                >
                  {t("workspaceDialogs.cancel")}
                </Button>
              </div>
            </div>

            <div className={drawerBodyClass}>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldBlock label={t("workspaceDialogs.gameName")}>
                  <Input
                    value={workspace.editGameForm.name}
                    onChange={(event) => workspace.setEditGameForm({ name: event.currentTarget.value })}
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </FieldBlock>

                <FieldBlock label={t("workspaceDialogs.gameType")}>
                  <GameTypeSelectField
                    value={workspace.editGameForm.type}
                    onValueChange={(value) => workspace.setEditGameForm({ type: value })}
                    placeholder={t("workspaceDialogs.chooseType")}
                    t={t}
                  />
                </FieldBlock>

                <FieldBlock label={t("workspaceDialogs.gameDirectory")} className="md:col-span-2">
                  <Input
                    value={workspace.editGameForm.dir}
                    readOnly
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </FieldBlock>

                <FieldBlock label={t("workspaceDialogs.version")} optionalLabel={t("workspaceDialogs.optional")} optional>
                  <Input
                    value={workspace.editGameForm.version}
                    onChange={(event) => workspace.setEditGameForm({ version: event.currentTarget.value })}
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </FieldBlock>

                <FieldBlock label={t("workspaceDialogs.detectedExe")}>
                  <ExecutableField
                    value={workspace.editGameForm.exeName}
                    placeholder={t("workspaceDialogs.notDetectedYet")}
                    actionLabel={t("workspaceDialogs.selectExecutable")}
                    onChange={(value) =>
                      workspace.setEditGameForm({ exeName: value, isExeAutoDetected: false })
                    }
                    onSelect={() => void workspace.pickEditGameExecutable()}
                  />
                </FieldBlock>

                <FieldBlock label={t("workspaceDialogs.gameCover")} className="md:col-span-2">
                  <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <GameCoverPreview
                      title={workspace.editGameForm.name || t("workspaceDialogs.currentCover")}
                      imageSrc={resolveGameImageSrc(workspace.editGameForm.imagePath, workspace.editGameForm.type)}
                    />
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          className={softOutlineButtonClass}
                          onClick={() => void workspace.pickEditGameImage()}
                        >
                          <ImagePlus className="size-4" />
                          {t("workspaceDialogs.reselectImage")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className={softOutlineButtonClass}
                          onClick={workspace.resetEditGameImage}
                        >
                          <RotateCcw className="size-4" />
                          {t("workspaceDialogs.restoreDefaultCover")}
                        </Button>
                      </div>
                      <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {t("workspaceDialogs.coverDescription")}
                      </p>
                    </div>
                  </div>
                </FieldBlock>
              </div>

              <DialogTipsSection className="mt-6 pb-2">
                <DialogTipCard title={t("workspaceDialogs.editTipTitle")}>
                  <div className="space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    <p>{t("workspaceDialogs.editTip1")}</p>
                    <p>{t("workspaceDialogs.editTip2")}</p>
                  </div>
                </DialogTipCard>
              </DialogTipsSection>
            </div>

            <div className={drawerFooterClass}>
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  variant="outline"
                  className={`px-4 ${softOutlineButtonClass}`}
                  onClick={workspace.closeEditGameDialog}
                >
                  {t("workspaceDialogs.later")}
                </Button>
                <Button
                  className="cursor-pointer rounded-xl px-4 shadow-sm"
                  onClick={() => void workspace.confirmEditGame()}
                  disabled={workspace.savingGameId === workspace.editGameForm.id}
                >
                  <Pencil className="size-4" />
                  {workspace.savingGameId === workspace.editGameForm.id ? t("workspaceDialogs.saving") : t("workspaceDialogs.saveChanges")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ImportModDialog({ workspace }: { workspace: WorkspaceState }) {
  const { t } = useTranslation()
  const { builderMappingMode, setBuilderMappingMode } = useAppPreferences()
  const importFiles = workspace.importModMappings
  const importGameTargetNodes = buildMappingTargetNodes(importFiles)
  const [expandedConflictGroups, setExpandedConflictGroups] = useState<Record<string, boolean>>({})

  if (!workspace.isImportModDialogOpen) {
    return null
  }

  const hasDirectory = Boolean(workspace.importModForm.dir.trim())
  const preview = workspace.importModPreview
  const hasPreview = Boolean(preview)
  const hasConflicts = (preview?.conflictFiles.length ?? 0) > 0
  const conflictTree = buildImportConflictTree(preview?.conflictFiles ?? [])
  const activeGameName = workspace.activeGame?.name || t("workspaceActions.currentGame")
  const missingPrerequisites =
    preview && workspace.activeGame
      ? getMissingPrerequisiteWarnings(preview.modType, workspace.activeGame.prerequisites)
      : []

  function handleResetMappings() {
    workspace.setImportModMappings(preview?.files ?? [])
  }

  function handleDropToFolder(destinationFolder: string, payload: DragPayload) {
    const nextMappings = moveFiles(workspace.importModMappings, payload, destinationFolder)
    workspace.setImportModMappings(nextMappings)
  }

  function handleUpdateTargetPath(path: string, newTargetPath: string) {
    const key = normalizeModPath(path)
    if (!key) {
      return
    }

    workspace.setImportModMappings(
      importFiles.map((file) => {
        const fileKey = normalizeModPath(file.relativePath)

        if (fileKey === key) {
          return {
            ...file,
            targetPath: newTargetPath,
            targetFolder: inferTargetFolderFromPath(newTargetPath),
            skipInstall: !newTargetPath.trim(),
          }
        }

        if (fileKey && fileKey.startsWith(`${key}/`)) {
          const suffix = fileKey.slice(key.length).replace(/^\/+/, "")
          const nextTargetPath = newTargetPath ? `${newTargetPath}/${suffix}` : ""

          return {
            ...file,
            targetPath: nextTargetPath,
            targetFolder: inferTargetFolderFromPath(nextTargetPath),
            skipInstall: !nextTargetPath.trim(),
          }
        }

        return file
      }),
    )
  }

  return (
    <div className={drawerOverlayClass}>
      <div className={drawerViewportClass}>
        <Card className={drawerPanelClass}>
          <CardContent className={drawerCardContentClass}>
            <div className={drawerHandleClass}>
              <div className={drawerHandleBarClass} />
            </div>

            <div className={drawerHeaderClass}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="secondary" className="rounded-full bg-violet-100 px-3 py-1 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                    {t("workspaceDialogs.importBadge")}
                  </Badge>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                    {t("workspaceDialogs.importTitle")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {t("workspaceDialogs.importDescription")}
                  </p>
                </div>

                <Button
                  variant="outline"
                  className={softOutlineButtonClass}
                  onClick={workspace.closeImportModDialog}
                >
                  {t("workspaceDialogs.cancel")}
                </Button>
              </div>
            </div>

            <div className={drawerBodyClass}>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldBlock label={t("workspaceDialogs.importSource")} className="md:col-span-2">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-3">
                      <Input
                        value={workspace.importModForm.dir}
                        readOnly
                        placeholder={t("workspaceDialogs.importDirectoryPlaceholder")}
                        className="h-12 min-w-[260px] flex-1 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                      />
                      <Button
                        variant="outline"
                        className={`h-12 rounded-2xl px-4 ${softOutlineButtonClass}`}
                        onClick={() => void workspace.pickImportModSource("directory")}
                        disabled={workspace.isImportingMod || workspace.isPreviewingMod}
                      >
                        <MapPinned className="size-4" />
                        {t("workspaceDialogs.importSourceDirectory")}
                      </Button>
                      <Button
                        variant="outline"
                        className={`h-12 rounded-2xl px-4 ${softOutlineButtonClass}`}
                        onClick={() => void workspace.pickImportModSource("zip")}
                        disabled={workspace.isImportingMod || workspace.isPreviewingMod}
                      >
                        <HardDriveDownload className="size-4" />
                        {t("workspaceDialogs.importSourceZip")}
                      </Button>
                    </div>
                  </div>
                </FieldBlock>

                <FieldBlock label={t("workspaceDialogs.modName")}>
                  <Input
                    value={workspace.importModForm.name}
                    onChange={(event) => workspace.setImportModName(event.currentTarget.value)}
                    placeholder={t("workspaceDialogs.notSelected")}
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </FieldBlock>

                <FieldBlock label={t("workspaceDialogs.selectedGame")}>
                  <Input
                    value={activeGameName}
                    readOnly
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </FieldBlock>
              </div>

              {!hasDirectory ? (
                <Alert className="mt-5 rounded-2xl border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.04]">
                  <CircleHelp className="size-4 text-slate-600 dark:text-slate-300" />
                  <AlertTitle className="text-slate-900 dark:text-slate-100">
                    {t("workspaceDialogs.directoryStatus")}
                  </AlertTitle>
                  <AlertDescription className="text-slate-700/90 dark:text-slate-300/90">
                    {t("workspaceDialogs.importWaitingSelection")}
                  </AlertDescription>
                </Alert>
              ) : workspace.isPreviewingMod ? (
                <Alert className="mt-5 rounded-2xl border-sky-200 bg-sky-50/80 dark:border-sky-500/20 dark:bg-sky-500/10">
                  <CircleHelp className="size-4 text-sky-600 dark:text-sky-300" />
                  <AlertTitle className="text-sky-900 dark:text-sky-100">
                    {t("workspaceActions.previewingMod")}
                  </AlertTitle>
                  <AlertDescription className="text-sky-800/90 dark:text-sky-200/90">
                    {workspace.importModForm.dir}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert
                  className={`mt-5 rounded-2xl ${
                    hasConflicts
                      ? "border-amber-200 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10"
                      : "border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                  }`}
                >
                  {hasConflicts ? (
                    <AlertTriangle className="size-4 text-amber-600 dark:text-amber-300" />
                  ) : (
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <AlertTitle
                    className={
                      hasConflicts
                        ? "text-amber-900 dark:text-amber-100"
                        : "text-emerald-900 dark:text-emerald-100"
                    }
                  >
                    {hasPreview ? t("workspaceActions.modPreviewReady") : t("workspaceDialogs.importDetected")}
                  </AlertTitle>
                  <AlertDescription
                    className={
                      hasConflicts
                        ? "text-amber-800/90 dark:text-amber-200/90"
                        : "text-emerald-800/90 dark:text-emerald-200/90"
                    }
                  >
                    {hasPreview
                      ? hasConflicts
                        ? t("workspacePage.conflictWarningDescription", {modName: preview?.name || workspace.importModForm.name, count: preview?.conflictFiles.length ?? 0})
                        : t("workspaceDialogs.noPendingConflictsDescription")
                      : workspace.importModForm.dir}
                  </AlertDescription>
                </Alert>
              )}

              {missingPrerequisites.length > 0 ? (
                <Alert className="mt-4 rounded-2xl border-amber-200 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10">
                  <AlertTriangle className="size-4 text-amber-600 dark:text-amber-300" />
                  <AlertTitle className="text-amber-900 dark:text-amber-100">
                    {t("workspaceDialogs.prerequisiteWarningsTitle")}
                  </AlertTitle>
                  <AlertDescription className="text-amber-800/90 dark:text-amber-200/90">
                    {t("workspaceDialogs.prerequisiteWarningsDescription", {
                      modType: preview?.modType ?? t("workspaceDialogs.notDetected"),
                      items: missingPrerequisites.map((item) => item.label).join(" / "),
                    })}
                  </AlertDescription>
                </Alert>
              ) : null}

              {hasPreview && preview ? (
                <>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <PreviewMetricCard
                      icon={<CircleHelp className="size-4 text-violet-600" />}
                      label={t("workspaceDialogs.typeStatus")}
                      value={preview.modType}
                    />
                    <PreviewMetricCard
                      icon={<Files className="size-4 text-violet-600" />}
                      label={t("workspacePage.fileCount")}
                      value={String(preview.fileCount)}
                    />
                    <PreviewMetricCard
                      icon={<HardDriveDownload className="size-4 text-violet-600" />}
                      label={t("workspacePage.size")}
                      value={formatFileSize(preview.sizeBytes)}
                    />
                    <PreviewMetricCard
                      icon={<AlertTriangle className="size-4 text-violet-600" />}
                      label={t("workspacePage.conflictFiles")}
                      value={String(preview.conflictFiles.length)}
                      tone={hasConflicts ? "warning" : "default"}
                    />
                    <PreviewMetricCard
                      icon={<Files className="size-4 text-violet-600" />}
                      label={t("workspaceDialogs.manifestStatus")}
                      value={preview.hasG2mManifest ? t("workspaceDialogs.manifestDetected") : t("workspaceDialogs.manifestMissing")}
                      tone={preview.hasG2mManifest ? "success" : "default"}
                    />
                  </div>

                  <DialogTipCard title={t("workspacePage.filePreview")} className="mt-4">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="rounded-full bg-slate-950 px-3 py-1 text-white dark:bg-white dark:text-slate-950">
                          {preview.name || workspace.importModForm.name || t("workspaceDialogs.modName")}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="rounded-full bg-background/80 px-3 py-1 text-slate-700 dark:bg-white/10 dark:text-slate-200"
                          >
                            {preview.modType}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="rounded-full bg-background/80 px-3 py-1 text-slate-700 dark:bg-white/10 dark:text-slate-200"
                          >
                            {workspace.importModForm.sourceType === "zip"
                              ? t("workspaceDialogs.importSourceZip")
                              : t("workspaceDialogs.importSourceDirectory")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <FileMappingModeSwitch
                            t={t}
                            mode={builderMappingMode}
                            onChange={setBuilderMappingMode}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg"
                            onClick={handleResetMappings}
                          >
                            <RotateCcw className="mr-1.5 size-3" />
                            {t("builderPage.resetMappings")}
                          </Button>
                        </div>
                      </div>

                      {builderMappingMode === "list" ? (
                        <ModMappingList
                          t={t}
                          gameTargetNodes={importGameTargetNodes}
                          gameTargetsByPath={{}}
                          updateTargetPath={handleUpdateTargetPath}
                          showGameTargets={false}
                        />
                      ) : builderMappingMode === "tree" ? (
                        <ModMappingWorkbench
                          t={t}
                          files={importFiles}
                          headerTitle={t("workspacePage.filePreview")}
                          headerDescription={t("workspaceDialogs.folderMappingHint")}
                          initialTargetFolders={preview.targetFolders}
                          targetDescription={t("workspaceDialogs.folderMappingHint")}
                          summaryDescription={t("workspaceDialogs.folderMappingHint")}
                          onDropToFolder={handleDropToFolder}
                          onResetMappings={handleResetMappings}
                          emptyTargetLabel={t("demo.targetPending")}
                        />
                      ) : (
                        <ModMappingExplorer
                          t={t}
                          files={importFiles}
                          onDropToFolder={handleDropToFolder}
                        />
                      )}
                    </div>
                  </DialogTipCard>

                  {hasConflicts ? (
                    <DialogTipCard title={t("workspacePage.conflictSummary")} icon={<AlertTriangle className="size-4 text-amber-500" />} className="mt-4">
                      <div className="space-y-3">
                        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {t("workspaceDialogs.importConflictHelp")}
                        </p>
                        <p className="rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                          {t("workspaceDialogs.importConflictBackupNotice")}
                        </p>
                        {conflictTree.map((node) => (
                          <ImportConflictTreeNode
                            key={`import-conflict-${node.id}`}
                            node={node}
                            workspace={workspace}
                            expandedNodes={expandedConflictGroups}
                            setExpandedNodes={setExpandedConflictGroups}
                          />
                        ))}
                      </div>
                    </DialogTipCard>
                  ) : null}
                </>
              ) : null}

              <DialogTipsSection className="mt-6 pb-2">
                <DialogTipCard title={t("workspaceDialogs.currentStatusTitle")}>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <p>{t("workspaceDialogs.importSource")}：{hasDirectory ? t("workspaceDialogs.selected") : t("workspaceDialogs.notSelected")}</p>
                    <p>
                      {t("workspaceDialogs.typeStatus")}：
                      {workspace.importModForm.sourceType === "zip"
                        ? t("workspaceDialogs.importSourceZip")
                        : t("workspaceDialogs.importSourceDirectory")}
                    </p>
                    <p>{t("workspaceDialogs.modName")}：{workspace.importModForm.name || t("workspaceDialogs.notSelected")}</p>
                    <p>{t("workspaceDialogs.selectedGame")}：{activeGameName}</p>
                    <p>
                      {t("workspaceDialogs.manifestStatus")}：
                      {hasPreview && preview
                        ? preview.hasG2mManifest
                          ? t("workspaceDialogs.manifestDetected")
                          : t("workspaceDialogs.manifestMissing")
                        : t("workspaceDialogs.notDetectedYet")}
                    </p>
                    <p>
                      {t("workspacePage.filePreview")}：
                      {workspace.isPreviewingMod
                        ? t("workspaceActions.previewingMod")
                        : hasPreview
                          ? t("workspaceActions.modPreviewReady")
                          : t("demo.pendingScan")}
                    </p>
                  </div>
                </DialogTipCard>

                <DialogTipCard title={t("workspaceDialogs.importTipTitle")} icon={<CircleHelp className="size-4 text-violet-600" />}>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <p>{t("workspaceDialogs.importStep1")}</p>
                    <p>{t("workspaceDialogs.importStep2")}</p>
                    <p>{t("workspaceDialogs.importStep3")}</p>
                  </div>
                </DialogTipCard>

                <DialogTipCard title={t("workspaceDialogs.actionTipsTitle")}>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <p>{t("workspaceDialogs.importDescription")}</p>
                  </div>
                </DialogTipCard>
              </DialogTipsSection>
            </div>

            <div className={drawerFooterClass}>
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  variant="outline"
                  className={`px-4 ${softOutlineButtonClass}`}
                  onClick={workspace.closeImportModDialog}
                >
                  {t("workspaceDialogs.later")}
                </Button>
                <Button
                  className="cursor-pointer rounded-xl px-4 shadow-sm"
                  onClick={() => void workspace.confirmImportMod()}
                  disabled={workspace.isImportingMod || workspace.isPreviewingMod || !hasPreview}
                >
                  <HardDriveDownload className="size-4" />
                  {workspace.isImportingMod ? t("workspaceDialogs.importing") : t("workspaceDialogs.confirmImportMod")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

type ImportConflictFileNode = {
  conflicts: ModConflictItem[]
  id: string
  kind: "file"
  name: string
  targetPath: string
}

type ImportConflictFolderNode = {
  children: ImportConflictNode[]
  id: string
  kind: "folder"
  name: string
  path: string
  targetPaths: string[]
}

type ImportConflictNode = ImportConflictFileNode | ImportConflictFolderNode

type ImportConflictTreeBuilder = {
  files: Map<string, ModConflictItem[]>
  folders: Map<string, ImportConflictTreeBuilder>
  id: string
  name: string
  path: string
}

function normalizeImportConflictTargetPath(targetPath: string): string {
  return targetPath.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")
}

function buildImportConflictTree(conflicts: ModConflictItem[]): ImportConflictNode[] {
  const root = createImportConflictTreeBuilder("", "")

  for (const conflict of conflicts) {
    const normalizedTargetPath = normalizeImportConflictTargetPath(conflict.targetPath)
    const segments = normalizedTargetPath.split("/").filter(Boolean)

    if (segments.length === 0) {
      const rootFilePath = normalizedTargetPath || conflict.fileName
      const relatedConflicts = root.files.get(rootFilePath) ?? []
      relatedConflicts.push(conflict)
      root.files.set(rootFilePath, relatedConflicts)
      continue
    }

    let current = root
    let currentPath = ""

    for (const segment of segments.slice(0, -1)) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment
      const nextFolder =
        current.folders.get(segment) ?? createImportConflictTreeBuilder(segment, currentPath)
      current.folders.set(segment, nextFolder)
      current = nextFolder
    }

    const filePath = normalizedTargetPath
    const relatedConflicts = current.files.get(filePath) ?? []
    relatedConflicts.push(conflict)
    current.files.set(filePath, relatedConflicts)
  }

  return buildImportConflictTreeNodes(root)
}

function createImportConflictTreeBuilder(
  name: string,
  path: string,
): ImportConflictTreeBuilder {
  return {
    id: path || "__root__",
    name,
    path,
    folders: new Map<string, ImportConflictTreeBuilder>(),
    files: new Map<string, ModConflictItem[]>(),
  }
}

function buildImportConflictTreeNodes(
  builder: ImportConflictTreeBuilder,
): ImportConflictNode[] {
  const folderNodes = Array.from(builder.folders.values())
    .map((folder) => {
      const children = buildImportConflictTreeNodes(folder)
      return {
        id: `folder:${folder.id}`,
        kind: "folder",
        name: folder.name,
        path: folder.path,
        targetPaths: collectImportConflictTargetPaths(children),
        children,
      } satisfies ImportConflictFolderNode
    })
    .sort((left, right) => left.path.localeCompare(right.path))

  const fileNodes = Array.from(builder.files.entries())
    .map(([targetPath, groupConflicts]) => ({
      id: `file:${targetPath}`,
      kind: "file",
      name: groupConflicts[0]?.fileName || targetPath.split("/").pop() || targetPath,
      targetPath,
      conflicts: groupConflicts,
    }) satisfies ImportConflictFileNode)
    .sort((left, right) => left.targetPath.localeCompare(right.targetPath))

  return [...folderNodes, ...fileNodes]
}

function collectImportConflictTargetPaths(nodes: ImportConflictNode[]): string[] {
  return nodes.flatMap((node) =>
    node.kind === "folder" ? node.targetPaths : [node.targetPath],
  )
}

function getImportConflictNodeDecision(
  node: ImportConflictNode,
  workspace: WorkspaceState,
): ReturnType<WorkspaceState["getImportConflictDecision"]> {
  const decisions = Array.from(
    new Set(
      collectImportConflictTargetPaths([node]).map((targetPath) =>
        workspace.getImportConflictDecision(targetPath),
      ),
    ),
  ).filter(Boolean)

  return decisions.length === 1 ? decisions[0] ?? null : null
}

function resolveImportConflictNodeDecision(
  node: ImportConflictNode,
  workspace: WorkspaceState,
  decision: "overwrite" | "skip",
) {
  const targetPaths = collectImportConflictTargetPaths([node])
  if (targetPaths.length > 1) {
    workspace.resolveImportConflicts(targetPaths, decision)
    return
  }

  const targetPath = targetPaths[0]
  if (!targetPath) {
    return
  }

  workspace.resolveImportConflict(targetPath, decision)
}

function ImportConflictTreeNode({
  node,
  workspace,
  expandedNodes,
  setExpandedNodes,
  depth = 0,
}: {
  node: ImportConflictNode
  workspace: WorkspaceState
  expandedNodes: Record<string, boolean>
  setExpandedNodes: Dispatch<SetStateAction<Record<string, boolean>>>
  depth?: number
}) {
  const { t } = useTranslation()
  const decision = getImportConflictNodeDecision(node, workspace)
  const isExpanded = node.kind === "folder" ? Boolean(expandedNodes[node.id]) : true
  const targetPaths = collectImportConflictTargetPaths([node])

  return (
    <div className={depth > 0 ? "pl-4" : undefined}>
      <Card
        className={
          depth === 0
            ? "rounded-[20px] border-amber-200 bg-amber-50/60 shadow-none dark:border-amber-500/20 dark:bg-amber-500/10"
            : "rounded-[18px] border border-black/5 bg-white/70 shadow-none dark:border-white/10 dark:bg-white/[0.04]"
        }
      >
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                {node.kind === "folder" ? (
                  <FolderOpen className="size-4 text-amber-700 dark:text-amber-200" />
                ) : (
                  <Files className="size-4 text-amber-700 dark:text-amber-200" />
                )}
                <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                  {node.kind === "folder"
                    ? node.name || t("workspaceDialogs.installToRoot")
                    : node.name}
                </p>
                <Badge
                  variant="secondary"
                  className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
                >
                  {targetPaths.length}
                </Badge>
              </div>
              <div className="rounded-2xl border border-amber-200/70 bg-white/80 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-white/5 dark:text-amber-100">
                <span className="font-medium">
                  {node.kind === "folder"
                    ? t("workspacePage.directory")
                    : t("workspaceDialogs.targetPath")}
                </span>
                <p className="mt-1 break-all">
                  {node.kind === "folder"
                    ? node.path || t("workspaceDialogs.installToRoot")
                    : node.targetPath}
                </p>
              </div>
            </div>

            {node.kind === "folder" ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={softOutlineButtonClass}
                onClick={() =>
                  setExpandedNodes((current) => ({
                    ...current,
                    [node.id]: !current[node.id],
                  }))
                }
              >
                {isExpanded
                  ? t("builderPage.hideDetailedMappings")
                  : t("builderPage.showDetailedMappings")}
                {isExpanded ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={decision === "overwrite" ? "default" : "outline"}
              className={softOutlineButtonClass}
              onClick={() => resolveImportConflictNodeDecision(node, workspace, "overwrite")}
            >
              {t("workspaceDialogs.overwrite")}
            </Button>
            <Button
              size="sm"
              variant={decision === "skip" ? "secondary" : "outline"}
              className={softOutlineButtonClass}
              onClick={() => resolveImportConflictNodeDecision(node, workspace, "skip")}
            >
              {t("workspaceDialogs.skip")}
            </Button>
            <ConflictDecisionBadge decision={decision} />
          </div>

          {node.kind === "folder" ? (
            isExpanded ? (
              <div className="space-y-2 rounded-2xl border border-black/5 bg-background/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                {node.children.map((child) => (
                  <ImportConflictTreeNode
                    key={child.id}
                    node={child}
                    workspace={workspace}
                    expandedNodes={expandedNodes}
                    setExpandedNodes={setExpandedNodes}
                    depth={depth + 1}
                  />
                ))}
              </div>
            ) : null
          ) : (
            <div className="space-y-2">
              {node.conflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  className="rounded-2xl border border-black/5 bg-white/80 px-3 py-2 text-xs text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                >
                  <p className="font-medium">
                    {t("workspaceDialogs.sameTargetFile", { otherModName: conflict.otherModName })}
                  </p>
                  <p className="mt-1 break-all text-slate-500 dark:text-slate-400">
                    {conflict.otherSourcePath}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PreviewMetricCard({
  icon,
  label,
  tone = "default",
  value,
}: {
  icon: ReactNode
  label: string
  tone?: "default" | "success" | "warning"
  value: string
}) {
  return (
    <Card
      className={
        tone === "warning"
          ? "rounded-[24px] border-amber-200 bg-amber-50/70 shadow-none ring-1 ring-amber-200/60 dark:border-amber-500/20 dark:bg-amber-500/10 dark:ring-amber-500/20"
          : tone === "success"
            ? "rounded-[24px] border-emerald-200 bg-emerald-50/70 shadow-none ring-1 ring-emerald-200/60 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:ring-emerald-500/20"
            : modalSubtleCardClass
      }
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          <span className="flex size-8 items-center justify-center rounded-2xl bg-background/80 text-slate-600 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
            {icon}
          </span>
          <span>{label}</span>
        </div>
        <p className="mt-3 text-lg font-semibold text-slate-950 dark:text-slate-50">{value}</p>
      </CardContent>
    </Card>
  )
}

function DeleteGameDialog({ workspace }: { workspace: WorkspaceState }) {
  const { t } = useTranslation()
  if (!workspace.deleteTargetGameId) {
    return null
  }

  const targetGame = workspace.games.find((game) => game.id === workspace.deleteTargetGameId)
  if (!targetGame) {
    return null
  }

  return (
    <div className={drawerOverlayClass}>
      <div className={drawerViewportClass}>
        <Card className={drawerPanelClass}>
          <CardContent className={drawerCardContentClass}>
            <div className={drawerHandleClass}>
              <div className={drawerHandleBarClass} />
            </div>

            <div className={drawerHeaderClass}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="secondary" className="rounded-full bg-amber-100 px-3 py-1 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                    {t("workspaceDialogs.deleteBadge")}
                  </Badge>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                    {t("workspaceDialogs.deleteTitle", { name: targetGame.name })}
                  </h2>
                </div>

                <Button
                  variant="outline"
                  className={softOutlineButtonClass}
                  onClick={() => workspace.setDeleteTargetGameId(null)}
                >
                  {t("workspaceDialogs.cancel")}
                </Button>
              </div>
            </div>

            <div className={drawerBodyClass}>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t("workspaceDialogs.deleteDescription")}
              </p>
              <p className="mt-3 break-all rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                {targetGame.gamePath}
              </p>
            </div>

            <div className={drawerFooterClass}>
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  variant="outline"
                  className={softOutlineButtonClass}
                  onClick={() => workspace.setDeleteTargetGameId(null)}
                >
                  {t("workspaceDialogs.cancel")}
                </Button>
                <Button
                  className="cursor-pointer rounded-xl bg-red-600 text-white shadow-sm hover:bg-red-700"
                  onClick={() => void workspace.confirmDeleteGame(targetGame.id)}
                  disabled={workspace.savingGameId === targetGame.id}
                >
                  <Trash2 className="size-4" />
                  {workspace.savingGameId === targetGame.id ? t("workspaceDialogs.deleting") : t("workspaceDialogs.confirmDelete")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DeleteModDialog({ workspace }: { workspace: WorkspaceState }) {
  const { t } = useTranslation()
  if (!workspace.deleteTargetModId) {
    return null
  }

  const targetMod = workspace.mods.find((mod) => mod.id === workspace.deleteTargetModId)
  if (!targetMod) {
    return null
  }

  return (
    <div className={drawerOverlayClass}>
      <div className={drawerViewportClass}>
        <Card className={drawerPanelClass}>
          <CardContent className={drawerCardContentClass}>
            <div className={drawerHandleClass}>
              <div className={drawerHandleBarClass} />
            </div>

            <div className={drawerHeaderClass}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="secondary" className="rounded-full bg-amber-100 px-3 py-1 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                    {t("workspaceDialogs.deleteModBadge")}
                  </Badge>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                    {t("workspaceDialogs.deleteModTitle", { name: targetMod.name })}
                  </h2>
                </div>

                <Button
                  variant="outline"
                  className={softOutlineButtonClass}
                  onClick={() => workspace.setDeleteTargetModId(null)}
                >
                  {t("workspaceDialogs.cancel")}
                </Button>
              </div>
            </div>

            <div className={drawerBodyClass}>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t("workspaceDialogs.deleteModDescription")}
              </p>
              <div className="mt-4 space-y-3">
                <p className="break-all rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                  {targetMod.name}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full bg-background/80 px-3 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    {targetMod.type}
                  </Badge>
                  <Badge variant="outline" className="rounded-full bg-background/80 px-3 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    {t("workspaceDialogs.version")} {targetMod.version}
                  </Badge>
                </div>
              </div>
            </div>

            <div className={drawerFooterClass}>
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  variant="outline"
                  className={softOutlineButtonClass}
                  onClick={() => workspace.setDeleteTargetModId(null)}
                >
                  {t("workspaceDialogs.cancel")}
                </Button>
                <Button
                  className="cursor-pointer rounded-xl bg-red-600 text-white shadow-sm hover:bg-red-700"
                  onClick={() => void workspace.confirmDeleteMod(targetMod.id)}
                  disabled={workspace.deletingModId === targetMod.id}
                >
                  <Trash2 className="size-4" />
                  {workspace.deletingModId === targetMod.id
                    ? t("workspaceActions.deletingMod")
                    : t("workspacePage.deleteCurrentMod")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ConflictDecisionBadge({
  decision,
}: {
  decision: ReturnType<WorkspaceState["getConflictDecision"]>
}) {
  const { t } = useTranslation()
  if (!decision) {
    return (
      <Badge variant="outline" className="rounded-full bg-background/80 px-3 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
        {t("workspaceDialogs.pending")}
      </Badge>
    )
  }

  return (
    <Badge
      variant="secondary"
      className={
        decision === "overwrite"
          ? "rounded-full bg-amber-100 px-3 py-1 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
          : "rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-white/10 dark:text-slate-200"
      }
    >
      {decision === "overwrite" ? t("workspaceDialogs.willOverwrite") : t("workspaceDialogs.willSkip")}
    </Badge>
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
    <div className="rounded-2xl bg-background px-4 py-3 ring-1 ring-black/5 dark:bg-white/[0.04] dark:ring-white/10">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{gameType}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{exeName}</p>
    </div>
  )
}

function DialogTipsSection({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`grid gap-4 xl:grid-cols-3 ${className ?? ""}`}>{children}</div>
}

function DialogTipCard({
  children,
  className,
  icon,
  title,
}: {
  children: ReactNode
  className?: string
  icon?: ReactNode
  title: string
}) {
  return (
    <Card className={`${modalSubtleCardClass} h-full ${className ?? ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          {icon}
          {title}
        </div>
        <div className="mt-3">{children}</div>
      </CardContent>
    </Card>
  )
}

function FieldBlock({
  label,
  optional,
  optionalLabel,
  className,
  children,
}: {
  label: string
  optional?: boolean
  optionalLabel?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        {optional && <span className="text-[10px] text-slate-400 dark:text-slate-500">{optionalLabel ?? "Optional"}</span>}
      </div>
      {children}
    </div>
  )
}

function ExecutableField({
  value,
  placeholder,
  actionLabel,
  onChange,
  onSelect,
}: {
  value: string
  placeholder: string
  actionLabel: string
  onChange: (value: string) => void
  onSelect: () => void
}) {
  return (
    <div className="flex gap-3">
      <Input
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
      />
      <Button
        type="button"
        variant="outline"
        className={`h-11 shrink-0 rounded-2xl px-4 ${softOutlineButtonClass}`}
        onClick={onSelect}
      >
        <FolderOpen className="size-4" />
        {actionLabel}
      </Button>
    </div>
  )
}

function GameTypeSelectField({
  value,
  onValueChange,
  placeholder,
  t,
}: {
  value: "" | "iii" | "vc" | "sa"
  onValueChange: (value: "iii" | "vc" | "sa" | "") => void
  placeholder: string
  t: ReturnType<typeof useTranslation>["t"]
}) {
  return (
    <Select
      value={value || undefined}
      onValueChange={(nextValue) => onValueChange(nextValue as "iii" | "vc" | "sa")}
    >
      <SelectTrigger className="h-11 w-full rounded-xl border-border/70 bg-background/70 px-3.5 text-sm shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        position="popper"
        sideOffset={6}
        className="rounded-xl border-border/70 bg-background/95 p-1.5 backdrop-blur-xl dark:border-white/10 dark:bg-[#10131a]/95"
      >
        <SelectItem className="rounded-lg px-2.5 py-2" value="iii">{t("workspaceDialogs.gameTypeIii")}</SelectItem>
        <SelectItem className="rounded-lg px-2.5 py-2" value="vc">{t("workspaceDialogs.gameTypeVc")}</SelectItem>
        <SelectItem className="rounded-lg px-2.5 py-2" value="sa">{t("workspaceDialogs.gameTypeSa")}</SelectItem>
      </SelectContent>
    </Select>
  )
}

function getGameTypeLabel(
  gameType: WorkspaceState["addGameForm"]["type"] | WorkspaceState["editGameForm"]["type"],
  t: ReturnType<typeof useTranslation>["t"],
) {
  if (gameType === "iii") {
    return t("workspaceDialogs.gameTypeIii")
  }
  if (gameType === "vc") {
    return t("workspaceDialogs.gameTypeVc")
  }
  if (gameType === "sa") {
    return t("workspaceDialogs.gameTypeSa")
  }

  return t("workspaceDialogs.notDetected")
}

function getMissingPrerequisiteWarnings(
  modType: ModType,
  prerequisites: GamePrerequisite[],
): MissingPrerequisiteWarning[] {
  // asiloader and modloader are mandatory for all mod types
  const baseKeys = ["asiloader", "modloader"]
  
  const prerequisiteKeysByModType: Record<ModType, string[]> = {
    ModLoader: [],
    CLEO: ["cleo"],
    "CLEO Redux": ["cleo_redux"],
    ASI: [],
    Mixed: [],
  }

  const specificKeys = prerequisiteKeysByModType[modType] ?? []
  const requiredKeys = Array.from(new Set([...baseKeys, ...specificKeys]))
  const availablePrerequisites = new Map(
    prerequisites.map((item) => [item.key.trim().toLowerCase(), item]),
  )

  return requiredKeys
    .map((key) => availablePrerequisites.get(key))
    .filter((item): item is GamePrerequisite => item != null)
    .filter((item) => !item.detected)
    .map((item) => ({
      key: item.key,
      label: item.label,
    }))
}

function GameCoverPreview({
  title,
  imageSrc,
}: {
  title: string
  imageSrc: string
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-sm dark:border-white/10">
      <img src={imageSrc} alt={title} className="h-48 w-full object-cover" />
    </div>
  )
}

export { WorkspaceDialogs }
