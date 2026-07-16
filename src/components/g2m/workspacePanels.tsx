import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FolderOpen,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { G2MPanel, G2MPill, G2MSubtlePanel } from "@/components/g2m/surface"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { UseG2mWorkspaceResult } from "@/hooks/useG2MWorkspace"
import { useModUpdateCheck } from "@/hooks/workspace/useModUpdateCheck"
import { formatGameTimestamp, resolveGameImageSrc } from "@/lib/g2m"
import { cn } from "@/lib/utils"

type WorkspaceState = UseG2mWorkspaceResult
type WorkspaceMod = WorkspaceState["mods"][number]

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

export function WorkspaceSidebar({ workspace }: { workspace: WorkspaceState }) {
  const activeGame = workspace.activeGame
  if (!activeGame) {
    return null
  }

  return (
    <div className="space-y-4">
      <GameProfilePanel workspace={workspace} activeGame={activeGame} />
      <GamePrerequisitesPanel workspace={workspace} activeGame={activeGame} />
      <GameSwitcherPanel workspace={workspace} />
    </div>
  )
}

function GameProfilePanel({
  workspace,
  activeGame,
}: {
  workspace: WorkspaceState
  activeGame: NonNullable<WorkspaceState["activeGame"]>
}) {
  const { t } = useTranslation()

  return (
    <G2MPanel>
      <div className="p-5 lg:p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">{t("workspacePage.gameInfo")}</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full hover:bg-muted dark:hover:bg-white/10"
              onClick={() => workspace.openEditGameDialog(activeGame.id)}
              title={t("workspacePage.editGameProfile")}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full hover:bg-muted dark:hover:bg-white/10"
              onClick={() => void workspace.launchGame()}
              title={t("workspacePage.launchGame")}
            >
              <Play className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full hover:bg-muted dark:hover:bg-white/10"
              onClick={() => void workspace.openGameDirectory()}
              title={t("workspacePage.openGameDirectory")}
            >
              <FolderOpen className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <DetailCardLight label={t("workspace.currentGame")} value={activeGame.shortName} />
          <DetailCardLight label="EXE" value={activeGame.exeName} />
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-sm dark:bg-white/[0.02]">
            <span className="text-slate-500 dark:text-slate-400">{t("workspacePage.addedAt")}</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{formatGameTimestamp(activeGame.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-sm dark:bg-white/[0.02]">
            <span className="text-slate-500 dark:text-slate-400">{t("workspacePage.updatedAt")}</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{formatGameTimestamp(activeGame.updatedAt)}</span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className={`flex-1 justify-center ${softOutlineButtonClass}`}
            onClick={() => void workspace.launchGame()}
          >
            <Play className="size-4" />
            {t("workspacePage.launchGame")}
          </Button>
          <Button
            variant="outline"
            className={`flex-1 justify-center ${softOutlineButtonClass}`}
            onClick={() => void workspace.refreshWorkspace()}
          >
            <RefreshCw className="size-4" />
            {t("workspacePage.refreshWorkspace")}
          </Button>
          <Button
            variant="outline"
            className={`flex-1 justify-center text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ${softOutlineButtonClass}`}
            onClick={() => workspace.openDeleteGameDialog(activeGame.id)}
          >
            <Trash2 className="size-4" />
            {t("workspacePage.deleteCurrentGame")}
          </Button>
        </div>
      </div>
    </G2MPanel>
  )
}

function GamePrerequisitesPanel({
  workspace,
  activeGame,
}: {
  workspace: WorkspaceState
  activeGame: NonNullable<WorkspaceState["activeGame"]>
}) {
  const { t } = useTranslation()
  const hasMissingInstallablePrerequisites = activeGame.prerequisites.some(
    (item) => !item.detected && item.canInstall,
  )

  return (
    <G2MPanel>
      <div className="p-5 lg:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">{t("workspacePage.prerequisitesTitle")}</h3>
            <G2MPill className="bg-background/80 px-2 py-0.5 text-xs text-slate-500 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
              {activeGame.prerequisites.length}
            </G2MPill>
          </div>
          {hasMissingInstallablePrerequisites ? (
            <Button
              size="sm"
              variant="outline"
              className={`h-7 rounded-lg px-2.5 text-xs font-medium ${softOutlineButtonClass}`}
              disabled={workspace.installingPrerequisiteKey === "all"}
              onClick={() => void workspace.installAllGamePrerequisites()}
            >
              {t("workspacePage.installAllPrerequisites")}
            </Button>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          {activeGame.prerequisites.map((item) => (
            <GamePrerequisiteRow key={item.key} item={item} workspace={workspace} />
          ))}
        </div>
      </div>
    </G2MPanel>
  )
}

function GamePrerequisiteRow({
  item,
  workspace,
}: {
  item: NonNullable<WorkspaceState["activeGame"]>["prerequisites"][number]
  workspace: WorkspaceState
}) {
  const { t } = useTranslation()

  return (
    <div className="group relative flex items-center justify-between rounded-xl border border-black/5 bg-background/50 p-3 hover:bg-muted/50 dark:border-white/5 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]">
      <div className="min-w-0 pr-3">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
            {item.label}
          </p>
          {item.required ? (
            <Badge
              variant="outline"
              className="shrink-0 rounded-full border-amber-200 bg-amber-50 px-2 py-0 text-[10px] text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"
            >
              {t("workspacePage.prerequisiteRequired")}
            </Badge>
          ) : null}
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
          {t("workspacePage.installPrerequisite")}
        </Button>
      ) : item.detected && item.canUninstall ? (
        <Button
          size="sm"
          variant="outline"
          className="h-7 shrink-0 rounded-lg px-2 text-xs font-medium"
          disabled={workspace.installingPrerequisiteKey === item.key}
          onClick={() => void workspace.uninstallGamePrerequisite(item.key)}
        >
          {t("workspacePage.uninstallPrerequisite")}
        </Button>
      ) : !item.detected ? (
        <Badge variant="outline" className="shrink-0 border-slate-200 bg-slate-50 text-[10px] text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
          {t("workspacePage.prerequisiteMissing")}
        </Badge>
      ) : null}
    </div>
  )
}

function GameSwitcherPanel({ workspace }: { workspace: WorkspaceState }) {
  const { t } = useTranslation()

  return (
    <G2MPanel>
      <div className="p-5 lg:p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">{t("home.configuredTitle")}</h3>
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
          {t("home.addGame")}
        </Button>
      </div>
    </G2MPanel>
  )
}

function GameSwitchRow({
  game,
}: {
  game: WorkspaceState["games"][number]
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
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
        {game.status === "ready" ? t("workspacePage.gameStatusReady") : t("workspacePage.gameStatusPending")}
      </Badge>
    </button>
  )
}

export function SelectedModSheet({
  workspace,
  open,
  onOpenChange,
}: {
  workspace: WorkspaceState
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const selectedMod = workspace.selectedMod
  const { t } = useTranslation()
  const { canCheckModUpdate, handleCheckModUpdate, modxLink, updateCheckState } =
    useModUpdateCheck(selectedMod)
  const [modNameDraft, setModNameDraft] = useState("")

  useEffect(() => {
    if (!open || !selectedMod) {
      return
    }

    setModNameDraft(selectedMod.name)
  }, [open, selectedMod])

  if (!selectedMod || !open) {
    return null
  }

  const activeMod = selectedMod
  const normalizedModNameDraft = modNameDraft.trim()
  const hasModNameChanged = normalizedModNameDraft !== activeMod.name.trim()
  const isSavingModName = workspace.renamingModId === activeMod.id
  const canSaveModName = Boolean(normalizedModNameDraft && hasModNameChanged && !isSavingModName)

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
                    {t("workspacePage.focusBadge")}
                  </Badge>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                    {activeMod.name}
                  </h2>
                  <p className="mt-2 leading-6 text-slate-600 dark:text-slate-300">
                    {t("workspacePage.previewDrawerDescription")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className={softOutlineButtonClass}
                  onClick={() => onOpenChange(false)}
                >
                  {t("workspacePage.close")}
                </Button>
              </div>
            </div>

            <div className={drawerBodyClass}>
              <div className="rounded-[28px] border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.9))] p-5 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.75),rgba(15,23,42,0.92))]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    {activeMod.iconBase64 ? (
                      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-border/70 bg-background/80 dark:border-white/10 dark:bg-white/[0.04]">
                        <img
                          src={activeMod.iconBase64}
                          alt={activeMod.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : null}
                    <div>
                    <SelectedModSummaryBadges mod={activeMod} />
                    <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{activeMod.description}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-border/70 bg-background/75 p-4 backdrop-blur dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    {t("workspaceDialogs.modName")}
                  </p>
                  <div className="mt-3 flex flex-col gap-3 lg:flex-row">
                    <Input
                      value={modNameDraft}
                      onChange={(event) => setModNameDraft(event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" || !canSaveModName) {
                          return
                        }

                        event.preventDefault()
                        void workspace.updateModName(activeMod.id, modNameDraft)
                      }}
                      className="h-11 rounded-2xl border-border/70 bg-background/80 shadow-none dark:border-white/10 dark:bg-white/[0.04]"
                      placeholder={t("workspaceDialogs.modName")}
                      disabled={isSavingModName}
                    />
                    <Button
                      className="cursor-pointer rounded-xl px-4"
                      disabled={!canSaveModName}
                      onClick={() => void workspace.updateModName(activeMod.id, modNameDraft)}
                    >
                      {isSavingModName ? t("workspaceDialogs.saving") : t("workspaceDialogs.saveChanges")}
                    </Button>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <ModEnabledStateButtons
                    modId={activeMod.id}
                    enabled={activeMod.enabled}
                    workspace={workspace}
                  />
                  <Button
                    variant="outline"
                    className={softOutlineButtonClass}
                    onClick={() => workspace.openDeleteModDialog(activeMod.id)}
                  >
                    <Trash2 className="size-4" />
                    {t("workspacePage.deleteCurrentMod")}
                  </Button>
                  {activeMod.conflictFiles.length > 0 ? (
                    <Button
                      variant="outline"
                      className={softOutlineButtonClass}
                      onClick={workspace.openConflictDialog}
                    >
                      <AlertTriangle className="size-4" />
                      {t("workspacePage.conflictView")}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <DetailCardLight label={t("workspaceDialogs.version")} value={activeMod.version} />
                <DetailCardLight label={t("workspacePage.author")} value={activeMod.author} />
                <DetailCardLight label={t("workspacePage.size")} value={activeMod.size} />
                <DetailCardLight label={t("workspacePage.fileCount")} value={String(activeMod.fileCount)} />
                <DetailCardLight label={t("workspacePage.importedAt")} value={activeMod.installedAt} />
              </div>

              {activeMod.modxSlug.trim() ? (
                <SelectedModUpdatePanel
                  mod={activeMod}
                  canCheckModUpdate={canCheckModUpdate}
                  modxLink={modxLink}
                  updateCheckState={updateCheckState}
                  onCheckModUpdate={() => void handleCheckModUpdate()}
                />
              ) : null}

              <SelectedModTargetFolders mod={activeMod} />

              <div className="mt-6">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("workspacePage.filePreview")}</p>
                <div className="mt-3 space-y-2">
                  {activeMod.previewFiles.map((file) => (
                    <div
                      key={`${activeMod.id}-${file}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                    >
                      {file}
                    </div>
                  ))}
                </div>
              </div>

              <SelectedModConflictPreview mod={activeMod} />
            </div>

            <div className={drawerFooterClass}>
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  variant="outline"
                  className={softOutlineButtonClass}
                  onClick={() => onOpenChange(false)}
                >
                  {t("workspacePage.close")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SelectedModSummaryBadges({ mod }: { mod: WorkspaceMod }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline" className="rounded-full bg-background/80 px-3 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
        {mod.type}
      </Badge>
      <Badge variant="outline" className="rounded-full bg-background/80 px-3 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
        {t("workspaceDialogs.version")} {mod.version}
      </Badge>
      <Badge
        variant="secondary"
        className={cn(
          "rounded-full px-3 py-1",
          mod.enabled
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
            : "bg-muted text-slate-600 dark:bg-white/10 dark:text-slate-300",
        )}
      >
        {mod.enabled ? t("workspacePage.enabledState") : t("workspacePage.disabled")}
      </Badge>
      <Badge
        variant="secondary"
        className={cn(
          "rounded-full px-3 py-1",
          mod.conflicts > 0
            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
        )}
      >
        {mod.conflicts > 0
          ? t("workspace.conflictCaption", { count: mod.conflicts })
          : t("workspacePage.statusStable")}
      </Badge>
    </div>
  )
}

function SelectedModUpdatePanel({
  mod,
  canCheckModUpdate,
  modxLink,
  updateCheckState,
  onCheckModUpdate,
}: {
  mod: WorkspaceMod
  canCheckModUpdate: boolean
  modxLink: string | null
  updateCheckState: ReturnType<typeof useModUpdateCheck>["updateCheckState"]
  onCheckModUpdate: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="mt-6 rounded-[24px] border border-border/70 bg-background/75 p-5 backdrop-blur dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t("workspacePage.updateCheckTitle")}
          </p>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            {canCheckModUpdate
              ? t("workspacePage.updateCheckDescription")
              : t("workspacePage.updateCheckVersionMissing")}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {modxLink ?? mod.modxSlug}
          </p>
        </div>
        <Button
          variant="outline"
          className={softOutlineButtonClass}
          onClick={onCheckModUpdate}
          disabled={!canCheckModUpdate || updateCheckState.status === "checking"}
        >
          <RefreshCw
            className={cn(
              "size-4",
              updateCheckState.status === "checking" && "animate-spin",
            )}
          />
          {updateCheckState.status === "checking"
            ? t("workspacePage.checkingModUpdate")
            : t("workspacePage.checkModUpdate")}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <DetailCardLight
          label={t("workspacePage.localVersion")}
          value={mod.version}
        />
        <DetailCardLight
          label={t("workspacePage.remoteVersion")}
          value={updateCheckState.remoteVersion ?? t("workspacePage.notCheckedYet")}
        />
        <DetailCardLight
          label={t("workspacePage.updateStatus")}
          value={
            updateCheckState.status !== "success"
              ? t("workspacePage.notCheckedYet")
              : updateCheckState.hasUpdate
                ? t("workspacePage.updateAvailable")
                : t("workspacePage.updateAlreadyLatest")
          }
        />
      </div>
    </div>
  )
}

function SelectedModTargetFolders({ mod }: { mod: WorkspaceMod }) {
  const { t } = useTranslation()

  return (
    <div className="mt-6">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("workspacePage.targetFolders")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {mod.targetFolders.map((folder) => (
          <Badge key={`${mod.id}-${folder}`} variant="outline" className="rounded-full bg-muted px-3 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
            {folder}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function SelectedModConflictPreview({ mod }: { mod: WorkspaceMod }) {
  const { t } = useTranslation()

  if (mod.conflictFiles.length === 0) {
    return null
  }

  return (
    <div className="mt-6">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("workspacePage.conflictSummary")}</p>
      <div className="mt-3 space-y-2">
        {mod.conflictFiles.slice(0, 4).map((conflict) => (
          <div
            key={`${mod.id}-${conflict.id}-sheet`}
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
  )
}

export function ModEnabledStateButtons({
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
  const { t } = useTranslation()
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
        {t("workspacePage.enabled")}
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
        {t("workspacePage.disabled")}
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
