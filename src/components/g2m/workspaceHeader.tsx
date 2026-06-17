import { ArrowRight, FolderOpen, HardDriveDownload, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { resolveGameImageSrc, type Game, type WorkspaceStats } from "@/lib/g2m"
import { cn } from "@/lib/utils"

type G2MWorkspaceBreadcrumbProps = {
  gameName: string
  onHomeClick: () => void
}

type G2MWorkspaceHeroProps = {
  game: Game
  stats: WorkspaceStats
  onEditGame: () => void
  onImportMods?: () => void
  onOpenDirectory: () => void
}

function G2MWorkspaceBreadcrumb({
  gameName,
  onHomeClick,
}: G2MWorkspaceBreadcrumbProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[24px] bg-background/80 px-4 py-4 text-sm shadow-[0_16px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur-xl dark:bg-white/5 dark:shadow-[0_16px_60px_rgba(0,0,0,0.34)] dark:ring-white/10">
      <button
        type="button"
        onClick={onHomeClick}
        className="cursor-pointer rounded-lg px-2 py-1 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-slate-100"
      >
        首页
      </button>
      <ArrowRight className="size-4 text-slate-400 dark:text-slate-500" />
      <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-900 dark:bg-white/10 dark:text-slate-100">
        {gameName}
      </span>
      <span className="ml-auto rounded-full bg-white px-3 py-1 text-slate-500 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
        工作区
      </span>
    </div>
  )
}

function G2MWorkspaceHero({
  game,
  stats,
  onEditGame,
  onImportMods,
  onOpenDirectory,
}: G2MWorkspaceHeroProps) {
  const hasConflicts = stats.conflicts > 0

  return (
    <div className="overflow-hidden rounded-[32px] bg-background/90 shadow-[0_28px_100px_rgba(15,23,42,0.12)] ring-1 ring-black/5 backdrop-blur-xl dark:bg-white/5 dark:shadow-[0_28px_100px_rgba(0,0,0,0.42)] dark:ring-white/10">
      <div className="relative">
        <div className="h-[320px] w-full overflow-hidden lg:h-[360px]">
          <img
            src={resolveGameImageSrc(game.imagePath, game.gameType)}
            alt={game.name}
            className="h-full w-full scale-[1.03] object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(15,23,42,0.9)_0%,rgba(15,23,42,0.72)_38%,rgba(15,23,42,0.35)_72%,rgba(15,23,42,0.18)_100%)]" />
        <div className="absolute inset-0 flex h-full flex-col justify-between p-6 text-white lg:p-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/15 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
                  当前游戏总览
                </span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur">
                  {game.shortName}
                </span>
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight lg:text-5xl">
                {game.name}
              </h1>
              <p className="mt-3 text-sm text-white/75 lg:text-base">
                {game.version || "未填写版本"} · {game.exeName}
              </p>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/80 lg:text-[15px]">
                顶部聚合当前游戏状态、关键指标和高频操作。列表浏览保持连续，详细信息通过底部抽屉按需展开，不强迫来回切页。
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  className="cursor-pointer rounded-2xl bg-white px-5 text-slate-950 hover:bg-slate-100"
                  onClick={onImportMods}
                >
                  <HardDriveDownload className="size-4" />
                  导入 Mod
                </Button>
                <Button
                  variant="outline"
                  className="cursor-pointer rounded-2xl border-white/20 bg-white/10 px-5 text-white hover:bg-white/20"
                  onClick={onOpenDirectory}
                >
                  <FolderOpen className="size-4" />
                  打开游戏目录
                </Button>
                <Button
                  variant="outline"
                  className="cursor-pointer rounded-2xl border-white/20 bg-white/10 px-5 text-white hover:bg-white/20"
                  onClick={onEditGame}
                >
                  <Pencil className="size-4" />
                  编辑游戏
                </Button>
              </div>
            </div>

            <div className="grid gap-3 xl:w-[420px] xl:grid-cols-2">
              <HeroStatTile
                label="当前游戏"
                value={game.shortName}
                caption={game.status === "ready" ? "已完成配置" : "待完成配置"}
              />
              <HeroStatTile
                label="Mod 总数"
                value={String(stats.total)}
                caption={`${stats.enabled} 个已启用`}
              />
              <HeroStatTile
                label="文件总数"
                value={String(stats.files)}
                caption="当前工作区已识别文件"
              />
              <HeroStatTile
                label="冲突状态"
                value={hasConflicts ? String(stats.conflicts) : "0"}
                caption={hasConflicts ? "需要处理冲突" : "当前无冲突"}
                tone={hasConflicts ? "warning" : "success"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function HeroStatTile({
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
  return (
    <div
      className={cn(
        "rounded-3xl border p-4",
        tone === "warning"
          ? "border-amber-300/30 bg-amber-400/10"
          : tone === "success"
            ? "border-emerald-300/30 bg-emerald-400/10"
            : "border-white/15 bg-white/10",
      )}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-white/60">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-white/70">{caption}</p>
    </div>
  )
}

export { G2MWorkspaceBreadcrumb, G2MWorkspaceHero }
