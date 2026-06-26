import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, CircleHelp, Files, FolderOpen, HardDriveDownload, ImagePlus, MapPinned, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react"
import { useI18n } from "@/components/app/i18nProvider"
import { ModMappingWorkbench } from "@/components/g2m/ModMappingWorkbench"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { UseG2mWorkspaceResult } from "@/hooks/useG2MWorkspace"
import {
  formatFileSize,
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
  const { copy } = useI18n()
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
                  <Badge variant="secondary" className="rounded-full bg-amber-100 px-3 py-1 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">{copy.workspaceDialogs.conflictBadge}</Badge>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                    {copy.workspaceDialogs.conflictTitle(selectedMod.name)}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {copy.workspaceDialogs.conflictDescription}
                  </p>
                </div>

                <Button
                  variant="outline"
                  className={softOutlineButtonClass}
                  onClick={workspace.closeConflictDialog}
                >
                  {copy.workspaceDialogs.cancel}
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
                                {copy.workspaceDialogs.sameTargetFile(conflict.otherModName)}
                              </p>
                            </div>

                            <div className="grid gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
                                <span className="font-medium text-slate-700 dark:text-slate-200">{copy.workspaceDialogs.targetPath}</span>
                                <p className="mt-1 break-all">{conflict.targetPath}</p>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
                                <span className="font-medium text-slate-700 dark:text-slate-200">{copy.workspaceDialogs.currentModSource}</span>
                                <p className="mt-1 break-all">{conflict.sourcePath}</p>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
                                <span className="font-medium text-slate-700 dark:text-slate-200">{copy.workspaceDialogs.otherModSource}</span>
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
                              {copy.workspaceDialogs.overwrite}
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
                              {copy.workspaceDialogs.skip}
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
                      <AlertTitle>{copy.workspaceDialogs.noPendingConflictsTitle}</AlertTitle>
                      <AlertDescription>
                        {copy.workspaceDialogs.noPendingConflictsDescription}
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
                  {copy.workspaceDialogs.later}
                </Button>
                <Button className="cursor-pointer rounded-xl px-4 shadow-sm" onClick={workspace.closeConflictDialog}>
                  {copy.workspaceDialogs.finish}
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
  const { copy } = useI18n()
  if (!workspace.isAddGameDialogOpen) {
    return null
  }

  const hasDirectory = Boolean(workspace.addGameForm.dir.trim())
  const hasDetectedType = Boolean(workspace.addGameForm.type)
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
                    {copy.workspaceDialogs.addBadge}
                  </Badge>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                    {copy.workspaceDialogs.addTitle}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {copy.workspaceDialogs.addDescription}
                  </p>
                </div>

                <Button
                  variant="outline"
                  className={softOutlineButtonClass}
                  onClick={workspace.closeAddGameDialog}
                >
                  {copy.workspaceDialogs.cancel}
                </Button>
              </div>
            </div>

            <div className={drawerBodyClass}>
              <div className="mt-0">
                <FieldBlock label={copy.workspaceDialogs.gameDirectory}>
                  <div className="flex gap-3">
                    <Input
                      value={workspace.addGameForm.dir}
                      readOnly
                      placeholder={copy.workspaceDialogs.gameDirectoryPlaceholder}
                      className="h-12 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                    />
                    <Button
                      variant="outline"
                      className={`h-12 rounded-2xl px-4 ${softOutlineButtonClass}`}
                      onClick={() => void workspace.pickGameDirectory()}
                      disabled={workspace.isDetectingGame}
                    >
                      <MapPinned className="size-4" />
                      {workspace.isDetectingGame ? copy.workspaceDialogs.detecting : copy.workspaceDialogs.selectDirectory}
                    </Button>
                  </div>
                </FieldBlock>
              </div>

              {(hasDirectory || hasDetectedType) && (
                <Alert className="mt-5 rounded-2xl border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <AlertTitle className="text-emerald-900 dark:text-emerald-100">
                    {hasDetectedType ? copy.workspaceDialogs.directoryDetected : copy.workspaceDialogs.directorySelected}
                  </AlertTitle>
                  <AlertDescription className="text-emerald-800/90 dark:text-emerald-200/90">
                    {hasDetectedType
                      ? copy.workspaceDialogs.detectedSummary(
                          workspace.addGameForm.name || copy.workspaceActions.currentGame,
                          getGameTypeLabel(workspace.addGameForm.type, copy),
                          workspace.addGameForm.exeName || copy.workspaceDialogs.detectedExe,
                        )
                      : copy.workspaceDialogs.directoryWaitingDetection}
                  </AlertDescription>
                </Alert>
              )}

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <FieldBlock label={copy.workspaceDialogs.gameName}>
                  <Input
                    value={workspace.addGameForm.name}
                    onChange={(event) => workspace.setAddGameForm({ name: event.currentTarget.value })}
                    placeholder={copy.workspaceDialogs.gameNamePlaceholder}
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </FieldBlock>

                <FieldBlock label={copy.workspaceDialogs.gameType}>
                  <select
                    value={workspace.addGameForm.type}
                    onChange={(event) => workspace.setAddGameForm({ type: event.currentTarget.value as "sa" | "vc" | "iii" })}
                    className="flex h-11 w-full rounded-2xl border border-border/70 bg-background/70 px-3 text-sm text-slate-900 outline-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
                  >
                    <option value="">{copy.workspaceDialogs.chooseType}</option>
                    <option value="iii">{copy.workspaceDialogs.gameTypeIii}</option>
                    <option value="vc">{copy.workspaceDialogs.gameTypeVc}</option>
                    <option value="sa">{copy.workspaceDialogs.gameTypeSa}</option>
                  </select>
                </FieldBlock>

                <FieldBlock label={copy.workspaceDialogs.version} optionalLabel={copy.workspaceDialogs.optional} optional>
                  <Input
                    value={workspace.addGameForm.version}
                    onChange={(event) => workspace.setAddGameForm({ version: event.currentTarget.value })}
                    placeholder={copy.workspaceDialogs.versionPlaceholder}
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </FieldBlock>

                <FieldBlock label={copy.workspaceDialogs.detectedExe}>
                  <Input
                    value={workspace.addGameForm.exeName}
                    readOnly
                    placeholder={copy.workspaceDialogs.notDetectedYet}
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </FieldBlock>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <GameCoverPreview
                  title={workspace.addGameForm.name || copy.workspaceDialogs.defaultCover}
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
                      {copy.workspaceDialogs.selectLocalImage}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={softOutlineButtonClass}
                      onClick={workspace.resetAddGameImage}
                    >
                      <RotateCcw className="size-4" />
                      {copy.workspaceDialogs.useDefaultCover}
                    </Button>
                  </div>
                  <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {copy.workspaceDialogs.coverDescription}
                  </p>
                  <p className="break-all rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-xs text-slate-500 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                    {usingCustomCover ? workspace.addGameForm.imagePath : copy.workspaceDialogs.usingDefaultCover}
                  </p>
                </div>
              </div>

              <DialogTipsSection className="mt-6 pb-2">
                <DialogTipCard title={copy.workspaceDialogs.detectionRulesTitle} icon={<CircleHelp className="size-4 text-violet-600" />}>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <DetectionRule gameType={copy.workspaceDialogs.gameTypeIii} exeName="gta3.exe" />
                    <DetectionRule gameType={copy.workspaceDialogs.gameTypeVc} exeName="gta-vc.exe / gta_vc.exe" />
                    <DetectionRule gameType={copy.workspaceDialogs.gameTypeSa} exeName="gta_sa.exe / gta-sa.exe" />
                  </div>
                </DialogTipCard>

                <DialogTipCard title={copy.workspaceDialogs.currentStatusTitle}>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <p>{copy.workspaceDialogs.directoryStatus}：{hasDirectory ? copy.workspaceDialogs.selected : copy.workspaceDialogs.notSelected}</p>
                    <p>{copy.workspaceDialogs.typeStatus}：{hasDetectedType ? getGameTypeLabel(workspace.addGameForm.type, copy) : copy.workspaceDialogs.notDetected}</p>
                    <p>{copy.workspaceDialogs.coverStatus}：{usingCustomCover ? copy.workspaceDialogs.customImage : copy.workspaceDialogs.defaultCover}</p>
                  </div>
                </DialogTipCard>

                <DialogTipCard title={copy.workspaceDialogs.actionTipsTitle} icon={<CircleHelp className="size-4 text-violet-600" />}>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <p>{copy.workspaceDialogs.step1}</p>
                    <p>{copy.workspaceDialogs.step2}</p>
                    <p>{copy.workspaceDialogs.step3}</p>
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
                  {copy.workspaceDialogs.later}
                </Button>
                <Button
                  className="cursor-pointer rounded-xl px-4 shadow-sm"
                  onClick={() => void workspace.confirmAddGame()}
                  disabled={workspace.savingGameId === "add-game" || !workspace.addGameForm.dir}
                >
                  <Plus className="size-4" />
                  {workspace.savingGameId === "add-game" ? copy.workspaceDialogs.adding : copy.workspaceDialogs.confirmAddGame}
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
  const { copy } = useI18n()
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
                    {copy.workspaceDialogs.editBadge}
                  </Badge>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                    {copy.workspaceDialogs.editTitle}
                  </h2>
                </div>

                <Button
                  variant="outline"
                  className={softOutlineButtonClass}
                  onClick={workspace.closeEditGameDialog}
                >
                  {copy.workspaceDialogs.cancel}
                </Button>
              </div>
            </div>

            <div className={drawerBodyClass}>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldBlock label={copy.workspaceDialogs.gameName}>
                  <Input
                    value={workspace.editGameForm.name}
                    onChange={(event) => workspace.setEditGameForm({ name: event.currentTarget.value })}
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </FieldBlock>

                <FieldBlock label={copy.workspaceDialogs.gameType}>
                  <select
                    value={workspace.editGameForm.type}
                    onChange={(event) => workspace.setEditGameForm({ type: event.currentTarget.value as "sa" | "vc" | "iii" })}
                    className="flex h-11 w-full rounded-2xl border border-border/70 bg-background/70 px-3 text-sm text-slate-900 outline-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
                  >
                    <option value="iii">{copy.workspaceDialogs.gameTypeIii}</option>
                    <option value="vc">{copy.workspaceDialogs.gameTypeVc}</option>
                    <option value="sa">{copy.workspaceDialogs.gameTypeSa}</option>
                  </select>
                </FieldBlock>

                <FieldBlock label={copy.workspaceDialogs.gameDirectory} className="md:col-span-2">
                  <Input
                    value={workspace.editGameForm.dir}
                    readOnly
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </FieldBlock>

                <FieldBlock label={copy.workspaceDialogs.version} optionalLabel={copy.workspaceDialogs.optional} optional>
                  <Input
                    value={workspace.editGameForm.version}
                    onChange={(event) => workspace.setEditGameForm({ version: event.currentTarget.value })}
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </FieldBlock>

                <FieldBlock label={copy.workspaceDialogs.detectedExe}>
                  <Input
                    value={workspace.editGameForm.exeName}
                    readOnly
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </FieldBlock>

                <FieldBlock label={copy.workspaceDialogs.gameCover} className="md:col-span-2">
                  <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <GameCoverPreview
                      title={workspace.editGameForm.name || copy.workspaceDialogs.currentCover}
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
                          {copy.workspaceDialogs.reselectImage}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className={softOutlineButtonClass}
                          onClick={workspace.resetEditGameImage}
                        >
                          <RotateCcw className="size-4" />
                          {copy.workspaceDialogs.restoreDefaultCover}
                        </Button>
                      </div>
                      <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {copy.workspaceDialogs.coverDescription}
                      </p>
                    </div>
                  </div>
                </FieldBlock>
              </div>

              <DialogTipsSection className="mt-6 pb-2">
                <DialogTipCard title={copy.workspaceDialogs.editTipTitle}>
                  <div className="space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    <p>{copy.workspaceDialogs.editTip1}</p>
                    <p>{copy.workspaceDialogs.editTip2}</p>
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
                  {copy.workspaceDialogs.later}
                </Button>
                <Button
                  className="cursor-pointer rounded-xl px-4 shadow-sm"
                  onClick={() => void workspace.confirmEditGame()}
                  disabled={workspace.savingGameId === workspace.editGameForm.id}
                >
                  <Pencil className="size-4" />
                  {workspace.savingGameId === workspace.editGameForm.id ? copy.workspaceDialogs.saving : copy.workspaceDialogs.saveChanges}
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
  const { copy } = useI18n()
  const importFiles = workspace.importModMappings
  const [expandedConflictGroups, setExpandedConflictGroups] = useState<Record<string, boolean>>({})

  if (!workspace.isImportModDialogOpen) {
    return null
  }

  const hasDirectory = Boolean(workspace.importModForm.dir.trim())
  const preview = workspace.importModPreview
  const hasPreview = Boolean(preview)
  const hasConflicts = (preview?.conflictFiles.length ?? 0) > 0
  const conflictTree = buildImportConflictTree(preview?.conflictFiles ?? [])
  const activeGameName = workspace.activeGame?.name || copy.workspaceActions.currentGame
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
                    {copy.workspaceDialogs.importBadge}
                  </Badge>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                    {copy.workspaceDialogs.importTitle}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {copy.workspaceDialogs.importDescription}
                  </p>
                </div>

                <Button
                  variant="outline"
                  className={softOutlineButtonClass}
                  onClick={workspace.closeImportModDialog}
                >
                  {copy.workspaceDialogs.cancel}
                </Button>
              </div>
            </div>

            <div className={drawerBodyClass}>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldBlock label={copy.workspaceDialogs.importSource} className="md:col-span-2">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-3">
                      <Input
                        value={workspace.importModForm.dir}
                        readOnly
                        placeholder={copy.workspaceDialogs.importDirectoryPlaceholder}
                        className="h-12 min-w-[260px] flex-1 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                      />
                      <Button
                        variant="outline"
                        className={`h-12 rounded-2xl px-4 ${softOutlineButtonClass}`}
                        onClick={() => void workspace.pickImportModSource("directory")}
                        disabled={workspace.isImportingMod || workspace.isPreviewingMod}
                      >
                        <MapPinned className="size-4" />
                        {copy.workspaceDialogs.importSourceDirectory}
                      </Button>
                      <Button
                        variant="outline"
                        className={`h-12 rounded-2xl px-4 ${softOutlineButtonClass}`}
                        onClick={() => void workspace.pickImportModSource("zip")}
                        disabled={workspace.isImportingMod || workspace.isPreviewingMod}
                      >
                        <HardDriveDownload className="size-4" />
                        {copy.workspaceDialogs.importSourceZip}
                      </Button>
                    </div>
                  </div>
                </FieldBlock>

                <FieldBlock label={copy.workspaceDialogs.modName}>
                  <Input
                    value={workspace.importModForm.name}
                    onChange={(event) => workspace.setImportModName(event.currentTarget.value)}
                    placeholder={copy.workspaceDialogs.notSelected}
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </FieldBlock>

                <FieldBlock label={copy.workspaceDialogs.selectedGame}>
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
                    {copy.workspaceDialogs.directoryStatus}
                  </AlertTitle>
                  <AlertDescription className="text-slate-700/90 dark:text-slate-300/90">
                    {copy.workspaceDialogs.importWaitingSelection}
                  </AlertDescription>
                </Alert>
              ) : workspace.isPreviewingMod ? (
                <Alert className="mt-5 rounded-2xl border-sky-200 bg-sky-50/80 dark:border-sky-500/20 dark:bg-sky-500/10">
                  <CircleHelp className="size-4 text-sky-600 dark:text-sky-300" />
                  <AlertTitle className="text-sky-900 dark:text-sky-100">
                    {copy.workspaceActions.previewingMod}
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
                    {hasPreview ? copy.workspaceActions.modPreviewReady : copy.workspaceDialogs.importDetected}
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
                        ? copy.workspacePage.conflictWarningDescription(preview?.name || workspace.importModForm.name, preview?.conflictFiles.length ?? 0)
                        : copy.workspaceDialogs.noPendingConflictsDescription
                      : workspace.importModForm.dir}
                  </AlertDescription>
                </Alert>
              )}

              {missingPrerequisites.length > 0 ? (
                <Alert className="mt-4 rounded-2xl border-amber-200 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10">
                  <AlertTriangle className="size-4 text-amber-600 dark:text-amber-300" />
                  <AlertTitle className="text-amber-900 dark:text-amber-100">
                    {copy.workspaceDialogs.prerequisiteWarningsTitle}
                  </AlertTitle>
                  <AlertDescription className="text-amber-800/90 dark:text-amber-200/90">
                    {copy.workspaceDialogs.prerequisiteWarningsDescription(
                      preview?.modType ?? copy.workspaceDialogs.notDetected,
                      missingPrerequisites.map((item) => item.label).join(" / "),
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}

              {hasPreview && preview ? (
                <>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <PreviewMetricCard
                      icon={<CircleHelp className="size-4 text-violet-600" />}
                      label={copy.workspaceDialogs.typeStatus}
                      value={preview.modType}
                    />
                    <PreviewMetricCard
                      icon={<Files className="size-4 text-violet-600" />}
                      label={copy.workspacePage.fileCount}
                      value={String(preview.fileCount)}
                    />
                    <PreviewMetricCard
                      icon={<HardDriveDownload className="size-4 text-violet-600" />}
                      label={copy.workspacePage.size}
                      value={formatFileSize(preview.sizeBytes)}
                    />
                    <PreviewMetricCard
                      icon={<AlertTriangle className="size-4 text-violet-600" />}
                      label={copy.workspacePage.conflictFiles}
                      value={String(preview.conflictFiles.length)}
                      tone={hasConflicts ? "warning" : "default"}
                    />
                    <PreviewMetricCard
                      icon={<Files className="size-4 text-violet-600" />}
                      label={copy.workspaceDialogs.manifestStatus}
                      value={preview.hasG2mManifest ? copy.workspaceDialogs.manifestDetected : copy.workspaceDialogs.manifestMissing}
                      tone={preview.hasG2mManifest ? "success" : "default"}
                    />
                  </div>

                  <DialogTipCard title={copy.workspacePage.filePreview} className="mt-4">
                    <ModMappingWorkbench
                      copy={copy}
                      files={importFiles}
                      headerTitle={copy.workspacePage.filePreview}
                      headerDescription={copy.workspaceDialogs.folderMappingHint}
                      headerBadges={
                        <>
                          <Badge className="rounded-full bg-slate-950 px-3 py-1 text-white dark:bg-white dark:text-slate-950">
                            {preview.name || workspace.importModForm.name || copy.workspaceDialogs.modName}
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
                              ? copy.workspaceDialogs.importSourceZip
                              : copy.workspaceDialogs.importSourceDirectory}
                          </Badge>
                        </>
                      }
                      initialTargetFolders={preview.targetFolders}
                      targetDescription={copy.workspaceDialogs.folderMappingHint}
                      summaryDescription={copy.workspaceDialogs.folderMappingHint}
                      onDropToFolder={handleDropToFolder}
                      onResetMappings={handleResetMappings}
                      emptyTargetLabel={copy.demo.targetPending}
                    />
                  </DialogTipCard>

                  {hasConflicts ? (
                    <DialogTipCard title={copy.workspacePage.conflictSummary} icon={<AlertTriangle className="size-4 text-amber-500" />} className="mt-4">
                      <div className="space-y-3">
                        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {copy.workspaceDialogs.importConflictHelp}
                        </p>
                        <p className="rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                          {copy.workspaceDialogs.importConflictBackupNotice}
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
                <DialogTipCard title={copy.workspaceDialogs.currentStatusTitle}>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <p>{copy.workspaceDialogs.importSource}：{hasDirectory ? copy.workspaceDialogs.selected : copy.workspaceDialogs.notSelected}</p>
                    <p>
                      {copy.workspaceDialogs.typeStatus}：
                      {workspace.importModForm.sourceType === "zip"
                        ? copy.workspaceDialogs.importSourceZip
                        : copy.workspaceDialogs.importSourceDirectory}
                    </p>
                    <p>{copy.workspaceDialogs.modName}：{workspace.importModForm.name || copy.workspaceDialogs.notSelected}</p>
                    <p>{copy.workspaceDialogs.selectedGame}：{activeGameName}</p>
                    <p>
                      {copy.workspaceDialogs.manifestStatus}：
                      {hasPreview && preview
                        ? preview.hasG2mManifest
                          ? copy.workspaceDialogs.manifestDetected
                          : copy.workspaceDialogs.manifestMissing
                        : copy.workspaceDialogs.notDetectedYet}
                    </p>
                    <p>
                      {copy.workspacePage.filePreview}：
                      {workspace.isPreviewingMod
                        ? copy.workspaceActions.previewingMod
                        : hasPreview
                          ? copy.workspaceActions.modPreviewReady
                          : copy.demo.pendingScan}
                    </p>
                  </div>
                </DialogTipCard>

                <DialogTipCard title={copy.workspaceDialogs.importTipTitle} icon={<CircleHelp className="size-4 text-violet-600" />}>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <p>{copy.workspaceDialogs.importStep1}</p>
                    <p>{copy.workspaceDialogs.importStep2}</p>
                    <p>{copy.workspaceDialogs.importStep3}</p>
                  </div>
                </DialogTipCard>

                <DialogTipCard title={copy.workspaceDialogs.actionTipsTitle}>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <p>{copy.workspaceDialogs.importDescription}</p>
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
                  {copy.workspaceDialogs.later}
                </Button>
                <Button
                  className="cursor-pointer rounded-xl px-4 shadow-sm"
                  onClick={() => void workspace.confirmImportMod()}
                  disabled={workspace.isImportingMod || workspace.isPreviewingMod || !hasPreview}
                >
                  <HardDriveDownload className="size-4" />
                  {workspace.isImportingMod ? copy.workspaceDialogs.importing : copy.workspaceDialogs.confirmImportMod}
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
  const { copy } = useI18n()
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
                    ? node.name || copy.workspaceDialogs.installToRoot
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
                    ? copy.workspacePage.directory
                    : copy.workspaceDialogs.targetPath}
                </span>
                <p className="mt-1 break-all">
                  {node.kind === "folder"
                    ? node.path || copy.workspaceDialogs.installToRoot
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
                  ? copy.builderPage.hideDetailedMappings
                  : copy.builderPage.showDetailedMappings}
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
              {copy.workspaceDialogs.overwrite}
            </Button>
            <Button
              size="sm"
              variant={decision === "skip" ? "secondary" : "outline"}
              className={softOutlineButtonClass}
              onClick={() => resolveImportConflictNodeDecision(node, workspace, "skip")}
            >
              {copy.workspaceDialogs.skip}
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
                    {copy.workspaceDialogs.sameTargetFile(conflict.otherModName)}
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
  const { copy } = useI18n()
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
                    {copy.workspaceDialogs.deleteBadge}
                  </Badge>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                    {copy.workspaceDialogs.deleteTitle(targetGame.name)}
                  </h2>
                </div>

                <Button
                  variant="outline"
                  className={softOutlineButtonClass}
                  onClick={() => workspace.setDeleteTargetGameId(null)}
                >
                  {copy.workspaceDialogs.cancel}
                </Button>
              </div>
            </div>

            <div className={drawerBodyClass}>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {copy.workspaceDialogs.deleteDescription}
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
                  {copy.workspaceDialogs.cancel}
                </Button>
                <Button
                  className="cursor-pointer rounded-xl bg-red-600 text-white shadow-sm hover:bg-red-700"
                  onClick={() => void workspace.confirmDeleteGame(targetGame.id)}
                  disabled={workspace.savingGameId === targetGame.id}
                >
                  <Trash2 className="size-4" />
                  {workspace.savingGameId === targetGame.id ? copy.workspaceDialogs.deleting : copy.workspaceDialogs.confirmDelete}
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
  const { copy } = useI18n()
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
                    {copy.workspaceDialogs.deleteModBadge}
                  </Badge>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                    {copy.workspaceDialogs.deleteModTitle(targetMod.name)}
                  </h2>
                </div>

                <Button
                  variant="outline"
                  className={softOutlineButtonClass}
                  onClick={() => workspace.setDeleteTargetModId(null)}
                >
                  {copy.workspaceDialogs.cancel}
                </Button>
              </div>
            </div>

            <div className={drawerBodyClass}>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {copy.workspaceDialogs.deleteModDescription}
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
                    {copy.workspaceDialogs.version} {targetMod.version}
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
                  {copy.workspaceDialogs.cancel}
                </Button>
                <Button
                  className="cursor-pointer rounded-xl bg-red-600 text-white shadow-sm hover:bg-red-700"
                  onClick={() => void workspace.confirmDeleteMod(targetMod.id)}
                  disabled={workspace.deletingModId === targetMod.id}
                >
                  <Trash2 className="size-4" />
                  {workspace.deletingModId === targetMod.id
                    ? copy.workspaceActions.deletingMod
                    : copy.workspacePage.deleteCurrentMod}
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
  const { copy } = useI18n()
  if (!decision) {
    return (
      <Badge variant="outline" className="rounded-full bg-background/80 px-3 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
        {copy.workspaceDialogs.pending}
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
      {decision === "overwrite" ? copy.workspaceDialogs.willOverwrite : copy.workspaceDialogs.willSkip}
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

function getGameTypeLabel(
  gameType: WorkspaceState["addGameForm"]["type"] | WorkspaceState["editGameForm"]["type"],
  copy: ReturnType<typeof useI18n>["copy"],
) {
  if (gameType === "iii") {
    return copy.workspaceDialogs.gameTypeIii
  }
  if (gameType === "vc") {
    return copy.workspaceDialogs.gameTypeVc
  }
  if (gameType === "sa") {
    return copy.workspaceDialogs.gameTypeSa
  }

  return copy.workspaceDialogs.notDetected
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
