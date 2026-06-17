import type { ReactNode } from "react"
import { AlertTriangle, Boxes, CheckCircle2, ChevronRight, FolderOpen, HardDriveDownload, Layers3, MapPinned, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"

import { G2MPanel, G2MPill, G2MSubtlePanel } from "@/components/g2m/surface"
import { G2MWorkspaceBreadcrumb, G2MWorkspaceHero } from "@/components/g2m/workspaceHeader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { UseG2mWorkspaceResult } from "@/hooks/useG2MWorkspace"
import { formatGameTimestamp, resolveGameImageSrc } from "@/lib/g2m"
import { cn } from "@/lib/utils"

type WorkspaceState = UseG2mWorkspaceResult

const softOutlineButtonClass =
  "cursor-pointer rounded-xl border-border/70 bg-background/70 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"

function GameWorkspacePage({ workspace }: { workspace: WorkspaceState }) {
  const navigate = useNavigate()
  const { gameId = "" } = useParams()
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)

  useEffect(() => {
    if (!gameId) {
      navigate("/", { replace: true })
      return
    }

    if (workspace.games.some((game) => game.id === gameId)) {
      workspace.openGame(gameId)
    }
  }, [gameId, navigate, workspace])

  useEffect(() => {
    if (!workspace.bootstrapping && gameId && !workspace.games.some((game) => game.id === gameId)) {
      navigate("/", { replace: true })
    }
  }, [gameId, navigate, workspace.bootstrapping, workspace.games])

  if (!workspace.activeGame) {
    return null
  }

  const activeGame = workspace.activeGame
  const hasConflicts = workspace.selectedMod.conflictFiles.length > 0

  return (
    <div className="mx-auto max-w-[1700px] space-y-4">
      <G2MWorkspaceBreadcrumb
        gameName={activeGame.name}
        onHomeClick={() => navigate("/")}
      />

      <G2MWorkspaceHero
        game={activeGame}
        stats={workspace.stats}
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
                  <p className="text-sm font-medium text-violet-600 dark:text-violet-300">Mods Workspace</p>
                  <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                    工作区主面板
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    左侧固定导航，右侧专注 Mod 列表；需要看详细信息时直接从底部拉出抽屉，不打断当前浏览节奏。
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button className="cursor-pointer rounded-xl px-4">
                    <HardDriveDownload className="size-4" />
                    导入 Mod
                  </Button>
                  <Button
                    variant="outline"
                    className={softOutlineButtonClass}
                    onClick={() => void workspace.refreshWorkspace()}
                  >
                    <RefreshCw className="size-4" />
                    刷新
                  </Button>
                  <Button
                    variant="outline"
                    className={softOutlineButtonClass}
                    onClick={() => setIsDetailSheetOpen(true)}
                  >
                    <Layers3 className="size-4" />
                    当前焦点
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-4">
                <WorkbenchStatCard
                  label="Mod 总数"
                  value={String(workspace.stats.total)}
                  caption={`${workspace.stats.disabled} 个已禁用`}
                />
                <WorkbenchStatCard
                  label="已启用"
                  value={String(workspace.stats.enabled)}
                  caption="当前已启用的 Mod"
                  tone="success"
                />
                <WorkbenchStatCard
                  label="冲突文件"
                  value={String(workspace.stats.conflicts)}
                  caption={hasConflicts ? "建议尽快处理" : "当前稳定"}
                  tone={hasConflicts ? "warning" : "success"}
                />
                <WorkbenchStatCard
                  label="文件规模"
                  value={String(workspace.stats.files)}
                  caption="已识别部署文件"
                />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <Input
                    className="h-12 rounded-2xl border-border/70 bg-background/75 pl-10 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                    placeholder="搜索 Mod 名称、作者、目标目录"
                  />
                </div>
                <G2MSubtlePanel>
                  <div className="flex h-full items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                    <G2MPill className="bg-muted px-3 py-1 dark:bg-white/10">
                      {workspace.bootstrapping ? "读取中" : "全部类型"}
                    </G2MPill>
                    <G2MPill className="bg-violet-100 px-3 py-1 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                      {workspace.usingDemoMods ? "演示列表" : "数据库列表"}
                    </G2MPill>
                  </div>
                </G2MSubtlePanel>
                <G2MSubtlePanel>
                  <div className="flex h-full items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                    <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                    软链接模式
                  </div>
                </G2MSubtlePanel>
              </div>
            </div>
          </G2MPanel>

          {hasConflicts && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-300" />
                  <div>
                    <AlertTitle>检测到冲突文件</AlertTitle>
                    <AlertDescription>
                      当前选中的 {workspace.selectedMod.name} 检测到 {workspace.selectedMod.conflictFiles.length} 个文件级冲突。
                      建议先查看冲突列表，再决定是覆盖还是跳过。
                    </AlertDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="cursor-pointer rounded-xl border-amber-300 bg-white/90 text-amber-900 backdrop-blur hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/15"
                  onClick={workspace.openConflictDialog}
                >
                  解决冲突
                </Button>
              </div>
            </Alert>
          )}

          <G2MPanel>
            <div className="p-5 lg:p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Mod 列表</p>
                  <h3 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">当前游戏已加载的 Mod</h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    点击 `查看详情` 按钮，从底部抽屉查看完整信息、冲突和文件预览。
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <G2MPill className="bg-muted px-3 py-1 text-slate-500 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
                    {workspace.stats.disabled} 个已禁用
                  </G2MPill>
                  <G2MPill className="bg-background/80 px-3 py-1 text-slate-500 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
                    当前焦点：{workspace.selectedMod.name}
                  </G2MPill>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {workspace.mods.map((mod) => (
                  <ModListCard
                    key={mod.id}
                    mod={mod}
                    workspace={workspace}
                    onOpenDetails={() => setIsDetailSheetOpen(true)}
                  />
                ))}
              </div>
            </div>
          </G2MPanel>
        </div>
      </div>

      <SelectedModSheet
        workspace={workspace}
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
      />
    </div>
  )
}

