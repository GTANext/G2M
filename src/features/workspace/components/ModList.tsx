import { Ban, CheckCircle2 } from "lucide-react"

import { useTranslation } from "react-i18next"
import { useAppPreferences } from "@/components/app/preferencesProvider"
import { ModEnabledStateButtons } from "@/components/g2m/workspacePanels"
import { G2MPanel } from "@/components/g2m/surface"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState, SearchEmptyState } from "@/features/workspace/components/States"
import type { WorkspaceState } from "@/features/workspace/types"
import { cn } from "@/lib/utils"

function Row({
  mod,
  modListViewMode,
  workspace,
  onOpenDetails,
}: {
  mod: WorkspaceState["mods"][number]
  modListViewMode: "detailed" | "compact"
  workspace: WorkspaceState
  onOpenDetails: () => void
}) {
  const { t } = useTranslation()
  const isCompact = modListViewMode === "compact"
  const isSelected = workspace.selectedMod?.id === mod.id
  const fallbackIconClassName = mod.enabled
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-slate-400 dark:text-slate-500"
  const statusLabel = mod.enabled ? t("workspacePage.enabled") : t("workspacePage.disabled")
  const rowAccentClassName = mod.conflicts > 0
    ? "bg-amber-400 dark:bg-amber-300"
    : mod.enabled
      ? "bg-emerald-500 dark:bg-emerald-400"
      : "bg-slate-300 dark:bg-slate-600"
  const rowStateClassName = isSelected
    ? "bg-violet-50/70 dark:bg-violet-500/[0.08]"
    : "bg-transparent hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
  const metaTextClassName = "text-xs text-slate-500 dark:text-slate-400"

  return (
    <div
      className={cn(
        "relative border-t border-border/60 px-4 py-4 transition-colors first:border-t-0 dark:border-white/10 sm:px-5",
        rowStateClassName,
      )}
    >
      <div className={cn("absolute top-3 bottom-3 left-0.5 w-0.5 rounded-full", rowAccentClassName)} />
      <div className={cn("grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]", isCompact ? "xl:items-center" : "xl:items-start")}>
        <div className="flex min-w-0 items-start gap-3.5">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              void workspace.toggleMod(mod.id)
            }}
            className={cn(
              "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[14px] border transition-colors",
              mod.enabled
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400",
            )}
            disabled={workspace.togglingModId === mod.id}
          >
            <CheckCircle2 className="size-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-border/70 bg-background/80 dark:border-white/10 dark:bg-white/[0.04]">
              {mod.iconBase64 ? (
                <img
                  src={mod.iconBase64}
                  alt={mod.name}
                  className="h-full w-full object-cover"
                />
              ) : mod.enabled ? (
                <CheckCircle2 className={cn("size-5", fallbackIconClassName)} />
              ) : (
                <Ban className={cn("size-5", fallbackIconClassName)} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <h4 className="truncate text-base font-semibold text-slate-950 dark:text-slate-50">
                  {mod.name}
                </h4>
                <span className={metaTextClassName}>{statusLabel}</span>
                <span className={metaTextClassName}>{mod.type}</span>
                <span className={metaTextClassName}>
                  {t("workspaceDialogs.version")} {mod.version}
                </span>
                {mod.author ? (
                  <span className={metaTextClassName}>
                    {t("workspacePage.author")} {mod.author}
                  </span>
                ) : null}
                {isSelected ? (
                  <span className="text-xs text-violet-600 dark:text-violet-300">
                    {t("workspacePage.currentFocus")}
                  </span>
                ) : null}
                {mod.conflicts > 0 ? (
                  <span className="text-xs text-amber-700 dark:text-amber-300">
                    {t("workspace.conflictCaption", { count: mod.conflicts })}
                  </span>
                ) : null}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span>{t("workspacePage.fileCount")} {mod.fileCount}</span>
                <span>{t("workspacePage.size")} {mod.size}</span>
                <span>{t("workspacePage.importedAt")} {mod.installedAt}</span>
              </div>

              {!isCompact && mod.description ? (
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {mod.description}
                </p>
              ) : null}

              {!isCompact && mod.targetFolders.length > 0 ? (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {t("workspacePage.directory")} {mod.targetFolders.join(" / ")}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 xl:justify-end">
          <ModEnabledStateButtons
            modId={mod.id}
            enabled={mod.enabled}
            workspace={workspace}
            onClickCapture={(event) => event.stopPropagation()}
          />
          <Button
            variant="ghost"
            className="cursor-pointer rounded-xl px-3 text-slate-600 dark:text-slate-300"
            onClick={(event) => {
              event.stopPropagation()
              workspace.setSelectedModId(mod.id)
              onOpenDetails()
            }}
          >
            {t("workspacePage.viewDetails")}
          </Button>
          <Button
            variant="ghost"
            className="cursor-pointer rounded-xl px-3 text-red-600 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200"
            onClick={(event) => {
              event.stopPropagation()
              workspace.openDeleteModDialog(mod.id)
            }}
          >
            {t("workspacePage.deleteCurrentMod")}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ModList({
  workspace,
  hasMods,
  onOpenDetails,
}: {
  workspace: WorkspaceState
  hasMods: boolean
  onOpenDetails: () => void
}) {
  const { t } = useTranslation()
  const { modListViewMode, modSortRule, setModSortRule } = useAppPreferences()

  return (
    <G2MPanel>
      <div className="p-5 lg:p-6">
        <div className="flex flex-col gap-4 border-b border-border/60 pb-4 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
              {t("workspacePage.modList")}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <h3 className="text-[28px] font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">
                {t("workspacePage.currentLoadedMods")}
              </h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                <span>{t("workspacePage.enabled")} {workspace.stats.enabled}</span>
                <span>{t("workspacePage.disabled")} {workspace.stats.disabled}</span>
                {workspace.selectedMod ? (
                  <span className="truncate text-violet-600 dark:text-violet-300">
                    {t("workspacePage.currentFocusLabel", { name: workspace.selectedMod.name })}
                  </span>
                ) : null}
              </div>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {t("workspacePage.detailHint")}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {t("settings.workspaceSortModeLabel")}
            </span>
            <Select value={modSortRule} onValueChange={(value) => setModSortRule(value as typeof modSortRule)}>
              <SelectTrigger className="h-10 min-w-[220px] rounded-[14px] border-border/70 bg-background/80 px-3 text-sm shadow-none dark:border-white/10 dark:bg-white/[0.04]">
                <SelectValue placeholder={t("settings.workspaceSortModeLabel")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="installedAtDesc">{t("workspacePage.sortInstalledNewest")}</SelectItem>
                <SelectItem value="installedAtAsc">{t("workspacePage.sortInstalledOldest")}</SelectItem>
                <SelectItem value="nameAsc">{t("workspacePage.sortNameAsc")}</SelectItem>
                <SelectItem value="nameDesc">{t("workspacePage.sortNameDesc")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4">
          {hasMods ? (
            <div className="overflow-hidden rounded-[24px] border border-border/70 bg-background/80 dark:border-white/10 dark:bg-white/[0.03]">
              {workspace.mods.map((mod) => (
                <Row
                  key={mod.id}
                  mod={mod}
                  modListViewMode={modListViewMode}
                  workspace={workspace}
                  onOpenDetails={onOpenDetails}
                />
              ))}
            </div>
          ) : workspace.allModsCount > 0 && workspace.modSearchQuery.trim() ? (
            <SearchEmptyState />
          ) : (
            <EmptyState workspace={workspace} />
          )}
        </div>
      </div>
    </G2MPanel>
  )
}

export { ModList }
