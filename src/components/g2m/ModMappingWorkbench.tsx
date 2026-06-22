import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import { FolderTree, RefreshCcw, Sparkles } from "lucide-react"

import type { AppCopy } from "@/components/app/i18nProvider"
import {
  type DragPayload,
  normalizePath,
  TARGET_FOLDER_PRESETS,
  TargetPresetDropZone,
} from "@/components/g2m/draggableTree"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ModImportFileEntry, ModMappingSummary } from "@/lib/g2m"
import { buildModMappingSummaries } from "@/lib/g2m"

type SummaryTargetState = {
  options?: Array<{ label: string; value: string }>
  selectedValues?: string[]
  onToggle?: (value: string) => void
}

type ModMappingWorkbenchProps = {
  copy: AppCopy
  files: ModImportFileEntry[]
  headerTitle?: string
  headerDescription?: string
  headerBadges?: ReactNode
  initialTargetFolders?: string[]
  sourceTreeDescription?: string
  targetDescription?: string
  summaryDescription?: string
  onDropToFolder: (targetFolder: string, payload: DragPayload) => void
  onResetMappings?: () => void
  emptyTargetLabel: string
  getSummaryTargetState?: (summaryId: string) => SummaryTargetState
}

const EMPTY_TARGET_FOLDERS: string[] = []