function WorkspaceSidebar({ workspace }: { workspace: WorkspaceState }) {
  const activeGame = workspace.activeGame
  if (!activeGame) {
    return null
  }

  return (
    <div className="space-y-4">
      <G2MPanel>
        <div className="p-5">
          <SectionHeading
            eyebrow="工作区导航"
            title="当前游戏信息"
            description="固定展示当前上下文和目录信息，不让主区来回跳。"
          />

          <div className="mt-5 grid grid-cols-2 gap-3">
            <DetailCardLight label="游戏类型" value={activeGame.shortName} />
            <DetailCardLight label="可执行文件" value={activeGame.exeName} />
            <DetailCardLight label="添加时间" value={formatGameTimestamp(activeGame.createdAt)} />
            <DetailCardLight label="修改时间" value={formatGameTimestamp(activeGame.updatedAt)} />
          </div>

          <div className="mt-5 space-y-3">
            <InfoStrip
              label="安装目录"
              value={activeGame.gamePath}
              icon={<MapPinned className="size-4 text-violet-600" />}
            />
            <InfoStrip
              label="Mod 仓库"
              value={`${activeGame.gamePath}\\G2M\\mods`}
              icon={<Boxes className="size-4 text-violet-600" />}
            />
          </div>
        </div>
      </G2MPanel>

      <G2MPanel>
        <div className="p-5">
          <SectionHeading
            eyebrow="快捷操作"
            title="常用入口"
            description="把目录、刷新和危险操作集中固定。"
          />
          <div className="mt-5 grid gap-2">
            <Button
              variant="outline"
              className={`justify-start ${softOutlineButtonClass}`}
              onClick={() => void workspace.openGameDirectory()}
            >
              <FolderOpen className="size-4" />
              打开游戏目录
            </Button>
            <Button
              variant="outline"
              className={`justify-start ${softOutlineButtonClass}`}
              onClick={() => workspace.openEditGameDialog(activeGame.id)}
            >
              <Pencil className="size-4" />
              编辑游戏资料
            </Button>
            <Button
              variant="outline"
              className={`justify-start ${softOutlineButtonClass}`}
              onClick={() => void workspace.refreshWorkspace()}
            >
              <RefreshCw className="size-4" />
              刷新工作区
            </Button>
            <Button
              variant="outline"
              className={`justify-start ${softOutlineButtonClass}`}
              onClick={() => workspace.openDeleteGameDialog(activeGame.id)}
            >
              <Trash2 className="size-4" />
              删除当前游戏
            </Button>
          </div>
        </div>
      </G2MPanel>

      <G2MPanel>
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">游戏切换</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">已添加的游戏</h3>
            </div>
            <G2MPill className="bg-background/80 px-3 py-1 text-slate-500 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
              {workspace.games.length} 个
            </G2MPill>
          </div>
          <div className="space-y-2">
            {workspace.games.map((game) => (
              <GameSwitchRow key={game.id} game={game} />
            ))}
          </div>
          <Button
            variant="outline"
            className="mt-3 w-full cursor-pointer rounded-2xl"
            onClick={workspace.startAddGame}
          >
            <Plus className="size-4" />
            添加更多游戏
          </Button>
        </div>
      </G2MPanel>
    </div>
  )
}

