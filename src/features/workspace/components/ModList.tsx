import type { ReactNode } from "react"
import { AlertTriangle, ChevronRight, Clock3, FolderTree, Package2 } from "lucide-react"

import { useTranslation } from "react-i18next"
import { useAppPreferences } from "@/components/app/preferencesProvider"
import { ModEnabledStateButtons } from "@/components/g2m/workspacePanels"
import { G2MPanel } from "@/components/g2m/surface"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState, SearchEmptyState } from "@/features/workspace/components/States"
import type { WorkspaceState } from "@/features/workspace/types"
import { cn } from "@/lib/utils"

type Mod = WorkspaceState["mods"][number]

function Artwork({
  mod,
  selected,
}: {
  mod: Mod
  selected: boolean
}) {
  const initial = mod.name.trim().charAt(0).toUpperCase() || "M"

  return (
    <div
      className={cn(
        "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border text-sm font-semibold shadow-sm transition-colors",
        selected
          ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200"
          : "border-border/70 bg-background/80 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300",
      )}
    >
      {mod.iconBase64 ? (
        <img
          src={mod.iconBase64}
          alt={mod.name}
          className="h-full w-full object-cover"
        />
      ) : /[A-Z0-9]/i.test(initial) ? (
        <span>{initial}</span>
      ) : (
        <Package2 className="size-5" />
      )}
    </div>
  )
}

function Chip({
  children,
  tone = "default",
}: {
  children: React.ReactNode
  tone?: "default" | "focus" | "warning"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
        tone === "focus"
          ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200"
          : tone === "warning"
            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
            : "bg-muted text-slate-600 dark:bg-white/10 dark:text-slate-300",
      )}
    >
      {children}
    </span>
  )
}

function Row({
  mod,
  modListViewMode,
  workspace,
  onOpenDetails,
}: {
  mod: Mod
  modListViewMode: "detailed" | "compact"
  workspace: WorkspaceState
  onOpenDetails: () => void
}) {
  const { t } = useTranslation()
  const isCompact = modListViewMode === "compact"
  const isSelected = workspace.selectedMod?.id === mod.id
  const rowAccentClassName = mod.conflicts > 0
    ? "bg-amber-400 dark:bg-amber-300"
    : mod.enabled
      ? "bg-emerald-500 dark:bg-emerald-400"
      : "bg-slate-300 dark:bg-slate-600"
  const rowStateClassName = isSelected
    ? "bg-violet-50/75 dark:bg-violet-500/[0.08]"
    : "bg-transparent hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"

  return (
    <div
      className={cn(
        "relative border-t border-border/60 px-4 py-4 transition-colors first:border-t-0 dark:border-white/10 sm:px-5 sm:py-4.5",
        rowStateClassName,
        !mod.enabled && "opacity-80",
      )}
    >
      <div className={cn("absolute top-3 bottom-3 left-0.5 w-0.5 rounded-full", rowAccentClassName)} />
      <div className={cn("grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]", isCompact ? "xl:items-center" : "xl:items-start")}>
        <div className="flex min-w-0 items-start gap-3.5">
          <Artwork mod={mod} selected={isSelected} />

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-start gap-x-3 gap-y-2">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <h4 className="truncate text-base font-semibold text-slate-950 dark:text-slate-50">
                    {mod.name}
                  </h4>
                  <ChevronRight className="size-4 shrink-0 text-slate-300 dark:text-slate-600" />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Chip>{mod.type}</Chip>
                  <Chip>{t("workspaceDialogs.version")} {mod.version}</Chip>
                  {mod.author ? (
                    <Chip>{t("workspacePage.author")} {mod.author}</Chip>
                  ) : null}
                  {isSelected ? (
                    <Chip tone="focus">{t("workspacePage.currentFocus")}</Chip>
                  ) : null}
                  {mod.conflicts > 0 ? (
                    <Chip tone="warning">
                      <AlertTriangle className="size-3" />
                      {t("workspace.conflictCaption", { count: mod.conflicts })}
                    </Chip>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{t("workspacePage.fileCount")} {mod.fileCount}</span>
              <span>{t("workspacePage.size")} {mod.size}</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-3.5" />
                {t("workspacePage.importedAt")} {mod.installedAt}
              </span>
            </div>

            {!isCompact ? (
              <div className="mt-3 space-y-3">
                {mod.description ? (
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {mod.description}
                  </p>
                ) : null}

                {mod.targetFolders.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/40 px-3 py-2 text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                    <FolderTree className="size-3.5" />
                    <span>{t("workspacePage.directory")}</span>
                    <span className="truncate text-slate-700 dark:text-slate-200">
                      {mod.targetFolders.join(" / ")}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2 py-1 text-[11px] font-medium text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
            <span
              className={cn(
                "size-2 rounded-full",
                mod.enabled
                  ? "bg-emerald-500 dark:bg-emerald-400"
                  : "bg-slate-300 dark:bg-slate-500",
              )}
            />
            {mod.enabled ? t("workspacePage.enabled") : t("workspacePage.disabled")}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
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
            <Button
              variant="ghost"
              className="cursor-pointer rounded-xl px-3 text-amber-600 hover:text-amber-700 dark:text-amber-300 dark:hover:text-amber-200"
              onClick={(event) => {
                event.stopPropagation()
                void workspace.confirmRollbackMod(mod.id)
              }}
              disabled={workspace.deletingModId === mod.id}
            >
              {workspace.deletingModId === mod.id ? t("workspaceDialogs.saving", "处理中") : t("workspacePage.rollbackCurrentMod", "一键回滚")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Header({
  workspace,
  modSortRule,
  setModSortRule,
}: {
  workspace: WorkspaceState
  modSortRule: ReturnType<typeof useAppPreferences>["modSortRule"]
  setModSortRule: ReturnType<typeof useAppPreferences>["setModSortRule"]
}) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-4 border-b border-border/60 pb-4 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
          {t("workspacePage.modList")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h3 className="text-[28px] font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">
            {t("workspacePage.currentLoadedMods")}
          </h3>
          <Chip>{t("workspacePage.enabled")} {workspace.stats.enabled}</Chip>
          <Chip>{t("workspacePage.disabled")} {workspace.stats.disabled}</Chip>
          {workspace.selectedMod ? (
            <Chip tone="focus">{t("workspacePage.currentFocusLabel", { name: workspace.selectedMod.name })}</Chip>
          ) : null}
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
  )
}

function ListSurface({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-border/70 bg-background/85 shadow-[0_18px_50px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-white/[0.03] dark:shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
      {children}
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
  const { modListViewMode, modSortRule, setModSortRule } = useAppPreferences()

  return (
    <G2MPanel>
      <div className="p-5 lg:p-6">
        <Header
          workspace={workspace}
          modSortRule={modSortRule}
          setModSortRule={setModSortRule}
        />

        <div className="mt-4">
          {hasMods ? (
            <ListSurface>
              {workspace.mods.map((mod) => (
                <Row
                  key={mod.id}
                  mod={mod}
                  modListViewMode={modListViewMode}
                  workspace={workspace}
                  onOpenDetails={onOpenDetails}
                />
              ))}
            </ListSurface>
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