function ModMappingWorkbench({
  copy,
  files,
  headerTitle,
  headerDescription,
  headerBadges,
  initialTargetFolders = EMPTY_TARGET_FOLDERS,
  targetDescription,
  summaryDescription,
  onDropToFolder,
  onResetMappings,
  emptyTargetLabel,
  getSummaryTargetState,
}: ModMappingWorkbenchProps) {
  const [customTargetFolders, setCustomTargetFolders] = useState<string[]>([])
  const summaries = useMemo(() => buildModMappingSummaries(files), [files])
  const normalizedInitialTargetFolders = useMemo(
    () => buildTargetFolderList(initialTargetFolders),
    [initialTargetFolders],
  )
  const initialTargetFoldersKey = useMemo(
    () => normalizedInitialTargetFolders.join("|"),
    [normalizedInitialTargetFolders],
  )
  const targetFolders = useMemo(
    () =>
      buildTargetFolderList(
        TARGET_FOLDER_PRESETS,
        normalizedInitialTargetFolders,
        customTargetFolders,
        files.map((file) => file.targetFolder),
      ),
    [customTargetFolders, files, normalizedInitialTargetFolders],
  )
  const visibleTargetFolders = useMemo(
    () => buildTargetFolderList(TARGET_FOLDER_PRESETS, normalizedInitialTargetFolders),
    [normalizedInitialTargetFolders],
  )
  const hasTargetOptions = useMemo(
    () =>
      summaries.some(
        (summary) => (getSummaryTargetState?.(summary.id)?.options?.length ?? 0) > 0,
      ),
    [getSummaryTargetState, summaries],
  )

  useEffect(() => {
    setCustomTargetFolders((current) => (current.length > 0 ? [] : current))
  }, [initialTargetFoldersKey])

  function folderFileCount(folder: string): number {
    const normalizedFolder = normalizePath(folder).toLowerCase()
    return files.filter((file) =>
      file.targetPath.toLowerCase().startsWith(`${normalizedFolder}/`),
    ).length
  }

  function handleCreateFolder(folder: string) {
    const normalizedFolder = normalizePath(folder.trim())
    if (!normalizedFolder) {
      return
    }
    setCustomTargetFolders((current) =>
      current.some((item) => item.toLowerCase() === normalizedFolder.toLowerCase())
        ? current
        : [...current, normalizedFolder],
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] lg:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <Sparkles className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-slate-950 dark:text-slate-50">
                  {headerTitle ?? copy.builderPage.mappingTitle}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {headerDescription ?? copy.workspacePage.detailHint}
                </p>
              </div>
            </div>
            {headerBadges ? <div className="flex flex-wrap gap-2">{headerBadges}</div> : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="rounded-full bg-background/80 px-3 py-1 text-slate-700 dark:bg-white/10 dark:text-slate-200"
            >
              {copy.workspacePage.fileCount} {files.length}
            </Badge>
            <Badge
              variant="secondary"
              className="rounded-full bg-background/80 px-3 py-1 text-slate-700 dark:bg-white/10 dark:text-slate-200"
            >
              {copy.workspacePage.targetFolders} {targetFolders.length}
            </Badge>
            <Badge
              variant="secondary"
              className="rounded-full bg-background/80 px-3 py-1 text-slate-700 dark:bg-white/10 dark:text-slate-200"
            >
              {copy.builderPage.mappingTitle} {summaries.length}
            </Badge>
            {onResetMappings ? (
              <Button
                variant="outline"
                className="cursor-pointer rounded-xl"
                onClick={onResetMappings}
              >
                <RefreshCcw className="size-4" />
                {copy.builderPage.resetMappings}
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <WorkbenchPanel
        title={copy.workspacePage.targetFolders}
        description={targetDescription ?? copy.workspaceDialogs.installPath}
        icon={<FolderTree className="size-4" />}
        headerAction={
          <Badge
            variant="secondary"
            className="rounded-full bg-background/80 px-3 py-1 text-slate-700 dark:bg-white/10 dark:text-slate-200"
          >
            {copy.workspacePage.targetFolders} {targetFolders.length}
          </Badge>
        }
      >
        <TargetPresetDropZone
          folders={visibleTargetFolders}
          fileCount={folderFileCount}
          fileCountLabel={copy.workspacePage.fileCount}
          onDropToFolder={onDropToFolder}
          onCreateFolder={handleCreateFolder}
          createFolderLabel={copy.workspaceDialogs.addTargetFolder}
          customFolderLabel={copy.workspaceDialogs.customTargetFolder}
          customFolderPlaceholder={copy.workspaceDialogs.customTargetFolderPlaceholder}
        />
      </WorkbenchPanel>

      <WorkbenchPanel
        title={copy.builderPage.mappingTitle}
        description={summaryDescription ?? copy.workspacePage.detailHint}
        icon={<Sparkles className="size-4" />}
        headerAction={
          <Badge
            variant="secondary"
            className="rounded-full bg-background/80 px-3 py-1 text-slate-700 dark:bg-white/10 dark:text-slate-200"
          >
            {copy.workspacePage.fileCount} {files.length}
          </Badge>
        }
      >
        <div className="overflow-hidden rounded-xl border border-black/5 dark:border-white/10">
          <Table>
            <TableHeader className="bg-slate-50/90 dark:bg-white/[0.03]">
              <TableRow className="hover:bg-transparent">
                <TableHead>{copy.builderPage.sourceTreeTitle}</TableHead>
                <TableHead className="w-[220px]">{copy.workspaceDialogs.targetPath}</TableHead>
                <TableHead>{copy.workspaceDialogs.installPath}</TableHead>
                <TableHead className="w-[120px]">{copy.builderPage.sourceType}</TableHead>
                <TableHead className="w-[120px]">{copy.workspacePage.fileCount}</TableHead>
                {hasTargetOptions ? (
                  <TableHead className="w-[240px]">{copy.builderPage.gameTargets}</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.length > 0 ? (
                summaries.map((summary) => (
                  <MappingTableRow
                    key={`mapping-row-${summary.id}`}
                    copy={copy}
                    summary={summary}
                    targetFolders={targetFolders}
                    onMoveToFolder={onDropToFolder}
                    targetState={getSummaryTargetState?.(summary.id)}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={hasTargetOptions ? 6 : 5}
                    className="py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    {emptyTargetLabel}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </WorkbenchPanel>
    </div>
  )
}

function buildTargetFolderList(...groups: string[][]) {
  const result: string[] = []
  const seen = new Set<string>()

  for (const group of groups) {
    for (const item of group) {
      const normalized = normalizePath(item)
      if (!normalized || seen.has(normalized)) {
        continue
      }
      seen.add(normalized)
      result.push(normalized)
    }
  }

  return result
}

function WorkbenchPanel({
  title,
  description,
  icon,
  headerAction,
  children,
}: {
  title: string
  description: string
  icon: ReactNode
  headerAction?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-background/80 text-slate-700 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
              {title}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>
        {headerAction}
      </div>
      <div className="mt-4 max-h-[460px] overflow-y-auto pr-1">
        {children}
      </div>
    </section>
  )
}

function MappingTableRow({
  copy,
  summary,
  targetFolders,
  onMoveToFolder,
  targetState,
}: {
  copy: AppCopy
  summary: ModMappingSummary
  targetFolders: string[]
  onMoveToFolder: (targetFolder: string, payload: DragPayload) => void
  targetState?: SummaryTargetState
}) {
  const payload: DragPayload = {
    kind: summary.kind,
    mode: "target",
    path: summary.targetPath,
  }

  return (
    <TableRow>
      <TableCell className="whitespace-normal align-top">
        <div className="space-y-1">
          <p className="break-all font-medium text-slate-950 dark:text-slate-50">
            {summary.sourcePath}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {summary.kind === "folder" ? copy.builderPage.summaryFolder : copy.builderPage.summaryFile}
          </p>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <select
          value={summary.targetFolder}
          onChange={(event) => onMoveToFolder(event.currentTarget.value, payload)}
          className="h-9 w-full min-w-0 rounded-lg border border-black/10 bg-background/80 px-3 text-sm text-slate-800 outline-none transition-colors [color-scheme:light] focus:border-violet-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:[color-scheme:dark] dark:focus:border-violet-300"
          aria-label={copy.workspaceDialogs.targetPath}
        >
          {targetFolders.map((folder) => (
            <option
              key={`${summary.id}-${folder}`}
              value={folder}
              className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100"
            >
              {folder}
            </option>
          ))}
        </select>
      </TableCell>
      <TableCell className="whitespace-normal align-top">
        <p className="break-all font-medium text-slate-800 dark:text-slate-200">
          {summary.targetPath}
        </p>
      </TableCell>
      <TableCell className="align-top">
        <Badge
          variant="secondary"
          className="rounded-full bg-background/80 px-2.5 py-1 text-xs dark:bg-white/10"
        >
          {summary.kind === "folder" ? copy.builderPage.summaryFolder : copy.builderPage.summaryFile}
        </Badge>
      </TableCell>
      <TableCell className="align-top text-sm font-medium text-slate-700 dark:text-slate-300">
        {summary.fileCount}
      </TableCell>
      {targetState?.options?.length ? (
        <TableCell className="whitespace-normal align-top">
          <div className="flex flex-wrap gap-2">
            {targetState.options.map((option) => {
              const isSelected = targetState.selectedValues?.includes(option.value) ?? false
              return (
                <Button
                  key={`${summary.id}-${option.value}`}
                  variant={isSelected ? "default" : "outline"}
                  className="h-8 cursor-pointer rounded-lg px-2.5 text-xs"
                  onClick={() => targetState.onToggle?.(option.value)}
                >
                  {option.label}
                </Button>
              )
            })}
          </div>
        </TableCell>
      ) : null}
    </TableRow>
  )
}

export { ModMappingWorkbench }
