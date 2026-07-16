import { Boxes, FolderOpen, HardDriveDownload, RefreshCw, Search } from "lucide-react"

import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { WorkspaceState } from "@/features/workspace/types"
import { softOutlineButtonClass } from "@/features/workspace/types"
import { cn } from "@/lib/utils"

function EmptyState({ workspace }: { workspace: WorkspaceState }) {
  const { t } = useTranslation()

  return (
    <Card className="rounded-[28px] border-dashed bg-background/70 dark:bg-white/[0.03]">
      <CardContent className="flex flex-col items-center px-6 py-10 text-center">
        <div className="flex size-16 items-center justify-center rounded-3xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
          <Boxes className="size-8" />
        </div>
        <h4 className="mt-5 text-xl font-semibold text-slate-950 dark:text-slate-50">
          {t("workspacePage.noModsTitle")}
        </h4>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          {t("workspacePage.noModsDescription")}
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {t("workspacePage.noModsHint")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
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
            onClick={() => void workspace.openGameDirectory()}
          >
            <FolderOpen className="size-4" />
            {t("workspacePage.openGameDirectory")}
          </Button>
          <Button
            variant="outline"
            className={softOutlineButtonClass}
            onClick={() => void workspace.refreshWorkspace()}
          >
            <RefreshCw className="size-4" />
            {t("workspacePage.refreshWorkspace")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function StatsCard({
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

function SearchEmptyState() {
  const { t } = useTranslation()

  return (
    <Card className="rounded-[28px] border-dashed bg-background/70 dark:bg-white/[0.03]">
      <CardContent className="flex flex-col items-center px-6 py-10 text-center">
        <div className="flex size-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
          <Search className="size-8" />
        </div>
        <h4 className="mt-5 text-xl font-semibold text-slate-950 dark:text-slate-50">
          {t("workspacePage.noSearchResultsTitle")}
        </h4>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          {t("workspacePage.noSearchResultsDescription")}
        </p>
      </CardContent>
    </Card>
  )
}

export { EmptyState, SearchEmptyState, StatsCard }
