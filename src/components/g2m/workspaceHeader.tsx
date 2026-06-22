import { ChevronRight, FolderOpen, HardDriveDownload, Home, Pencil, Sparkles } from "lucide-react"

import { useI18n } from "@/components/app/i18nProvider"
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
  const { copy } = useI18n()

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(241,245,249,0.9))] px-4 py-3 shadow-[0_20px_70px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.03] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.9),rgba(15,23,42,0.72))] dark:shadow-[0_20px_70px_rgba(0,0,0,0.34)] dark:ring-white/[0.04]">
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={onHomeClick}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/5 bg-white/80 px-3 py-1.5 text-slate-600 transition-all hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1] dark:hover:text-white"
        >
          <Home className="size-3.5" />
          {copy.workspace.breadcrumbHome}
        </button>
        <ChevronRight className="size-4 text-slate-300 dark:text-slate-600" />
        <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 font-medium text-white shadow-sm dark:bg-white dark:text-slate-950">
          {gameName}
        </span>
      </div>

      <span className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-violet-50/90 px-3 py-1.5 text-xs font-medium text-violet-700 shadow-sm dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200">
        <Sparkles className="size-3.5" />
        {copy.workspace.breadcrumbWorkspace}
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
  const { copy } = useI18n()
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
                  {copy.workspace.heroEyebrow}
                </span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur">
                  {game.shortName}
                </span>
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight lg:text-5xl">
                {game.name}
              </h1>
              <p className="mt-3 text-sm text-white/75 lg:text-base">
                {game.version || copy.workspace.unknownVersion} · {game.exeName}
              </p>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/80 lg:text-[15px]">
                {copy.workspace.heroDescription}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  className="cursor-pointer rounded-2xl bg-white px-5 text-slate-950 hover:bg-slate-100"
                  onClick={onImportMods}
                >
                  <HardDriveDownload className="size-4" />
                  {copy.workspace.importMod}
                </Button>
                <Button
                  variant="outline"
                  className="cursor-pointer rounded-2xl border-white/20 bg-white/10 px-5 text-white hover:bg-white/20"
                  onClick={onOpenDirectory}
                >
                  <FolderOpen className="size-4" />
                  {copy.workspace.openGameDirectory}
                </Button>
                <Button
                  variant="outline"
                  className="cursor-pointer rounded-2xl border-white/20 bg-white/10 px-5 text-white hover:bg-white/20"
                  onClick={onEditGame}
                >
                  <Pencil className="size-4" />
                  {copy.workspace.editGame}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 xl:w-[420px] xl:grid-cols-2">
              <HeroStatTile
                label={copy.workspace.currentGame}
                value={game.shortName}
                caption={game.status === "ready" ? copy.workspace.configuredReady : copy.workspace.configuredPending}
              />
              <HeroStatTile
                label={copy.workspace.modTotal}
                value={String(stats.total)}
                caption={copy.workspace.modsCaption(stats.enabled)}
              />
              <HeroStatTile
                label={copy.workspace.fileTotal}
                value={String(stats.files)}
                caption={copy.workspace.filesCaption}
              />
              <HeroStatTile
                label={copy.workspace.conflictStatus}
                value={hasConflicts ? String(stats.conflicts) : "0"}
                caption={hasConflicts ? copy.workspace.conflictCaption(stats.conflicts) : copy.workspace.conflictHealthy}
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
