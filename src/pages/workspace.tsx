import { AlertTriangle, Boxes, CheckCircle2, FolderOpen, HardDriveDownload, Layers3, Play, RefreshCw, Search, ShieldCheck, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { useTranslation } from "react-i18next"
import { ModEnabledStateButtons, SelectedModSheet, WorkspaceSidebar } from "@/components/g2m/workspacePanels"
import { G2MPanel, G2MPill, G2MSubtlePanel } from "@/components/g2m/surface"
import { G2MWorkspaceBreadcrumb, G2MWorkspaceHero } from "@/components/g2m/workspaceHeader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { UseG2mWorkspaceResult } from "@/hooks/useG2MWorkspace"
import { useAppPreferences } from "@/components/app/preferencesProvider"
import {
  type MissingLoadedModPrerequisite,
  useWorkspacePrerequisiteState,
} from "@/hooks/workspace/useWorkspacePrerequisiteState"
import { cn } from "@/lib/utils"

type WorkspaceState = UseG2mWorkspaceResult

const softOutlineButtonClass =
  "cursor-pointer rounded-xl border-border/70 bg-background/70 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"


function GameWorkspacePage({ workspace }: { workspace: WorkspaceState }) {
  const navigate = useNavigate()
  const { gameId = "" } = useParams()
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)
  const { t } = useTranslation()
  const { modListViewMode, modSortRule, setModSortRule } = useAppPreferences()

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

  const activeGame = workspace.activeGame
  const {
    handleInstallSelectedPrerequisites,
    isInstallingMissingPrerequisites,
    isPrerequisiteDrawerOpen,
    localSelectedPrerequisiteKeys,
    missingLoadedModPrerequisites,
    missingPrerequisiteSummary,
    duplicateAsiPrerequisites,
    onTogglePrerequisiteKey,
    setIsPrerequisiteDrawerOpen,
  } = useWorkspacePrerequisiteState({
    activeGame,
    activeGameMods: workspace.activeGameMods,
    installingPrerequisiteKey: workspace.installingPrerequisiteKey,
    installGamePrerequisite: workspace.installGamePrerequisite,
  })

  if (!activeGame) {
    return null
  }

  const hasMods = workspace.mods.length > 0
  const hasConflicts = (workspace.selectedMod?.conflictFiles.length ?? 0) > 0
  const hasLinkIssues = activeGame.linkHealth.hasIssues

  return (
    <div className="mx-auto max-w-[1700px] space-y-4">
      <G2MWorkspaceBreadcrumb
        gameName={activeGame.name}
        onHomeClick={() => navigate("/")}
      />

      <G2MWorkspaceHero
        game={activeGame}
        stats={workspace.stats}
        onLaunchGame={() => void workspace.launchGame()}
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
                  <p className="text-sm font-medium text-violet-600 dark:text-violet-300">{t("workspacePage.mods")}</p>
                  <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                    {t("workspacePage.currentLoadedMods")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {t("workspacePage.selectedModDescription")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
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
                    onClick={() => void workspace.launchGame()}
                  >
                    <Play className="size-4" />
                    {t("workspacePage.launchGame")}
                  </Button>
                  <Button
                    variant="outline"
                    className={softOutlineButtonClass}
                    onClick={() => void workspace.refreshWorkspace()}
                  >
                    <RefreshCw className="size-4" />
                    {t("workspacePage.refresh")}
                  </Button>
                  <Button
                    variant="outline"
                    className={softOutlineButtonClass}
                    onClick={() => setIsDetailSheetOpen(true)}
                    disabled={!workspace.selectedMod}
                  >
                    <Layers3 className="size-4" />
                    {t("workspacePage.currentFocus")}
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-4">
                <WorkbenchStatCard
                  label={t("workspacePage.totalMods")}
                  value={String(workspace.stats.total)}
                  caption={t("workspacePage.disabledCount", { count: workspace.stats.disabled })}
                />
                <WorkbenchStatCard
                  label={t("workspacePage.enabled")}
                  value={String(workspace.stats.enabled)}
                  caption={t("workspacePage.enabledMods")}
                  tone="success"
                />
                <WorkbenchStatCard
                  label={t("workspacePage.conflictFiles")}
                  value={String(workspace.stats.conflicts)}
                  caption={hasConflicts ? t("workspacePage.conflictWarning") : t("workspacePage.conflictFree")}
                  tone={hasConflicts ? "warning" : "success"}
                />
                <WorkbenchStatCard
                  label={t("workspacePage.fileScale")}
                  value={String(workspace.stats.files)}
                  caption={t("workspacePage.filesDetected")}
                />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <Input
                    value={workspace.modSearchQuery}
                    onChange={(event) => workspace.setModSearchQuery(event.currentTarget.value)}
                    className="h-12 rounded-2xl border-border/70 bg-background/75 pl-10 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                    placeholder={t("workspacePage.searchPlaceholder")}
                  />
                </div>
                <G2MSubtlePanel>
                  <div className="flex h-full items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                    <G2MPill className="bg-muted px-3 py-1 dark:bg-white/10">
                      {workspace.bootstrapping ? t("common.current") : t("workspacePage.allTypes")}
                    </G2MPill>
                    <G2MPill className="bg-violet-100 px-3 py-1 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                      {t("workspacePage.usingDatabase")}
                    </G2MPill>
                  </div>
                </G2MSubtlePanel>
                <G2MSubtlePanel>
                  <div className="flex h-full items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                    <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                    {t("workspacePage.softLinkMode")}
                  </div>
                </G2MSubtlePanel>
              </div>
            </div>
          </G2MPanel>

          {hasConflicts && workspace.selectedMod && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-300" />
                  <div>
                    <AlertTitle>{t("workspacePage.conflictTitle")}</AlertTitle>
                    <AlertDescription>
                      {t("workspacePage.conflictWarningDescription", {
                        modName: workspace.selectedMod.name, 
                        count: workspace.selectedMod.conflictFiles.length,
                      })}
                    </AlertDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="cursor-pointer rounded-xl border-amber-300 bg-white/90 text-amber-900 backdrop-blur hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/15"
                  onClick={workspace.openConflictDialog}
                >
                  {t("workspacePage.resolveConflict")}
                </Button>
              </div>
            </Alert>
          )}

          {duplicateAsiPrerequisites.map((item) => (
            <Alert
              key={item.key}
              className="border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600 dark:text-rose-300" />
                  <div>
                    <AlertTitle>
                      {t("workspacePage.duplicateAsiAlertTitle", { name: item.label })}
                    </AlertTitle>
                    <AlertDescription>
                      {t("workspacePage.duplicateAsiAlertDescription", {
                        path: item.detectedPath ?? "",
                      })}
                    </AlertDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="cursor-pointer rounded-xl border-rose-300 bg-white/90 text-rose-900 backdrop-blur hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100 dark:hover:bg-rose-500/15"
                  onClick={() => void workspace.resolvePrerequisiteConflict(item.key)}
                >
                  {t("workspacePage.fixMisplacedPrerequisite")}
                </Button>
              </div>
            </Alert>
          ))}

          {hasLinkIssues && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-300" />
                  <div>
                    <AlertTitle>{t("workspacePage.linkRepairAlertTitle")}</AlertTitle>
                    <AlertDescription>
                      {t("workspacePage.linkRepairAlertDescription", {
                        issues: activeGame.linkHealth.issueCount,
                        missingSources: activeGame.linkHealth.missingSourceCount,
                        missingTargets: activeGame.linkHealth.missingTargetCount,
                      })}
                    </AlertDescription>
                  </div>
                </div>
                {activeGame.linkHealth.repairableModCount > 0 ? (
                  <Button
                    variant="outline"
                    className="cursor-pointer rounded-xl border-amber-300 bg-white/90 text-amber-900 backdrop-blur hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/15"
                    disabled={workspace.repairingGameLinksId === activeGame.id}
                    onClick={() => void workspace.repairGameSymlinks()}
                  >
                    {t("workspacePage.repairGameLinks")}
                  </Button>
                ) : null}
              </div>
            </Alert>
          )}

          {missingLoadedModPrerequisites.length > 0 && (
            <Alert className="border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600 dark:text-rose-300" />
                  <div>
                    <AlertTitle>{t("workspacePage.missingPrerequisitesAlertTitle")}</AlertTitle>
                    <AlertDescription>
                      {t("workspacePage.missingPrerequisitesAlertDescription", {
                        items: missingPrerequisiteSummary,
                      })}
                    </AlertDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="cursor-pointer rounded-xl border-rose-300 bg-white/90 text-rose-900 backdrop-blur hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100 dark:hover:bg-rose-500/15"
                  onClick={() => setIsPrerequisiteDrawerOpen(true)}
                >
                  {t("workspacePage.openMissingPrerequisitesDrawer")}
                </Button>
              </div>
            </Alert>
          )}

          <G2MPanel>
            <div className="p-5 lg:p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{t("workspacePage.modList")}</p>
                  <h3 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">{t("workspacePage.currentLoadedMods")}</h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {t("workspacePage.detailHint")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <G2MPill className="bg-muted px-3 py-1 text-slate-500 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
                    {t("workspacePage.disabledCount", { count: workspace.stats.disabled })}
                  </G2MPill>
                  {workspace.selectedMod && (
                    <G2MPill className="bg-background/80 px-3 py-1 text-slate-500 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
                      {t("workspacePage.currentFocusLabel", { name: workspace.selectedMod.name })}
                    </G2MPill>
                  )}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {t("workspacePage.disabledCount", { count: workspace.stats.disabled })}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {t("settings.workspaceSortModeLabel")}
                    </span>
                    <Select value={modSortRule} onValueChange={(value) => setModSortRule(value as typeof modSortRule)}>
                      <SelectTrigger className="h-11 min-w-[220px] rounded-xl border-border/70 bg-background/75 px-3.5 text-sm shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
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
                {hasMods ? (
                  workspace.mods.map((mod) => (
                    <ModListCard
                      key={mod.id}
                      mod={mod}
                      modListViewMode={modListViewMode}
                      workspace={workspace}
                      onOpenDetails={() => setIsDetailSheetOpen(true)}
                    />
                  ))
                ) : workspace.allModsCount > 0 && workspace.modSearchQuery.trim() ? (
                  <SearchEmptyState />
                ) : (
                  <EmptyModsState workspace={workspace} />
                )}
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
      <MissingPrerequisiteInstallDrawer
        open={isPrerequisiteDrawerOpen}
        onOpenChange={setIsPrerequisiteDrawerOpen}
        items={missingLoadedModPrerequisites}
        selectedKeys={localSelectedPrerequisiteKeys}
        installing={isInstallingMissingPrerequisites}
        onToggleKey={onTogglePrerequisiteKey}
        onInstallSelected={() => void handleInstallSelectedPrerequisites()}
      />
    </div>
  )
}

