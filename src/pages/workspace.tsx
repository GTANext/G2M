import { AlertTriangle, Boxes, CheckCircle2, ChevronRight, FolderOpen, HardDriveDownload, Layers3, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"

import { useI18n } from "@/components/app/i18nProvider"
import { G2MPanel, G2MPill, G2MSubtlePanel } from "@/components/g2m/surface"
import { G2MWorkspaceBreadcrumb, G2MWorkspaceHero } from "@/components/g2m/workspaceHeader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import type { UseG2mWorkspaceResult } from "@/hooks/useG2MWorkspace"
import { formatGameTimestamp, resolveGameImageSrc, type GamePrerequisite, type ManagedMod, type ModType } from "@/lib/g2m"
import { cn } from "@/lib/utils"

type WorkspaceState = UseG2mWorkspaceResult
type MissingLoadedModPrerequisite = GamePrerequisite & {
  requiredBy: string[]
}

const softOutlineButtonClass =
  "cursor-pointer rounded-xl border-border/70 bg-background/70 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"

const drawerOverlayClass =
  "fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 px-3 pt-10 backdrop-blur-sm sm:px-4"

const drawerViewportClass = "mx-auto w-full max-w-full lg:w-[1040px]"

const modalCardClass =
  "rounded-[28px] bg-background/95 shadow-[0_30px_120px_rgba(15,23,42,0.2)] ring-1 ring-black/5 backdrop-blur-2xl dark:bg-[#10131a]/95 dark:shadow-[0_30px_120px_rgba(0,0,0,0.5)] dark:ring-white/10"

const drawerPanelClass =
  `${modalCardClass} max-h-[calc(100vh-20px)] overflow-hidden rounded-b-none border-b-0`

const drawerCardContentClass = "flex max-h-[calc(100vh-20px)] flex-col p-0"

const drawerHandleClass = "px-6 pt-3 lg:px-7"

const drawerHandleBarClass = "mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-white/15"

const drawerHeaderClass = "px-6 pb-6 lg:px-7"

const drawerBodyClass = "flex-1 overflow-y-auto px-6 pb-4 lg:px-7"

const drawerFooterClass =
  "border-t border-border/60 bg-background/90 px-6 py-4 backdrop-blur dark:border-white/10 dark:bg-[#10131a]/90 lg:px-7"

function GameWorkspacePage({ workspace }: { workspace: WorkspaceState }) {
  const navigate = useNavigate()
  const { gameId = "" } = useParams()
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)
  const [isPrerequisiteDrawerOpen, setIsPrerequisiteDrawerOpen] = useState(false)
  const [localSelectedPrerequisiteKeys, setLocalSelectedPrerequisiteKeys] = useState<string[]>([])
  const { copy } = useI18n()

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
  const enabledActiveGameMods = useMemo(
    () => workspace.activeGameMods.filter((mod) => mod.enabled),
    [workspace.activeGameMods],
  )
  const missingLoadedModPrerequisites = useMemo(
    () =>
      activeGame
        ? getMissingLoadedModPrerequisites(enabledActiveGameMods, activeGame.prerequisites)
        : [],
    [activeGame, enabledActiveGameMods],
  )
  const installableMissingPrerequisites = useMemo(
    () => missingLoadedModPrerequisites.filter((item) => item.canInstall),
    [missingLoadedModPrerequisites],
  )
  const missingPrerequisiteSummary = useMemo(
    () => missingLoadedModPrerequisites.map((item) => item.label).join("、"),
    [missingLoadedModPrerequisites],
  )

  const misplacedCleoRedux = useMemo(() => {
    return activeGame?.prerequisites.find((item) => item.key === "cleo_redux_misplaced" && item.detected)
  }, [activeGame?.prerequisites])

  useEffect(() => {
    setLocalSelectedPrerequisiteKeys(
      installableMissingPrerequisites.map((item) => item.key),
    )
  }, [installableMissingPrerequisites])

  useEffect(() => {
    if (missingLoadedModPrerequisites.length === 0) {
      setIsPrerequisiteDrawerOpen(false)
    }
  }, [missingLoadedModPrerequisites.length])

  if (!activeGame) {
    return null
  }

  const hasMods = workspace.mods.length > 0
  const hasConflicts = (workspace.selectedMod?.conflictFiles.length ?? 0) > 0
  const isInstallingMissingPrerequisites = workspace.installingPrerequisiteKey !== null

  async function handleInstallSelectedPrerequisites() {
    const keysToInstall = installableMissingPrerequisites
      .map((item) => item.key)
      .filter((key) => localSelectedPrerequisiteKeys.includes(key))

    for (const key of keysToInstall) {
      await workspace.installGamePrerequisite(key)
    }

    setIsPrerequisiteDrawerOpen(false)
  }

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
                  <p className="text-sm font-medium text-violet-600 dark:text-violet-300">{copy.workspacePage.mods}</p>
                  <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                    {copy.workspacePage.currentLoadedMods}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {copy.workspacePage.selectedModDescription}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    className="cursor-pointer rounded-xl px-4"
                    onClick={workspace.openImportModDialog}
                    disabled={workspace.isImportingMod || workspace.isPreviewingMod}
                  >
                    <HardDriveDownload className="size-4" />
                    {copy.workspacePage.importMod}
                  </Button>
                  <Button
                    variant="outline"
                    className={softOutlineButtonClass}
                    onClick={() => void workspace.refreshWorkspace()}
                  >
                    <RefreshCw className="size-4" />
                    {copy.workspacePage.refresh}
                  </Button>
                  <Button
                    variant="outline"
                    className={softOutlineButtonClass}
                    onClick={() => setIsDetailSheetOpen(true)}
                    disabled={!workspace.selectedMod}
                  >
                    <Layers3 className="size-4" />
                    {copy.workspacePage.currentFocus}
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-4">
                <WorkbenchStatCard
                  label={copy.workspacePage.totalMods}
                  value={String(workspace.stats.total)}
                  caption={copy.workspacePage.disabledCount(workspace.stats.disabled)}
                />
                <WorkbenchStatCard
                  label={copy.workspacePage.enabled}
                  value={String(workspace.stats.enabled)}
                  caption={copy.workspacePage.enabledMods}
                  tone="success"
                />
                <WorkbenchStatCard
                  label={copy.workspacePage.conflictFiles}
                  value={String(workspace.stats.conflicts)}
                  caption={hasConflicts ? copy.workspacePage.conflictWarning : copy.workspacePage.conflictFree}
                  tone={hasConflicts ? "warning" : "success"}
                />
                <WorkbenchStatCard
                  label={copy.workspacePage.fileScale}
                  value={String(workspace.stats.files)}
                  caption={copy.workspacePage.filesDetected}
                />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <Input
                    value={workspace.modSearchQuery}
                    onChange={(event) => workspace.setModSearchQuery(event.currentTarget.value)}
                    className="h-12 rounded-2xl border-border/70 bg-background/75 pl-10 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                    placeholder={copy.workspacePage.searchPlaceholder}
                  />
                </div>
                <G2MSubtlePanel>
                  <div className="flex h-full items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                    <G2MPill className="bg-muted px-3 py-1 dark:bg-white/10">
                      {workspace.bootstrapping ? copy.common.current : copy.workspacePage.allTypes}
                    </G2MPill>
                    <G2MPill className="bg-violet-100 px-3 py-1 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                      {copy.workspacePage.usingDatabase}
                    </G2MPill>
                  </div>
                </G2MSubtlePanel>
                <G2MSubtlePanel>
                  <div className="flex h-full items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                    <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                    {copy.workspacePage.softLinkMode}
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
                    <AlertTitle>{copy.workspacePage.conflictTitle}</AlertTitle>
                    <AlertDescription>
                      {copy.workspacePage.conflictWarningDescription(
                        workspace.selectedMod.name,
                        workspace.selectedMod.conflictFiles.length,
                      )}
                    </AlertDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="cursor-pointer rounded-xl border-amber-300 bg-white/90 text-amber-900 backdrop-blur hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/15"
                  onClick={workspace.openConflictDialog}
                >
                  {copy.workspacePage.resolveConflict}
                </Button>
              </div>
            </Alert>
          )}

          {misplacedCleoRedux && misplacedCleoRedux.detectedPath && (
            <Alert className="border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600 dark:text-rose-300" />
                  <div>
                    <AlertTitle>发现位置错误的 CLEO Redux 核心组件</AlertTitle>
                    <AlertDescription>
                      检测到 plugins 目录下存在 cleo_redux.asi，这会导致 js/ts 脚本加载失败。请将其移动到游戏根目录下。
                    </AlertDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="cursor-pointer rounded-xl border-rose-300 bg-white/90 text-rose-900 backdrop-blur hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100 dark:hover:bg-rose-500/15"
                  onClick={() => void workspace.fixMisplacedPrerequisite(misplacedCleoRedux.detectedPath!)}
                >
                  一键修复
                </Button>
              </div>
            </Alert>
          )}

          {missingLoadedModPrerequisites.length > 0 && (
            <Alert className="border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600 dark:text-rose-300" />
                  <div>
                    <AlertTitle>{copy.workspacePage.missingPrerequisitesAlertTitle}</AlertTitle>
                    <AlertDescription>
                      {copy.workspacePage.missingPrerequisitesAlertDescription(
                        missingPrerequisiteSummary,
                      )}
                    </AlertDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="cursor-pointer rounded-xl border-rose-300 bg-white/90 text-rose-900 backdrop-blur hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100 dark:hover:bg-rose-500/15"
                  onClick={() => setIsPrerequisiteDrawerOpen(true)}
                >
                  {copy.workspacePage.openMissingPrerequisitesDrawer}
                </Button>
              </div>
            </Alert>
          )}

          <G2MPanel>
            <div className="p-5 lg:p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{copy.workspacePage.modList}</p>
                  <h3 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">{copy.workspacePage.currentLoadedMods}</h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {copy.workspacePage.detailHint}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <G2MPill className="bg-muted px-3 py-1 text-slate-500 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
                    {copy.workspacePage.disabledCount(workspace.stats.disabled)}
                  </G2MPill>
                  {workspace.selectedMod && (
                    <G2MPill className="bg-background/80 px-3 py-1 text-slate-500 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
                      {copy.workspacePage.currentFocusLabel(workspace.selectedMod.name)}
                    </G2MPill>
                  )}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {hasMods ? (
                  workspace.mods.map((mod) => (
                    <ModListCard
                      key={mod.id}
                      mod={mod}
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
        onToggleKey={(key, checked) =>
          setLocalSelectedPrerequisiteKeys((current) =>
            checked
              ? Array.from(new Set([...current, key]))
              : current.filter((item) => item !== key),
          )
        }
        onInstallSelected={() => void handleInstallSelectedPrerequisites()}
      />
    </div>
  )
}

function WorkspaceSidebar({ workspace }: { workspace: WorkspaceState }) {
  const activeGame = workspace.activeGame
  const { copy } = useI18n()
  if (!activeGame) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Panel 1: Game Profile & Quick Actions */}
      <G2MPanel>
        <div className="p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">{copy.workspacePage.gameInfo}</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full hover:bg-muted dark:hover:bg-white/10"
                onClick={() => workspace.openEditGameDialog(activeGame.id)}
                title={copy.workspacePage.editGameProfile}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full hover:bg-muted dark:hover:bg-white/10"
                onClick={() => void workspace.openGameDirectory()}
                title={copy.workspacePage.openGameDirectory}
              >
                <FolderOpen className="size-4" />
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <DetailCardLight label={copy.workspace.currentGame} value={activeGame.shortName} />
            <DetailCardLight label="EXE" value={activeGame.exeName} />
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-sm dark:bg-white/[0.02]">
              <span className="text-slate-500 dark:text-slate-400">{copy.workspacePage.addedAt}</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{formatGameTimestamp(activeGame.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-sm dark:bg-white/[0.02]">
              <span className="text-slate-500 dark:text-slate-400">{copy.workspacePage.updatedAt}</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{formatGameTimestamp(activeGame.updatedAt)}</span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className={`flex-1 justify-center ${softOutlineButtonClass}`}
              onClick={() => void workspace.refreshWorkspace()}
            >
              <RefreshCw className="size-4" />
              {copy.workspacePage.refreshWorkspace}
            </Button>
            <Button
              variant="outline"
              className={`flex-1 justify-center text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ${softOutlineButtonClass}`}
              onClick={() => workspace.openDeleteGameDialog(activeGame.id)}
            >
              <Trash2 className="size-4" />
              {copy.workspacePage.deleteCurrentGame}
            </Button>
          </div>
        </div>
      </G2MPanel>

      {/* Panel 2: Prerequisites */}
      <G2MPanel>
        <div className="p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">{copy.workspacePage.prerequisitesTitle}</h3>
              <G2MPill className="bg-background/80 px-2 py-0.5 text-xs text-slate-500 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
                {activeGame.prerequisites.length}
              </G2MPill>
            </div>
            {activeGame.prerequisites.some(item => !item.detected && item.key !== "cleo_redux_misplaced") && (
              <Button
                size="sm"
                variant="outline"
                className={`h-7 rounded-lg px-2.5 text-xs font-medium ${softOutlineButtonClass}`}
                disabled={workspace.installingPrerequisiteKey === "all"}
                onClick={() => void workspace.installAllGamePrerequisites()}
              >
                一键补齐
              </Button>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {activeGame.prerequisites.map((item) => (
              <div
                key={item.key}
                className="group relative flex items-center justify-between rounded-xl border border-black/5 bg-background/50 p-3 hover:bg-muted/50 dark:border-white/5 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {item.label}
                    </p>
                    {item.detected ? (
                      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
                    ) : null}
                  </div>
                  {item.detectedPath ? (
                    <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500" title={item.detectedPath}>
                      {item.detectedPath.split(/[\\/]/).pop()}
                    </p>
                  ) : null}
                </div>

                {!item.detected && item.canInstall ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0 rounded-lg px-2 text-xs font-medium"
                    disabled={workspace.installingPrerequisiteKey === item.key}
                    onClick={() => void workspace.installGamePrerequisite(item.key)}
                  >
                    {copy.workspacePage.installPrerequisite}
                  </Button>
                ) : !item.detected ? (
                  <Badge variant="outline" className="shrink-0 border-slate-200 bg-slate-50 text-[10px] text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
                    {copy.workspacePage.prerequisiteMissing}
                  </Badge>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </G2MPanel>

      {/* Panel 3: Switch Game */}
      <G2MPanel>
        <div className="p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">{copy.home.configuredTitle}</h3>
            <G2MPill className="bg-background/80 px-2 py-0.5 text-xs text-slate-500 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
              {workspace.games.length}
            </G2MPill>
          </div>
          
          <div className="mt-4 space-y-2">
            {workspace.games.map((game) => (
              <GameSwitchRow key={game.id} game={game} />
            ))}
          </div>
          
          <Button
            variant="outline"
            className="mt-3 w-full cursor-pointer rounded-xl border-dashed"
            onClick={workspace.startAddGame}
          >
            <Plus className="size-4" />
            {copy.home.addGame}
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
  const { copy } = useI18n()

  if (!selectedMod || !open) {
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
                    {copy.workspacePage.focusBadge}
                  </Badge>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                    {selectedMod.name}
                  </h2>
                  <p className="mt-2 leading-6 text-slate-600 dark:text-slate-300">
                    {copy.workspacePage.previewDrawerDescription}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className={softOutlineButtonClass}
                  onClick={() => onOpenChange(false)}
                >
                  {copy.workspacePage.close}
                </Button>
              </div>
            </div>

            <div className={drawerBodyClass}>
              <div className="rounded-[28px] border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.9))] p-5 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.75),rgba(15,23,42,0.92))]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="rounded-full bg-background/80 px-3 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {selectedMod.type}
                      </Badge>
                      <Badge variant="outline" className="rounded-full bg-background/80 px-3 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {copy.workspaceDialogs.version} {selectedMod.version}
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
                        {selectedMod.enabled ? copy.workspacePage.enabledState : copy.workspacePage.disabled}
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
                        {selectedMod.conflicts > 0
                          ? copy.workspace.conflictCaption(selectedMod.conflicts)
                          : copy.workspacePage.statusStable}
                      </Badge>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{selectedMod.description}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <ModEnabledStateButtons
                    modId={selectedMod.id}
                    enabled={selectedMod.enabled}
                    workspace={workspace}
                  />
                  <Button
                    variant="outline"
                    className={softOutlineButtonClass}
                    onClick={() => workspace.openDeleteModDialog(selectedMod.id)}
                  >
                    <Trash2 className="size-4" />
                    {copy.workspacePage.deleteCurrentMod}
                  </Button>
                  {selectedMod.conflictFiles.length > 0 && (
                    <Button
                      variant="outline"
                      className={softOutlineButtonClass}
                      onClick={workspace.openConflictDialog}
                    >
                      <AlertTriangle className="size-4" />
                      {copy.workspacePage.conflictView}
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <DetailCardLight label={copy.workspaceDialogs.version} value={selectedMod.version} />
                <DetailCardLight label={copy.workspacePage.author} value={selectedMod.author} />
                <DetailCardLight label={copy.workspacePage.size} value={selectedMod.size} />
                <DetailCardLight label={copy.workspacePage.fileCount} value={String(selectedMod.fileCount)} />
                <DetailCardLight label={copy.workspacePage.importedAt} value={selectedMod.installedAt} />
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{copy.workspacePage.targetFolders}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedMod.targetFolders.map((folder) => (
                    <Badge key={`${selectedMod.id}-${folder}`} variant="outline" className="rounded-full bg-muted px-3 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {folder}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{copy.workspacePage.filePreview}</p>
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
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{copy.workspacePage.conflictSummary}</p>
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

            <div className={drawerFooterClass}>
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  variant="outline"
                  className={softOutlineButtonClass}
                  onClick={() => onOpenChange(false)}
                >
                  {copy.workspacePage.close}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
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
  const { copy } = useI18n()
  const hasInstallableItems = items.some((item) => item.canInstall)
  const selectedInstallableCount = items.filter(
    (item) => item.canInstall && selectedKeys.includes(item.key),
  ).length

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto w-full max-w-3xl rounded-t-[28px] border-border/60 bg-background/96 px-0 pb-0 shadow-[0_30px_120px_rgba(15,23,42,0.22)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#10131a]/96 dark:shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <DrawerHeader className="px-6 pb-4 pt-5 text-left lg:px-7">
          <DrawerTitle className="text-xl font-semibold text-slate-950 dark:text-slate-50">
            {copy.workspacePage.prerequisitesTitle}
          </DrawerTitle>
          <DrawerDescription className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {copy.workspacePage.missingPrerequisiteDrawerDescription}
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
                        ? copy.workspacePage.installPrerequisite
                        : copy.workspacePage.prerequisiteBuiltinMissing}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {copy.workspacePage.prerequisiteRequiredBy(item.requiredBy.join("、"))}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {item.scanScope === "scriptsPlugins"
                      ? copy.workspacePage.prerequisiteScriptsPlugins
                      : copy.workspacePage.prerequisiteRoot}
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
                ? copy.workspacePage.missingPrerequisitesAlertDescription(
                    items
                      .filter((item) => item.canInstall && selectedKeys.includes(item.key))
                      .map((item) => item.label)
                      .join("、"),
                  )
                : copy.workspacePage.prerequisiteBuiltinMissing}
            </p>
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                variant="outline"
                className={softOutlineButtonClass}
                onClick={() => onOpenChange(false)}
              >
                {copy.workspacePage.close}
              </Button>
              <Button
                className="cursor-pointer rounded-xl px-4"
                disabled={!hasInstallableItems || selectedInstallableCount === 0 || installing}
                onClick={onInstallSelected}
              >
                {copy.workspacePage.installSelectedPrerequisites}
              </Button>
            </div>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function EmptyModsState({ workspace }: { workspace: WorkspaceState }) {
  const { copy } = useI18n()

  return (
    <Card className="rounded-[28px] border-dashed bg-background/70 dark:bg-white/[0.03]">
      <CardContent className="flex flex-col items-center px-6 py-10 text-center">
        <div className="flex size-16 items-center justify-center rounded-3xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
          <Boxes className="size-8" />
        </div>
        <h4 className="mt-5 text-xl font-semibold text-slate-950 dark:text-slate-50">
          {copy.workspacePage.noModsTitle}
        </h4>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          {copy.workspacePage.noModsDescription}
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {copy.workspacePage.noModsHint}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            className="cursor-pointer rounded-xl px-4"
            onClick={workspace.openImportModDialog}
            disabled={workspace.isImportingMod || workspace.isPreviewingMod}
          >
            <HardDriveDownload className="size-4" />
            {copy.workspacePage.importMod}
          </Button>
          <Button
            variant="outline"
            className={softOutlineButtonClass}
            onClick={() => void workspace.openGameDirectory()}
          >
            <FolderOpen className="size-4" />
            {copy.workspacePage.openGameDirectory}
          </Button>
          <Button
            variant="outline"
            className={softOutlineButtonClass}
            onClick={() => void workspace.refreshWorkspace()}
          >
            <RefreshCw className="size-4" />
            {copy.workspacePage.refreshWorkspace}
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

function GameSwitchRow({
  game,
}: {
  game: WorkspaceState["games"][number]
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { copy } = useI18n()
  const isCurrent = location.pathname === `/game/${game.id}`

  return (
    <button
      type="button"
      onClick={() => navigate(`/game/${game.id}`)}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all",
        isCurrent
          ? "bg-slate-900 text-white ring-1 ring-slate-900 dark:bg-white/10 dark:ring-white/20"
          : "bg-background/90 text-slate-700 ring-1 ring-black/5 hover:bg-muted/80 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/10",
      )}
    >
      <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-slate-200 dark:bg-white/10">
        <img
          src={resolveGameImageSrc(game.imagePath, game.gameType)}
          alt={game.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{game.shortName}</p>
        <p className={cn("mt-0.5 truncate text-[10px]", isCurrent ? "text-slate-300" : "text-slate-500 dark:text-slate-400")}>
          {game.version}
        </p>
      </div>
      <Badge
        variant={isCurrent ? "secondary" : "outline"}
        className={cn(
          "shrink-0 text-[10px]",
          isCurrent ? "rounded-full bg-white/10 px-2 py-0.5 text-white dark:bg-white/10" : "rounded-full bg-background/80 px-2 py-0.5"
        )}
      >
        {game.status === "ready" ? copy.workspacePage.gameStatusReady : copy.workspacePage.gameStatusPending}
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
  const { copy } = useI18n()

  return (
    <Card className="w-full rounded-[24px] bg-background/90 text-left shadow-[0_16px_40px_rgba(15,23,42,0.05)] ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:ring-black/10 hover:shadow-[0_24px_50px_rgba(15,23,42,0.08)] dark:bg-white/5 dark:shadow-[0_18px_40px_rgba(0,0,0,0.22)] dark:ring-white/10 dark:hover:ring-white/20 dark:hover:shadow-[0_22px_44px_rgba(0,0,0,0.28)]">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
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
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="truncate text-base font-semibold">{mod.name}</h4>
                </div>
                {mod.conflicts > 0 && (
                  <Badge variant="secondary" className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                    {copy.workspace.conflictCaption(mod.conflicts)}
                  </Badge>
                )}
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {mod.description}
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{copy.workspacePage.fileCount} {mod.fileCount}</span>
                <span>{copy.workspacePage.size} {mod.size}</span>
                <span>{copy.workspacePage.importedAt} {mod.installedAt}</span>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 xl:w-[420px] xl:shrink-0 xl:items-end">
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <Badge variant="outline" className="rounded-full bg-muted px-3 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                {mod.type}
              </Badge>
              <Badge variant="outline" className="rounded-full bg-muted px-3 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                {copy.workspaceDialogs.version} {mod.version}
              </Badge>
              <Badge variant="outline" className="rounded-full bg-muted px-3 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                {copy.workspacePage.author} {mod.author}
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
                {copy.workspacePage.deleteCurrentMod}
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
                {copy.workspacePage.viewDetails}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SearchEmptyState() {
  const { copy } = useI18n()

  return (
    <Card className="rounded-[28px] border-dashed bg-background/70 dark:bg-white/[0.03]">
      <CardContent className="flex flex-col items-center px-6 py-10 text-center">
        <div className="flex size-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
          <Search className="size-8" />
        </div>
        <h4 className="mt-5 text-xl font-semibold text-slate-950 dark:text-slate-50">
          {copy.workspacePage.noSearchResultsTitle}
        </h4>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          {copy.workspacePage.noSearchResultsDescription}
        </p>
      </CardContent>
    </Card>
  )
}

function ModEnabledStateButtons({
  modId,
  enabled,
  workspace,
  onClickCapture,
}: {
  modId: string
  enabled: boolean
  workspace: WorkspaceState
  onClickCapture?: (event: React.MouseEvent<HTMLDivElement>) => void
}) {
  const { copy } = useI18n()
  const isPending = workspace.togglingModId === modId

  function handleSetEnabled(nextEnabled: boolean) {
    if (nextEnabled === enabled || isPending) {
      return
    }
    void workspace.toggleMod(modId)
  }

  return (
    <div
      className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/70 p-1 backdrop-blur dark:border-white/10 dark:bg-white/[0.03]"
      onClick={onClickCapture}
    >
      <Button
        type="button"
        size="sm"
        variant={enabled ? "default" : "ghost"}
        className={cn(
          "rounded-xl px-3 shadow-none",
          enabled
            ? "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            : "text-slate-600 hover:bg-muted/80 dark:text-slate-300 dark:hover:bg-white/10",
        )}
        disabled={isPending || enabled}
        onClick={() => handleSetEnabled(true)}
      >
        <CheckCircle2 className="size-4" />
        {copy.workspacePage.enabled}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={!enabled ? "secondary" : "ghost"}
        className={cn(
          "rounded-xl px-3 shadow-none",
          !enabled
            ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
            : "text-slate-600 hover:bg-muted/80 dark:text-slate-300 dark:hover:bg-white/10",
        )}
        disabled={isPending || !enabled}
        onClick={() => handleSetEnabled(false)}
      >
        {copy.workspacePage.disabled}
      </Button>
    </div>
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

function getMissingLoadedModPrerequisites(
  mods: ManagedMod[],
  prerequisites: GamePrerequisite[],
): MissingLoadedModPrerequisite[] {
  const availablePrerequisites = new Map(
    prerequisites.map((item) => [item.key.trim().toLowerCase(), item]),
  )
  const missingPrerequisites = new Map<string, MissingLoadedModPrerequisite>()

  for (const mod of mods) {
    for (const key of getRequiredPrerequisiteKeysByModType(mod.type)) {
      const prerequisite = availablePrerequisites.get(key)
      if (!prerequisite || prerequisite.detected) {
        continue
      }

      const existing = missingPrerequisites.get(prerequisite.key)
      if (existing) {
        if (!existing.requiredBy.includes(mod.name)) {
          existing.requiredBy.push(mod.name)
        }
        continue
      }

      missingPrerequisites.set(prerequisite.key, {
        ...prerequisite,
        requiredBy: [mod.name],
      })
    }
  }

  return Array.from(missingPrerequisites.values())
}

function getRequiredPrerequisiteKeysByModType(modType: ModType): string[] {
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
  return Array.from(new Set([...baseKeys, ...specificKeys]))
}

export { GameWorkspacePage }