function SelectedModSheet({
  workspace,
  open,
  onOpenChange,
}: {
  workspace: WorkspaceState
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const selectedMod = workspace.selectedMod

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[70vh] w-full rounded-t-[32px] border-t border-border/70 bg-background/95 p-0 shadow-[0_-32px_100px_rgba(15,23,42,0.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0f1117]/95 dark:shadow-[0_-32px_100px_rgba(0,0,0,0.55)]"
      >
        <SheetHeader className="border-b border-border/70 bg-muted/80 px-6 py-5 backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start justify-between gap-4 pr-10">
            <div>
              <Badge variant="secondary" className="rounded-full bg-violet-100 px-3 py-1 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                当前焦点
              </Badge>
              <SheetTitle className="mt-3 text-2xl font-semibold text-slate-950 dark:text-slate-50">
                {selectedMod.name}
              </SheetTitle>
              <SheetDescription className="mt-2 leading-6 text-slate-600 dark:text-slate-300">
                底部抽屉专门承载当前选中 Mod 的完整信息，不打断列表浏览和选择节奏。
              </SheetDescription>
            </div>
            <Button
              variant="outline"
              className="cursor-pointer rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              关闭
            </Button>
          </div>
        </SheetHeader>

        <div className="flex h-full flex-col overflow-y-auto px-6 py-6">
          <div className="rounded-[28px] border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.9))] p-5 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.75),rgba(15,23,42,0.92))]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full bg-background/80 px-3 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    {selectedMod.type}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "rounded-full px-3 py-1",
                      selectedMod.enabled
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                        : "bg-muted text-slate-600 dark:bg-white/10 dark:text-slate-300",
                    )}
                  >
                    {selectedMod.enabled ? "已启用" : "已禁用"}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "rounded-full px-3 py-1",
                      selectedMod.conflicts > 0
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
                    )}
                  >
                    {selectedMod.conflicts > 0 ? `${selectedMod.conflicts} 个冲突` : "状态稳定"}
                  </Badge>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{selectedMod.description}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="cursor-pointer rounded-xl"
                onClick={() => workspace.toggleMod(selectedMod.id)}
              >
                <CheckCircle2 className="size-4" />
                {selectedMod.enabled ? "禁用当前 Mod" : "启用当前 Mod"}
              </Button>
              {selectedMod.conflictFiles.length > 0 && (
                <Button
                  variant="outline"
                  className="cursor-pointer rounded-xl"
                  onClick={workspace.openConflictDialog}
                >
                  <AlertTriangle className="size-4" />
                  查看冲突
                </Button>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <DetailCardLight label="作者" value={selectedMod.author} />
            <DetailCardLight label="大小" value={selectedMod.size} />
            <DetailCardLight label="文件数量" value={String(selectedMod.fileCount)} />
            <DetailCardLight label="导入时间" value={selectedMod.installedAt} />
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">目标目录</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedMod.targetFolders.map((folder) => (
                <Badge key={`${selectedMod.id}-${folder}`} variant="outline" className="rounded-full bg-muted px-3 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                  {folder}
                </Badge>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">文件预览</p>
            <div className="mt-3 space-y-2">
              {selectedMod.previewFiles.map((file) => (
                <div
                  key={`${selectedMod.id}-${file}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                >
                  {file}
                </div>
              ))}
            </div>
          </div>

          {selectedMod.conflictFiles.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">冲突摘要</p>
              <div className="mt-3 space-y-2">
                {selectedMod.conflictFiles.slice(0, 4).map((conflict) => (
                  <div
                    key={`${selectedMod.id}-${conflict.id}-sheet`}
                    className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-amber-950 dark:text-amber-100">{conflict.fileName}</p>
                        <p className="mt-1 truncate text-xs text-amber-800 dark:text-amber-200">{conflict.targetPath}</p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-amber-700 dark:text-amber-200" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{eyebrow}</p>
      <h3 className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  )
}

function InfoStrip({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-2xl bg-muted/70 p-4 ring-1 ring-black/5 dark:bg-white/[0.04] dark:ring-white/10">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
        {icon}
        {label}
      </div>
      <p className="mt-2 break-all text-sm leading-6 text-slate-600 dark:text-slate-300">{value}</p>
    </div>
  )
}

function WorkbenchStatCard({
  label,
  value,
  caption,
  tone = "default",
}: {
  label: string
  value: string
  caption: string
  tone?: "default" | "success" | "warning"
}) {
  const toneClassName =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
        : "border-border/70 bg-muted/70 dark:border-white/10 dark:bg-white/[0.04]"

  return (
    <div className={cn("rounded-[24px] border p-4", toneClassName)}>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50">{value}</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{caption}</p>
    </div>
  )
}

function GameSwitchRow({
  game,
}: {
  game: WorkspaceState["games"][number]
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const isCurrent = location.pathname === `/game/${game.id}`

  return (
    <button
      type="button"
      onClick={() => navigate(`/game/${game.id}`)}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all",
        isCurrent
          ? "bg-slate-900 text-white ring-1 ring-slate-900 dark:bg-white/10 dark:ring-white/20"
          : "bg-background/90 text-slate-700 ring-1 ring-black/5 hover:ring-black/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:ring-white/20",
      )}
    >
      <div className="size-14 overflow-hidden rounded-2xl bg-slate-200 dark:bg-white/10">
        <img
          src={resolveGameImageSrc(game.imagePath, game.gameType)}
          alt={game.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{game.name}</p>
        <p className={cn("mt-1 text-xs", isCurrent ? "text-slate-300" : "text-slate-500 dark:text-slate-400")}>
          {game.shortName} · {game.version}
        </p>
      </div>
      <Badge
        variant={isCurrent ? "secondary" : "outline"}
        className={isCurrent ? "rounded-full bg-white/10 px-3 py-1 text-white dark:bg-white/10" : "rounded-full bg-background/80 px-3 py-1"}
      >
        {game.status === "ready" ? "已设置" : "待设置"}
      </Badge>
    </button>
  )
}

function ModListCard({
  mod,
  workspace,
  onOpenDetails,
}: {
  mod: WorkspaceState["mods"][number]
  workspace: WorkspaceState
  onOpenDetails: () => void
}) {
  return (
    <Card className="w-full rounded-[24px] bg-background/90 text-left shadow-[0_16px_40px_rgba(15,23,42,0.05)] ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:ring-black/10 hover:shadow-[0_24px_50px_rgba(15,23,42,0.08)] dark:bg-white/5 dark:shadow-[0_18px_40px_rgba(0,0,0,0.22)] dark:ring-white/10 dark:hover:ring-white/20 dark:hover:shadow-[0_22px_44px_rgba(0,0,0,0.28)]">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                workspace.toggleMod(mod.id)
              }}
              className={cn(
                "mt-0.5 flex size-11 items-center justify-center rounded-2xl border transition-colors",
                mod.enabled
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400",
              )}
            >
              <CheckCircle2 className="size-5" />
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-base font-semibold">{mod.name}</h4>
                <Badge variant="outline" className="rounded-full bg-muted px-3 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                  {mod.type}
                </Badge>
                {mod.conflicts > 0 && (
                  <Badge variant="secondary" className="rounded-full bg-amber-100 px-3 py-1 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                    {mod.conflicts} 个冲突
                  </Badge>
                )}
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {mod.description}
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>作者 {mod.author}</span>
                <span>文件 {mod.fileCount}</span>
                <span>大小 {mod.size}</span>
                <span>导入于 {mod.installedAt}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {mod.targetFolders.map((folder) => (
              <Badge
                key={`${mod.id}-${folder}`}
                variant="outline"
                className="rounded-full bg-muted px-3 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300"
              >
                {folder}
              </Badge>
            ))}
            <Button
              variant={mod.enabled ? "secondary" : "outline"}
              className="cursor-pointer rounded-xl px-4"
              onClick={(event) => {
                event.stopPropagation()
                workspace.toggleMod(mod.id)
              }}
            >
              {mod.enabled ? "禁用" : "启用"}
            </Button>
            <Button
              variant="outline"
              className="cursor-pointer rounded-xl px-4"
              onClick={(event) => {
                event.stopPropagation()
                workspace.setSelectedModId(mod.id)
                onOpenDetails()
              }}
            >
              查看详情
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DetailCardLight({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <G2MSubtlePanel>
      <div className="p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{label}</p>
        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</p>
      </div>
    </G2MSubtlePanel>
  )
}

export { GameWorkspacePage }
