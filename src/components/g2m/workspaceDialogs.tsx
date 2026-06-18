import type { DragEvent, ReactNode } from "react"
import { useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, ChevronRight, CircleHelp, FileCode2, Files, FolderTree, GripVertical, HardDriveDownload, ImagePlus, MapPinned, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react"
import { useI18n } from "@/components/app/i18nProvider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { UseG2mWorkspaceResult } from "@/hooks/useG2MWorkspace"
import { buildModFileTree, formatFileSize, resolveGameImageSrc, type ModFileTreeNode, type ModImportFileEntry } from "@/lib/g2m"
import { cn } from "@/lib/utils"

type WorkspaceState = UseG2mWorkspaceResult

const modalCardClass =
  "rounded-[28px] bg-background/95 shadow-[0_30px_120px_rgba(15,23,42,0.2)] ring-1 ring-black/5 backdrop-blur-2xl dark:bg-[#10131a]/95 dark:shadow-[0_30px_120px_rgba(0,0,0,0.5)] dark:ring-white/10"

const modalSubtleCardClass =
  "rounded-[24px] bg-muted/70 shadow-none ring-1 ring-black/5 dark:bg-white/[0.04] dark:ring-white/10"

const softOutlineButtonClass =
  "cursor-pointer rounded-xl border-border/70 bg-background/70 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"

const TARGET_FOLDER_PRESETS = ["modloader", "plugins", "scripts", "cleo"] as const

type TargetFolderPreset = (typeof TARGET_FOLDER_PRESETS)[number]
type ImportTreeMode = "source" | "target"
type ImportDragPayload = {
  kind: "file" | "folder"
  mode: ImportTreeMode
  path: string
}

function WorkspaceDialogs({ workspace }: { workspace: WorkspaceState }) {
  return (
    <>
      <AddGameDialog workspace={workspace} />
      <ConflictDialog workspace={workspace} />
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl">
        <Card className={modalCardClass}>
          <CardContent className="p-6 lg:p-7">
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
                {copy.common.close}
              </Button>
            </div>

            {selectedMod.conflictFiles.length > 0 ? (
              <div className="mt-6 space-y-3">
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
              <Alert className="mt-6 border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
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

            <div className="mt-6 flex justify-end">
              <Button className="cursor-pointer rounded-xl px-4 shadow-sm" onClick={workspace.closeConflictDialog}>
                {copy.workspaceDialogs.finish}
              </Button>
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 px-3 pt-10 backdrop-blur-sm sm:px-4">
      <div className="w-full max-w-4xl">
        <Card className={`${modalCardClass} max-h-[calc(100vh-20px)] overflow-hidden rounded-b-none border-b-0`}>
          <CardContent className="flex max-h-[calc(100vh-20px)] flex-col p-0">
            <div className="px-6 pt-3 lg:px-7">
              <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-white/15" />
            </div>

            <div className="px-6 pb-6 lg:px-7">
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

            <div className="flex-1 overflow-y-auto px-6 pb-4 lg:px-7">
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

            <div className="border-t border-border/60 bg-background/90 px-6 py-4 backdrop-blur dark:border-white/10 dark:bg-[#10131a]/90 lg:px-7">
              <div className="flex flex-wrap gap-3">
                <Button
                  className="cursor-pointer rounded-xl px-4 shadow-sm"
                  onClick={() => void workspace.confirmAddGame()}
                  disabled={workspace.savingGameId === "add-game" || !workspace.addGameForm.dir}
                >
                  <Plus className="size-4" />
                  {workspace.savingGameId === "add-game" ? copy.workspaceDialogs.adding : copy.workspaceDialogs.confirmAddGame}
                </Button>
                <Button
                  variant="outline"
                  className={`px-4 ${softOutlineButtonClass}`}
                  onClick={workspace.closeAddGameDialog}
                >
                  {copy.workspaceDialogs.later}
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl">
        <Card className={modalCardClass}>
          <CardContent className="p-6 lg:p-7">
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

            <div className="mt-6 grid gap-4 md:grid-cols-2">
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
                    <p className="break-all rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-xs text-slate-500 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                      {workspace.editGameForm.imagePath || copy.workspaceDialogs.usingDefaultCover}
                    </p>
                  </div>
                </div>
              </FieldBlock>
            </div>

            <DialogTipsSection className="mt-6">
              <DialogTipCard title={copy.workspaceDialogs.editTipTitle}>
                <div className="space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  <p>{copy.workspaceDialogs.editTip1}</p>
                  <p>{copy.workspaceDialogs.editTip2}</p>
                </div>
              </DialogTipCard>
            </DialogTipsSection>

            <div className="mt-6 flex gap-3">
              <Button
                className="cursor-pointer rounded-xl px-4 shadow-sm"
                onClick={() => void workspace.confirmEditGame()}
                disabled={workspace.savingGameId === workspace.editGameForm.id}
              >
                <Pencil className="size-4" />
                {workspace.savingGameId === workspace.editGameForm.id ? copy.workspaceDialogs.saving : copy.workspaceDialogs.saveChanges}
              </Button>
              <Button
                variant="outline"
                className={`px-4 ${softOutlineButtonClass}`}
                onClick={workspace.closeEditGameDialog}
              >
                {copy.workspaceDialogs.later}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ImportModDialog({ workspace }: { workspace: WorkspaceState }) {
  const { copy } = useI18n()
  if (!workspace.isImportModDialogOpen) {
    return null
  }

  const hasDirectory = Boolean(workspace.importModForm.dir.trim())
  const preview = workspace.importModPreview
  const hasPreview = Boolean(preview)
  const hasConflicts = (preview?.conflictFiles.length ?? 0) > 0
  const activeGameName = workspace.activeGame?.name || copy.workspaceActions.currentGame
  const importFiles = workspace.importModMappings
  const [draggingPayload, setDraggingPayload] = useState<ImportDragPayload | null>(null)

  const sourceTree = useMemo(() => buildModFileTree(importFiles, "source"), [importFiles])
  const targetTree = useMemo(() => buildModFileTree(importFiles, "target"), [importFiles])

  function handleResetMappings() {
    workspace.setImportModMappings(preview?.files ?? [])
  }

  function handleDragStart(payload: ImportDragPayload, event: DragEvent<HTMLElement>) {
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("application/g2m-import-tree", JSON.stringify(payload))
    setDraggingPayload(payload)
  }

  function handleDragEnd() {
    setDraggingPayload(null)
  }

  function handleDropToFolder(destinationFolder: string, event: DragEvent<HTMLElement>) {
    event.preventDefault()
    const payload = readImportDragPayload(event)
    setDraggingPayload(null)
    if (!payload) {
      return
    }

    const nextMappings = moveImportEntries(workspace.importModMappings, payload, destinationFolder)
    workspace.setImportModMappings(nextMappings)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 px-3 pt-10 backdrop-blur-sm sm:px-4">
      <div className="w-full max-w-5xl">
        <Card className={`${modalCardClass} max-h-[calc(100vh-20px)] overflow-hidden rounded-b-none border-b-0`}>
          <CardContent className="flex max-h-[calc(100vh-20px)] flex-col p-0">
            <div className="px-6 pt-3 lg:px-7">
              <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-white/15" />
            </div>

            <div className="px-6 pb-6 lg:px-7">
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

            <div className="flex-1 overflow-y-auto px-6 pb-4 lg:px-7">
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

                  <DialogTipCard title={copy.workspacePage.filePreview} icon={<FolderTree className="size-4 text-violet-600" />} className="mt-4">
                    <div className="space-y-4">
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                          {copy.workspacePage.targetFolders}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {preview.targetFolders.length > 0 ? preview.targetFolders.map((folder) => (
                            <Badge
                              key={`import-target-${folder}`}
                              variant="secondary"
                              className="rounded-full bg-background/80 px-3 py-1 text-slate-700 dark:bg-white/10 dark:text-slate-200"
                            >
                              {folder}
                            </Badge>
                          )) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">{copy.demo.targetPending}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                          {copy.workspacePage.filesDetected}
                        </p>
                        <div className="space-y-4">
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {TARGET_FOLDER_PRESETS.map((folder) => (
                              <TargetFolderDropZone
                                key={`import-target-drop-${folder}`}
                                folder={folder}
                                fileCount={importFiles.filter((file) => inferTargetFolder(file.targetPath).toLowerCase() === folder).length}
                                fileCountLabel={copy.workspacePage.fileCount}
                                isDragging={draggingPayload !== null}
                                onDragEnd={handleDragEnd}
                                onDropToFolder={handleDropToFolder}
                              />
                            ))}
                          </div>

                          <div className="grid gap-4 xl:grid-cols-2">
                            <ImportTreeCard title={copy.builderPage.sourceTreeTitle}>
                              <ImportInteractiveTree
                                draggingPayload={draggingPayload}
                                emptyLabel={copy.demo.previewPending}
                                mode="source"
                                nodes={sourceTree}
                                onDragEnd={handleDragEnd}
                                onDragStart={handleDragStart}
                                onDropToFolder={handleDropToFolder}
                              />
                            </ImportTreeCard>
                            <ImportTreeCard title={copy.builderPage.targetTreeTitle}>
                              <ImportInteractiveTree
                                draggingPayload={draggingPayload}
                                emptyLabel={copy.demo.targetPending}
                                mode="target"
                                nodes={targetTree}
                                onDragEnd={handleDragEnd}
                                onDragStart={handleDragStart}
                                onDropToFolder={handleDropToFolder}
                              />
                            </ImportTreeCard>
                          </div>

                          <div>
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                {copy.builderPage.mappingTitle}
                              </p>
                              <Button
                                variant="outline"
                                className={`px-3 ${softOutlineButtonClass}`}
                                onClick={handleResetMappings}
                                disabled={!hasPreview}
                              >
                                <RotateCcw className="size-4" />
                                {copy.builderPage.resetMappings}
                              </Button>
                            </div>
                            <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                              {importFiles.map((file) => (
                                <div
                                  key={`import-map-${file.relativePath}`}
                                  className={cn(
                                    "rounded-2xl border border-black/5 bg-white/70 p-4 transition-colors dark:border-white/10 dark:bg-white/[0.04]",
                                    draggingPayload?.kind === "file" && draggingPayload.path === file.targetPath && "border-violet-300 bg-violet-50/70 dark:border-violet-400/40 dark:bg-violet-500/10",
                                  )}
                                  draggable
                                  onDragEnd={handleDragEnd}
                                  onDragStart={(event) =>
                                    handleDragStart(
                                      {
                                        kind: "file",
                                        mode: "target",
                                        path: file.targetPath,
                                      },
                                      event,
                                    )}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                                      <GripVertical className="size-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="break-all text-sm font-semibold text-slate-950 dark:text-slate-50">
                                        {file.relativePath}
                                      </p>
                                      <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">
                                        {file.targetPath}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="mt-3 grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)]">
                                    <Select
                                      value={isTargetFolderPreset(file.targetFolder) ? file.targetFolder : undefined}
                                      onValueChange={(value) =>
                                        workspace.updateImportModMappingTarget(
                                          file.relativePath,
                                          replaceImportTargetRoot(file, value as TargetFolderPreset),
                                        )}
                                    >
                                      <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background/70 px-3 shadow-none dark:border-white/10 dark:bg-white/[0.04]">
                                        <SelectValue placeholder={copy.workspacePage.targetFolders} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {TARGET_FOLDER_PRESETS.map((folder) => (
                                          <SelectItem key={`import-folder-${folder}`} value={folder}>
                                            {folder}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    <Input
                                      value={file.targetPath}
                                      onChange={(event) => workspace.updateImportModMappingTarget(file.relativePath, event.currentTarget.value)}
                                      className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogTipCard>

                  {hasConflicts ? (
                    <DialogTipCard title={copy.workspacePage.conflictSummary} icon={<AlertTriangle className="size-4 text-amber-500" />} className="mt-4">
                      <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                        {preview.conflictWith.map((modName) => (
                          <p
                            key={`import-conflict-${modName}`}
                            className="rounded-2xl bg-background px-3 py-2 ring-1 ring-black/5 dark:bg-white/[0.04] dark:ring-white/10"
                          >
                            {modName}
                          </p>
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

            <div className="border-t border-border/60 bg-background/90 px-6 py-4 backdrop-blur dark:border-white/10 dark:bg-[#10131a]/90 lg:px-7">
              <div className="flex flex-wrap gap-3">
                <Button
                  className="cursor-pointer rounded-xl px-4 shadow-sm"
                  onClick={() => void workspace.confirmImportMod()}
                  disabled={workspace.isImportingMod || workspace.isPreviewingMod || !hasPreview}
                >
                  <HardDriveDownload className="size-4" />
                  {workspace.isImportingMod ? copy.workspaceDialogs.importing : copy.workspaceDialogs.confirmImportMod}
                </Button>
                <Button
                  variant="outline"
                  className={`px-4 ${softOutlineButtonClass}`}
                  onClick={workspace.closeImportModDialog}
                >
                  {copy.workspaceDialogs.later}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ImportTreeCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      {children}
    </div>
  )
}

function ImportInteractiveTree({
  nodes,
  mode,
  emptyLabel,
  draggingPayload,
  onDragStart,
  onDragEnd,
  onDropToFolder,
}: {
  nodes: ModFileTreeNode[]
  mode: ImportTreeMode
  emptyLabel: string
  draggingPayload: ImportDragPayload | null
  onDragStart: (payload: ImportDragPayload, event: DragEvent<HTMLElement>) => void
  onDragEnd: () => void
  onDropToFolder: (destinationFolder: string, event: DragEvent<HTMLElement>) => void
}) {
  if (nodes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 p-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="max-h-[260px] space-y-1 overflow-y-auto pr-1">
      {nodes.map((node) => (
        <ImportTreeNodeView
          key={`${mode}-${node.key}`}
          node={node}
          depth={0}
          mode={mode}
          draggingPayload={draggingPayload}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDropToFolder={onDropToFolder}
        />
      ))}
    </div>
  )
}

function ImportTreeNodeView({
  node,
  depth,
  mode,
  draggingPayload,
  onDragStart,
  onDragEnd,
  onDropToFolder,
}: {
  node: ModFileTreeNode
  depth: number
  mode: ImportTreeMode
  draggingPayload: ImportDragPayload | null
  onDragStart: (payload: ImportDragPayload, event: DragEvent<HTMLElement>) => void
  onDragEnd: () => void
  onDropToFolder: (destinationFolder: string, event: DragEvent<HTMLElement>) => void
}) {
  const isFolder = node.kind === "folder"
  const [isExpanded, setIsExpanded] = useState(false)
  const isDragging = draggingPayload?.path === node.fullPath

  return (
    <div>
      <div
        className={cn(
          "flex items-start gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 ring-1 ring-black/5 transition-colors dark:text-slate-200 dark:ring-white/10",
          isFolder
            ? "cursor-pointer bg-slate-50/80 hover:bg-slate-100/80 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
            : "cursor-grab bg-background/80 hover:bg-slate-50 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]",
          isDragging && "border-violet-300 bg-violet-50/70 dark:border-violet-400/40 dark:bg-violet-500/10",
        )}
        style={{ marginLeft: depth * 14 }}
        onClick={isFolder ? () => setIsExpanded((current) => !current) : undefined}
        draggable
        onDragEnd={onDragEnd}
        onDragOver={
          mode === "target" && isFolder
            ? (event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = "move"
              }
            : undefined
        }
        onDrop={mode === "target" && isFolder ? (event) => onDropToFolder(node.fullPath, event) : undefined}
        onDragStart={(event) =>
          onDragStart(
            {
              kind: isFolder ? "folder" : "file",
              mode,
              path: node.fullPath,
            },
            event,
          )}
      >
        {isFolder ? (
          <>
            <ChevronRight
              className={cn(
                "mt-0.5 size-4 shrink-0 text-slate-400 transition-transform dark:text-slate-500",
                isExpanded && "rotate-90",
              )}
            />
            <FolderTree className="mt-0.5 size-4 shrink-0 text-violet-600 dark:text-violet-300" />
          </>
        ) : (
          <>
            <GripVertical className="mt-0.5 size-4 shrink-0 text-slate-400 dark:text-slate-500" />
            <FileCode2 className="mt-0.5 size-4 shrink-0 text-slate-500 dark:text-slate-400" />
          </>
        )}
        <div className="min-w-0 flex-1">
          <p className="break-all font-medium">{node.name}</p>
          {!isFolder && node.file ? (
            <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">
              {node.file.targetPath}
            </p>
          ) : null}
        </div>
      </div>

      {isFolder && isExpanded && node.children.length > 0 ? (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => (
            <ImportTreeNodeView
              key={`${mode}-${child.key}`}
              node={child}
              depth={depth + 1}
              mode={mode}
              draggingPayload={draggingPayload}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDropToFolder={onDropToFolder}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function TargetFolderDropZone({
  folder,
  fileCount,
  fileCountLabel,
  isDragging,
  onDragEnd,
  onDropToFolder,
}: {
  folder: TargetFolderPreset
  fileCount: number
  fileCountLabel: string
  isDragging: boolean
  onDragEnd: () => void
  onDropToFolder: (destinationFolder: string, event: DragEvent<HTMLElement>) => void
}) {
  const [isOver, setIsOver] = useState(false)

  return (
    <div
      className={cn(
        "rounded-2xl border border-black/5 bg-white/70 p-4 transition-colors dark:border-white/10 dark:bg-white/[0.04]",
        isDragging && "border-dashed",
        isOver && "border-violet-300 bg-violet-50/70 dark:border-violet-400/40 dark:bg-violet-500/10",
      )}
      onDragEnter={(event) => {
        event.preventDefault()
        setIsOver(true)
      }}
      onDragLeave={() => setIsOver(false)}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
      }}
      onDrop={(event) => {
        setIsOver(false)
        onDropToFolder(folder, event)
        onDragEnd()
      }}
    >
      <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
          <FolderTree className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{folder}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {fileCountLabel} {fileCount}
          </p>
        </div>
      </div>
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-xl">
        <Card className={modalCardClass}>
          <CardContent className="p-6">
            <Badge variant="secondary" className="rounded-full bg-amber-100 px-3 py-1 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">{copy.workspaceDialogs.deleteBadge}</Badge>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              {copy.workspaceDialogs.deleteTitle(targetGame.name)}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {copy.workspaceDialogs.deleteDescription}
            </p>
            <p className="mt-3 break-all rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
              {targetGame.gamePath}
            </p>

            <div className="mt-6 flex gap-3">
              <Button
                className="cursor-pointer rounded-xl bg-red-600 text-white shadow-sm hover:bg-red-700"
                onClick={() => void workspace.confirmDeleteGame(targetGame.id)}
                disabled={workspace.savingGameId === targetGame.id}
              >
                <Trash2 className="size-4" />
                {workspace.savingGameId === targetGame.id ? copy.workspaceDialogs.deleting : copy.workspaceDialogs.confirmDelete}
              </Button>
              <Button
                variant="outline"
                className={softOutlineButtonClass}
                onClick={() => workspace.setDeleteTargetGameId(null)}
              >
                {copy.workspaceDialogs.cancel}
              </Button>
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

function readImportDragPayload(event: DragEvent<HTMLElement>): ImportDragPayload | null {
  const rawPayload = event.dataTransfer.getData("application/g2m-import-tree")
  if (!rawPayload) {
    return null
  }

  try {
    return JSON.parse(rawPayload) as ImportDragPayload
  } catch {
    return null
  }
}

function moveImportEntries(
  files: ModImportFileEntry[],
  payload: ImportDragPayload,
  destinationFolder: string,
): ModImportFileEntry[] {
  const normalizedDestination = normalizeImportPath(destinationFolder)
  if (!normalizedDestination) {
    return files
  }

  if (payload.mode === "target" && payload.kind === "folder") {
    const normalizedDraggedFolder = normalizeImportPath(payload.path)
    if (
      normalizedDestination === normalizedDraggedFolder ||
      normalizedDestination.startsWith(`${normalizedDraggedFolder}/`)
    ) {
      return files
    }
  }

  return files.map((file) => {
    const nextTargetPath = buildMovedImportTargetPath(file, payload, normalizedDestination)
    if (!nextTargetPath || nextTargetPath === file.targetPath) {
      return file
    }

    return {
      ...file,
      targetPath: nextTargetPath,
      targetFolder: inferTargetFolder(nextTargetPath),
    }
  })
}

function buildMovedImportTargetPath(
  file: ModImportFileEntry,
  payload: ImportDragPayload,
  destinationFolder: string,
): string | null {
  if (payload.mode === "source") {
    if (payload.kind === "file") {
      if (normalizeImportPath(file.relativePath) !== normalizeImportPath(payload.path)) {
        return null
      }

      return joinImportPath(destinationFolder, getImportBaseName(file.relativePath))
    }

    const normalizedSourceFolder = normalizeImportPath(payload.path)
    const normalizedRelativePath = normalizeImportPath(file.relativePath)
    if (!normalizedRelativePath.startsWith(`${normalizedSourceFolder}/`)) {
      return null
    }

    const suffix = normalizedRelativePath.slice(normalizedSourceFolder.length).replace(/^\/+/, "")
    return joinImportPath(destinationFolder, getImportBaseName(normalizedSourceFolder), suffix)
  }

  if (payload.kind === "file") {
    if (normalizeImportPath(file.targetPath) !== normalizeImportPath(payload.path)) {
      return null
    }

    return joinImportPath(destinationFolder, getImportBaseName(file.targetPath))
  }

  const normalizedTargetFolder = normalizeImportPath(payload.path)
  const normalizedTargetPath = normalizeImportPath(file.targetPath)
  if (!normalizedTargetPath.startsWith(`${normalizedTargetFolder}/`)) {
    return null
  }

  const suffix = normalizedTargetPath.slice(normalizedTargetFolder.length).replace(/^\/+/, "")
  return joinImportPath(destinationFolder, getImportBaseName(normalizedTargetFolder), suffix)
}

function replaceImportTargetRoot(file: ModImportFileEntry, nextRoot: TargetFolderPreset): string {
  const normalizedTargetPath = normalizeImportPath(file.targetPath)
  const normalizedRelativePath = normalizeImportPath(file.relativePath)
  const currentRoot = inferTargetFolder(normalizedTargetPath)
  const suffix =
    currentRoot && normalizedTargetPath.toLowerCase().startsWith(`${currentRoot.toLowerCase()}/`)
      ? normalizedTargetPath.slice(currentRoot.length + 1)
      : normalizedRelativePath

  return joinImportPath(nextRoot, suffix || normalizedRelativePath)
}

function normalizeImportPath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/").replace(/\/+$/, "")
}

function joinImportPath(...segments: string[]): string {
  return segments
    .map((segment) => normalizeImportPath(segment))
    .filter(Boolean)
    .join("/")
}

function getImportBaseName(value: string): string {
  const normalized = normalizeImportPath(value)
  const segments = normalized.split("/").filter(Boolean)
  return segments[segments.length - 1] ?? normalized
}

function inferTargetFolder(targetPath: string): string {
  const normalized = normalizeImportPath(targetPath)
  return normalized.split("/").filter(Boolean)[0] ?? ""
}

function isTargetFolderPreset(value: string): value is TargetFolderPreset {
  return TARGET_FOLDER_PRESETS.includes(value as TargetFolderPreset)
}