function MissingPrerequisiteInstallDrawer({
  open,
  onOpenChange,
  items,
  selectedKeys,
  installing,
  onToggleKey,
  onInstallSelected,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: MissingLoadedModPrerequisite[]
  selectedKeys: string[]
  installing: boolean
  onToggleKey: (key: string, checked: boolean) => void
  onInstallSelected: () => void
}) {
  const { t } = useTranslation()
  const hasInstallableItems = items.some((item) => item.canInstall)
  const selectedInstallableCount = items.filter(
    (item) => item.canInstall && selectedKeys.includes(item.key),
  ).length

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto w-full max-w-3xl rounded-t-[28px] border-border/60 bg-background/96 px-0 pb-0 shadow-[0_30px_120px_rgba(15,23,42,0.22)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#10131a]/96 dark:shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <DrawerHeader className="px-6 pb-4 pt-5 text-left lg:px-7">
          <DrawerTitle className="text-xl font-semibold text-slate-950 dark:text-slate-50">
            {t("workspacePage.prerequisitesTitle")}
          </DrawerTitle>
          <DrawerDescription className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {t("workspacePage.missingPrerequisiteDrawerDescription")}
          </DrawerDescription>
        </DrawerHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-6 pb-4 lg:px-7">
          {items.map((item) => {
            const checked = selectedKeys.includes(item.key)

            return (
              <label
                key={item.key}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors",
                  item.canInstall
                    ? "border-border/70 bg-background/80 hover:bg-muted/60 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
                    : "cursor-default border-border/60 bg-muted/40 dark:border-white/10 dark:bg-white/[0.03]",
                )}
              >
                <Checkbox
                  checked={checked}
                  disabled={!item.canInstall || installing}
                  onCheckedChange={(value) => onToggleKey(item.key, value === true)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                      {item.label}
                    </p>
                    <Badge
                      variant="outline"
                      className={
                        item.canInstall
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
                      }
                    >
                      {item.canInstall
                        ? t("workspacePage.installPrerequisite")
                        : t("workspacePage.prerequisiteBuiltinMissing")}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {t("workspacePage.prerequisiteRequiredBy", {
                      mods: item.requiredBy.join("、"),
                    })}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {item.scanScope === "scriptsPlugins"
                      ? t("workspacePage.prerequisiteScriptsPlugins")
                      : t("workspacePage.prerequisiteRoot")}
                  </p>
                </div>
              </label>
            )
          })}
        </div>

        <DrawerFooter className="border-t border-border/60 bg-background/90 px-6 py-4 backdrop-blur dark:border-white/10 dark:bg-[#10131a]/90 lg:px-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {hasInstallableItems
                ? t("workspacePage.missingPrerequisitesAlertDescription", {
                    items: items
                      .filter((item) => item.canInstall && selectedKeys.includes(item.key))
                      .map((item) => item.label)
                      .join("、"),
                  })
                : t("workspacePage.prerequisiteBuiltinMissing")}
            </p>
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                variant="outline"
                className={softOutlineButtonClass}
                onClick={() => onOpenChange(false)}
              >
                {t("workspacePage.close")}
              </Button>
              <Button
                className="cursor-pointer rounded-xl px-4"
                disabled={!hasInstallableItems || selectedInstallableCount === 0 || installing}
                onClick={onInstallSelected}
              >
                {t("workspacePage.installSelectedPrerequisites")}
              </Button>
            </div>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function EmptyModsState({ workspace }: { workspace: WorkspaceState }) {
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

function ModListCard({
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

  return (
    <Card className="w-full rounded-[24px] bg-background/90 text-left shadow-[0_16px_40px_rgba(15,23,42,0.05)] ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:ring-black/10 hover:shadow-[0_24px_50px_rgba(15,23,42,0.08)] dark:bg-white/5 dark:shadow-[0_18px_40px_rgba(0,0,0,0.22)] dark:ring-white/10 dark:hover:ring-white/20 dark:hover:shadow-[0_22px_44px_rgba(0,0,0,0.28)]">
      <CardContent className={cn("p-4", isCompact && "px-4 py-3")}>
        <div className={cn("flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between", isCompact && "gap-3 xl:items-center")}>
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                void workspace.toggleMod(mod.id)
              }}
              className={cn(
                "mt-0.5 flex size-11 items-center justify-center rounded-2xl border transition-colors",
                mod.enabled
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400",
              )}
              disabled={workspace.togglingModId === mod.id}
            >
              <CheckCircle2 className="size-5" />
            </button>

            <div className="min-w-0 flex-1">
              <div className={cn("flex min-w-0 items-start justify-between gap-3", isCompact && "items-center")}>
                <div className="min-w-0">
                  <h4 className="truncate text-base font-semibold">{mod.name}</h4>
                </div>
                {mod.conflicts > 0 && (
                  <Badge variant="secondary" className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                    {t("workspace.conflictCaption", { count: mod.conflicts })}
                  </Badge>
                )}
              </div>

              {!isCompact ? (
                <>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {mod.description}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{t("workspacePage.fileCount")} {mod.fileCount}</span>
                    <span>{t("workspacePage.size")} {mod.size}</span>
                    <span>{t("workspacePage.importedAt")} {mod.installedAt}</span>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className={cn("flex w-full flex-col gap-3 xl:w-[420px] xl:shrink-0 xl:items-end", isCompact && "xl:w-auto")}>
            {!isCompact ? (
              <>
                <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                  <Badge variant="outline" className="rounded-full bg-muted px-3 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    {mod.type}
                  </Badge>
                  <Badge variant="outline" className="rounded-full bg-muted px-3 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    {t("workspaceDialogs.version")} {mod.version}
                  </Badge>
                  <Badge variant="outline" className="rounded-full bg-muted px-3 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    {t("workspacePage.author")} {mod.author}
                  </Badge>
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
                </div>
              </>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <ModEnabledStateButtons
                modId={mod.id}
                enabled={mod.enabled}
                workspace={workspace}
                onClickCapture={(event) => event.stopPropagation()}
              />
              <Button
                variant="outline"
                className="cursor-pointer rounded-xl px-4 text-red-600 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200"
                onClick={(event) => {
                  event.stopPropagation()
                  workspace.openDeleteModDialog(mod.id)
                }}
              >
                <Trash2 className="size-4" />
                {t("workspacePage.deleteCurrentMod")}
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
                {t("workspacePage.viewDetails")}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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

export { GameWorkspacePage }
