import type { ReactNode } from "react"
import { CheckCircle2, CircleHelp, ImagePlus, MapPinned, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { UseG2mWorkspaceResult } from "@/hooks/useG2MWorkspace"
import { resolveGameImageSrc } from "@/lib/g2m"

type WorkspaceState = UseG2mWorkspaceResult

const modalCardClass =
  "rounded-[28px] bg-background/95 shadow-[0_30px_120px_rgba(15,23,42,0.2)] ring-1 ring-black/5 backdrop-blur-2xl dark:bg-[#10131a]/95 dark:shadow-[0_30px_120px_rgba(0,0,0,0.5)] dark:ring-white/10"

const modalSubtleCardClass =
  "rounded-[24px] bg-muted/70 shadow-none ring-1 ring-black/5 dark:bg-white/[0.04] dark:ring-white/10"

const softOutlineButtonClass =
  "cursor-pointer rounded-xl border-border/70 bg-background/70 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"

function WorkspaceDialogs({ workspace }: { workspace: WorkspaceState }) {
  return (
    <>
      <AddGameDialog workspace={workspace} />
      <ConflictDialog workspace={workspace} />
      <EditGameDialog workspace={workspace} />
      <DeleteGameDialog workspace={workspace} />
    </>
  )
}

function ConflictDialog({ workspace }: { workspace: WorkspaceState }) {
  if (!workspace.isConflictDialogOpen) {
    return null
  }

  const selectedMod = workspace.selectedMod

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl">
        <Card className={modalCardClass}>
          <CardContent className="p-6 lg:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge variant="secondary" className="rounded-full bg-amber-100 px-3 py-1 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">冲突处理</Badge>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                  {selectedMod.name} 的冲突列表
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  为每个冲突项选择 `覆盖` 或 `跳过`。当前这版先记录你的处理决策，后续再接入真实部署逻辑。
                </p>
              </div>

              <Button
                variant="outline"
                className={softOutlineButtonClass}
                onClick={workspace.closeConflictDialog}
              >
                关闭
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
                              与 {conflict.otherModName} 命中相同目标文件，请选择处理策略。
                            </p>
                          </div>

                          <div className="grid gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
                              <span className="font-medium text-slate-700 dark:text-slate-200">目标路径</span>
                              <p className="mt-1 break-all">{conflict.targetPath}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
                              <span className="font-medium text-slate-700 dark:text-slate-200">当前 Mod 源文件</span>
                              <p className="mt-1 break-all">{conflict.sourcePath}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
                              <span className="font-medium text-slate-700 dark:text-slate-200">冲突 Mod 源文件</span>
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
                            覆盖
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
                            跳过
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
                    <AlertTitle>当前没有待处理冲突</AlertTitle>
                    <AlertDescription>
                      这个 Mod 目前没有检测到同名目标文件。
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}

            <div className="mt-6 flex justify-end">
              <Button className="cursor-pointer rounded-xl px-4 shadow-sm" onClick={workspace.closeConflictDialog}>
                完成
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AddGameDialog({ workspace }: { workspace: WorkspaceState }) {
  if (!workspace.isAddGameDialogOpen) {
    return null
  }

  const hasDirectory = Boolean(workspace.addGameForm.dir.trim())
  const hasDetectedType = Boolean(workspace.addGameForm.type)
  const usingCustomCover = !workspace.addGameForm.useDefaultImage && Boolean(workspace.addGameForm.imagePath)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-4xl">
        <Card className={modalCardClass}>
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-7">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="secondary" className="rounded-full bg-violet-100 px-3 py-1 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                    添加游戏
                  </Badge>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                    先识别目录，再确认添加
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    先选择游戏目录自动识别，再补充名称、版本和封面即可。
                  </p>
                </div>

                <Button
                  variant="outline"
                  className={softOutlineButtonClass}
                  onClick={workspace.closeAddGameDialog}
                >
                  取消
                </Button>
              </div>

              <div className="mt-6">
                <FieldBlock label="游戏目录">
                  <div className="flex gap-3">
                    <Input
                      value={workspace.addGameForm.dir}
                      readOnly
                      placeholder="先点击右侧按钮选择游戏目录"
                      className="h-12 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                    />
                    <Button
                      variant="outline"
                      className={`h-12 rounded-2xl px-4 ${softOutlineButtonClass}`}
                      onClick={() => void workspace.pickGameDirectory()}
                      disabled={workspace.isDetectingGame}
                    >
                      <MapPinned className="size-4" />
                      {workspace.isDetectingGame ? "识别中..." : "选择目录"}
                    </Button>
                  </div>
                </FieldBlock>
              </div>

              {(hasDirectory || hasDetectedType) && (
                <Alert className="mt-5 rounded-2xl border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <AlertTitle className="text-emerald-900 dark:text-emerald-100">
                    {hasDetectedType ? "目录识别完成" : "目录已选择"}
                  </AlertTitle>
                  <AlertDescription className="text-emerald-800/90 dark:text-emerald-200/90">
                    {hasDetectedType
                      ? `${workspace.addGameForm.name || "已识别游戏"} · ${workspace.addGameForm.type.toUpperCase()} · ${workspace.addGameForm.exeName || "已回填 EXE"}`
                      : "目录已选中，正在等待识别结果。"}
                  </AlertDescription>
                </Alert>
              )}

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <FieldBlock label="游戏名称">
                  <Input
                    value={workspace.addGameForm.name}
                    onChange={(event) => workspace.setAddGameForm({ name: event.currentTarget.value })}
                    placeholder="例如 GTA3 / 罪恶都市 / 圣安地列斯"
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </FieldBlock>

                <FieldBlock label="游戏类型">
                  <select
                    value={workspace.addGameForm.type}
                    onChange={(event) => workspace.setAddGameForm({ type: event.currentTarget.value as "sa" | "vc" | "iii" })}
                    className="flex h-11 w-full rounded-2xl border border-border/70 bg-background/70 px-3 text-sm text-slate-900 outline-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
                  >
                    <option value="">请选择类型</option>
                    <option value="iii">GTA3</option>
                    <option value="vc">罪恶都市</option>
                    <option value="sa">圣安地列斯</option>
                  </select>
                </FieldBlock>

                <FieldBlock label="版本" optional>
                  <Input
                    value={workspace.addGameForm.version}
                    onChange={(event) => workspace.setAddGameForm({ version: event.currentTarget.value })}
                    placeholder="可选，例如 1.0 / Steam / RGL"
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </FieldBlock>

                <FieldBlock label="识别到的 EXE">
                  <Input
                    value={workspace.addGameForm.exeName}
                    readOnly
                    placeholder="尚未检测"
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </FieldBlock>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <GameCoverPreview
                  title={workspace.addGameForm.name || "默认封面"}
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
                      选择本地图片
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={softOutlineButtonClass}
                      onClick={workspace.resetAddGameImage}
                    >
                      <RotateCcw className="size-4" />
                      使用默认封面
                    </Button>
                  </div>
                  <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                    默认封面来自 `/images/gta3.jpg`、`/images/gtasa.jpg`、`/images/gtavc.jpg`。
                    手动选择后会复制到程序目录的 `assets/custom/`。
                  </p>
                  <p className="break-all rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-xs text-slate-500 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                    {usingCustomCover ? workspace.addGameForm.imagePath : "当前使用默认封面"}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  className="cursor-pointer rounded-xl px-4 shadow-sm"
                  onClick={() => void workspace.confirmAddGame()}
                  disabled={workspace.savingGameId === "add-game" || !workspace.addGameForm.dir}
                >
                  <Plus className="size-4" />
                  {workspace.savingGameId === "add-game" ? "添加中..." : "确认添加游戏"}
                </Button>
                <Button
                  variant="outline"
                  className={`px-4 ${softOutlineButtonClass}`}
                  onClick={workspace.closeAddGameDialog}
                >
                  稍后再说
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <Card className={modalSubtleCardClass}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <CircleHelp className="size-4 text-violet-600" />
                    识别规则
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <DetectionRule gameType="GTA3" exeName="gta3.exe" />
                    <DetectionRule gameType="罪恶都市" exeName="gta-vc.exe / gta_vc.exe" />
                    <DetectionRule gameType="圣安地列斯" exeName="gta_sa.exe / gta-sa.exe" />
                  </div>
                </CardContent>
              </Card>

              <Card className={modalSubtleCardClass}>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">当前状态</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <p>目录：{hasDirectory ? "已选择" : "未选择"}</p>
                    <p>类型：{hasDetectedType ? workspace.addGameForm.type.toUpperCase() : "未识别"}</p>
                    <p>封面：{usingCustomCover ? "自定义图片" : "默认封面"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className={modalSubtleCardClass}>
                <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <CircleHelp className="size-4 text-violet-600" />
                  操作提示
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <p>1. 先选择目录获取自动识别结果</p>
                  <p>2. 如有需要再手动修改名称或类型</p>
                  <p>3. 最后再决定是否替换封面</p>
                </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function EditGameDialog({ workspace }: { workspace: WorkspaceState }) {
  if (!workspace.isEditGameDialogOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl">
        <Card className={modalCardClass}>
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:p-7">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="secondary" className="rounded-full bg-violet-100 px-3 py-1 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                    编辑游戏
                  </Badge>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                    更新当前游戏信息
                  </h2>
                </div>

                <Button
                  variant="outline"
                  className={softOutlineButtonClass}
                  onClick={workspace.closeEditGameDialog}
                >
                  取消
                </Button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <FieldBlock label="游戏名称">
                  <Input
                    value={workspace.editGameForm.name}
                    onChange={(event) => workspace.setEditGameForm({ name: event.currentTarget.value })}
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </FieldBlock>

                <FieldBlock label="游戏类型">
                  <select
                    value={workspace.editGameForm.type}
                    onChange={(event) => workspace.setEditGameForm({ type: event.currentTarget.value as "sa" | "vc" | "iii" })}
                    className="flex h-11 w-full rounded-2xl border border-border/70 bg-background/70 px-3 text-sm text-slate-900 outline-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
                  >
                    <option value="iii">GTA3</option>
                    <option value="vc">罪恶都市</option>
                    <option value="sa">圣安地列斯</option>
                  </select>
                </FieldBlock>

                <FieldBlock label="游戏目录" className="md:col-span-2">
                  <Input
                    value={workspace.editGameForm.dir}
                    readOnly
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </FieldBlock>

                <FieldBlock label="版本" optional>
                  <Input
                    value={workspace.editGameForm.version}
                    onChange={(event) => workspace.setEditGameForm({ version: event.currentTarget.value })}
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </FieldBlock>

                <FieldBlock label="识别到的 EXE">
                  <Input
                    value={workspace.editGameForm.exeName}
                    readOnly
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </FieldBlock>

                <FieldBlock label="游戏封面" className="md:col-span-2">
                  <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <GameCoverPreview
                      title={workspace.editGameForm.name || "当前封面"}
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
                          重新选择图片
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className={softOutlineButtonClass}
                          onClick={workspace.resetEditGameImage}
                        >
                          <RotateCcw className="size-4" />
                          恢复默认封面
                        </Button>
                      </div>
                      <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                        自定义封面会按 `sa-随机字符串.jpg` 这类命名复制到 `assets/custom/`，并写入数据库。
                      </p>
                      <p className="break-all rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-xs text-slate-500 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                        {workspace.editGameForm.imagePath || "当前使用默认封面"}
                      </p>
                    </div>
                  </div>
                </FieldBlock>
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  className="cursor-pointer rounded-xl px-4 shadow-sm"
                  onClick={() => void workspace.confirmEditGame()}
                  disabled={workspace.savingGameId === workspace.editGameForm.id}
                >
                  <Pencil className="size-4" />
                  {workspace.savingGameId === workspace.editGameForm.id ? "保存中..." : "保存修改"}
                </Button>
                <Button
                  variant="outline"
                  className={`px-4 ${softOutlineButtonClass}`}
                  onClick={workspace.closeEditGameDialog}
                >
                  稍后再说
                </Button>
              </div>
            </div>

            <Card className={modalSubtleCardClass}>
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">提示</p>
                <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  <p>编辑只会修改展示信息和类型标记，不会删除现有游戏目录。</p>
                  <p>如果你需要重新选择目录，建议先删除旧记录，再重新添加。</p>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DeleteGameDialog({ workspace }: { workspace: WorkspaceState }) {
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
            <Badge variant="secondary" className="rounded-full bg-amber-100 px-3 py-1 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">删除游戏</Badge>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              确认删除 {targetGame.name} ?
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              这会移除 G2M 中保存的游戏配置记录，但不会删除你的真实游戏目录文件。
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
                {workspace.savingGameId === targetGame.id ? "删除中..." : "确认删除"}
              </Button>
              <Button
                variant="outline"
                className={softOutlineButtonClass}
                onClick={() => workspace.setDeleteTargetGameId(null)}
              >
                取消
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
  if (!decision) {
    return (
      <Badge variant="outline" className="rounded-full bg-background/80 px-3 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
        待处理
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
      {decision === "overwrite" ? "将覆盖" : "将跳过"}
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

function FieldBlock({
  label,
  optional,
  className,
  children,
}: {
  label: string
  optional?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        {optional && <span className="text-[10px] text-slate-400 dark:text-slate-500">可选</span>}
      </div>
      {children}
    </div>
  )
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
