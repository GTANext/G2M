import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import {
  ChevronRight,
  CheckCircle2,
  ClipboardCopy,
  FileCode2,
  FolderOpen,
  GripVertical,
  FolderTree,
  HardDriveDownload,
  PackageCheck,
  RefreshCcw,
  ScanSearch,
  Sparkles,
} from "lucide-react"
import { type DragEvent, type ReactNode, useMemo, useState } from "react"
import { toast } from "sonner"

import { useI18n } from "@/components/app/i18nProvider"
import { G2MPanel, G2MPill, G2MSubtlePanel } from "@/components/g2m/surface"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { buildModFileTree, formatFileSize, type ModFileTreeNode, type ModImportFileEntry, type ModImportPreview } from "@/lib/g2m"
import { cn } from "@/lib/utils"

type BuilderForm = {
  author: string
  name: string
  sourcePath: string
  sourceType: "directory" | "zip"
  version: string
}

const secondaryButtonClass =
  "cursor-pointer rounded-xl border-border/70 bg-background/70 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"

const TARGET_FOLDER_PRESETS = ["modloader", "plugins", "scripts", "cleo"] as const

type TargetFolderPreset = (typeof TARGET_FOLDER_PRESETS)[number]
type BuilderTreeMode = "source" | "target"
type BuilderDragPayload = {
  kind: "file" | "folder"
  mode: BuilderTreeMode
  path: string
}

function ModBuilderPage() {
  const { copy } = useI18n()
  const [form, setForm] = useState<BuilderForm>({
    author: "",
    name: "",
    sourcePath: "",
    sourceType: "directory",
    version: "",
  })
  const [preview, setPreview] = useState<ModImportPreview | null>(null)
  const [mappings, setMappings] = useState<ModImportFileEntry[]>([])
  const [draggingPayload, setDraggingPayload] = useState<BuilderDragPayload | null>(null)
  const [showDetailedMappings, setShowDetailedMappings] = useState(false)
  const [isInspecting, setIsInspecting] = useState(false)

  const hasSource = form.sourcePath.trim().length > 0
  const sourceDisplayType =
    form.sourceType === "zip" ? copy.workspaceDialogs.importSourceZip : copy.workspaceDialogs.importSourceDirectory

  const manifestPreview = useMemo(
    () =>
      JSON.stringify(
        buildManifestPayload({
          author: form.author,
          hasG2mManifest: preview?.hasG2mManifest ?? false,
          manifestPath: preview?.g2mManifestPath ?? null,
          modName: form.name,
          sourcePath: form.sourcePath,
          sourceType: form.sourceType,
          version: form.version,
          files: mappings,
        }),
        null,
        2,
      ),
    [form.author, form.name, form.sourcePath, form.sourceType, form.version, mappings, preview?.g2mManifestPath, preview?.hasG2mManifest],
  )

  async function handlePickSource(sourceType: BuilderForm["sourceType"]) {
    try {
      const selected = await open(
        sourceType === "zip"
          ? {
              multiple: false,
              title: copy.workspaceActions.chooseModArchiveTitle,
              filters: [
                {
                  name: "ZIP",
                  extensions: ["zip"],
                },
              ],
            }
          : {
              directory: true,
              multiple: false,
              title: copy.workspaceActions.chooseModDirectoryTitle,
            },
      )

      if (!selected || Array.isArray(selected)) {
        return
      }

      await inspectSource(String(selected), sourceType)
    } catch (error) {
      toast.error(copy.builderPage.inspectFailed, {
        description: formatErrorMessage(error),
      })
    }
  }

  async function inspectSource(selectedPath: string, preferredType?: BuilderForm["sourceType"]) {
    const guessedName = getSourceDisplayName(selectedPath)
    const sourceType = preferredType ?? inferSourceType(selectedPath)
    let toastId: string | number | undefined

    try {
      setIsInspecting(true)
      setPreview(null)
      toastId = toast.loading(copy.builderPage.inspectSource)

      const inspected = await invoke<ModImportPreview>("inspect_mod_source", {
        modPath: selectedPath,
        modName: guessedName || undefined,
      })

      setForm((current) => ({
        ...current,
        sourcePath: selectedPath,
        sourceType,
        name: current.name.trim() ? current.name : inspected.name || guessedName,
      }))
      setPreview(inspected)
      setMappings(inspected.files)
      setShowDetailedMappings(false)

      toast.success(copy.builderPage.sourceReady, {
        id: toastId,
        description: inspected.name || guessedName || selectedPath,
      })
    } catch (error) {
      setPreview(null)
      setMappings([])
      setShowDetailedMappings(false)
      setForm((current) => ({
        ...current,
        sourcePath: selectedPath,
        sourceType,
        name: current.name.trim() ? current.name : guessedName,
      }))
      toast.error(copy.builderPage.inspectFailed, {
        id: toastId,
        description: formatErrorMessage(error),
      })
    } finally {
      setIsInspecting(false)
    }
  }

  function handleResetMappings() {
    if (!preview) {
      return
    }

    setMappings(preview.files)
    setShowDetailedMappings(false)
  }

  function handleCopyManifest() {
    void navigator.clipboard.writeText(manifestPreview).then(
      () =>
        toast.success(copy.builderPage.copied, {
          description: `${form.name || copy.workspaceDialogs.modName} · g2m.json`,
        }),
      (error) =>
        toast.error(copy.builderPage.inspectFailed, {
          description: formatErrorMessage(error),
        }),
    )
  }

  function updateMappingTarget(index: number, targetPath: string) {
    setMappings((current) =>
      current.map((file, currentIndex) =>
        currentIndex === index
          ? {
              ...file,
              targetPath,
              targetFolder: inferTargetFolder(targetPath),
            }
          : file,
      ),
    )
  }

  function moveMappingToPreset(relativePath: string, nextRoot: TargetFolderPreset) {
    setMappings((current) =>
      current.map((file) =>
        file.relativePath === relativePath
          ? {
              ...file,
              targetPath: replaceTargetRoot(file, nextRoot),
              targetFolder: nextRoot,
            }
          : file,
      ),
    )
  }

  function handleMappingDragStart(payload: BuilderDragPayload, event: DragEvent<HTMLElement>) {
    event.dataTransfer.effectAllowed = "move"
    const serialized = JSON.stringify(payload)
    event.dataTransfer.setData("application/g2m-builder-tree", serialized)
    event.dataTransfer.setData("text/plain", serialized)
    setDraggingPayload(payload)
  }

  function handleMappingDragEnd() {
    setDraggingPayload(null)
  }

  function handleDropToFolder(destinationFolder: string, event: DragEvent<HTMLElement>) {
    event.preventDefault()
    const payload = readBuilderDragPayload(event)
    setDraggingPayload(null)
    if (!payload) {
      return
    }

    setMappings((current) => moveBuilderEntries(current, payload, destinationFolder))
  }

  return (
    <div className="mx-auto max-w-[1700px] space-y-6">
      <G2MPanel>
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between lg:p-7">
          <div className="max-w-5xl">
            <G2MPill className="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
              {copy.builderPage.badge}
            </G2MPill>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              {copy.builderPage.heroTitle}
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              {copy.builderPage.heroDescription}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <StatusPill label={copy.builderPage.sourceType} value={sourceDisplayType} />
              <StatusPill
                label={copy.workspacePage.fileCount}
                value={preview ? String(mappings.length) : copy.demo.pendingScan}
              />
              <StatusPill
                label={copy.workspacePage.size}
                value={preview ? formatFileSize(preview.sizeBytes) : "0 B"}
              />
              <StatusPill
                label={copy.workspaceDialogs.manifestStatus}
                value={
                  preview
                    ? preview.hasG2mManifest
                      ? copy.workspaceDialogs.manifestDetected
                      : copy.workspaceDialogs.manifestMissing
                    : copy.workspaceDialogs.notDetectedYet
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className={`px-4 ${secondaryButtonClass}`}
              onClick={() => void handlePickSource("directory")}
              disabled={isInspecting}
            >
              <FolderOpen className="size-4" />
              {copy.builderPage.chooseFolder}
            </Button>
            <Button
              variant="outline"
              className={`px-4 ${secondaryButtonClass}`}
              onClick={() => void handlePickSource("zip")}
              disabled={isInspecting}
            >
              <HardDriveDownload className="size-4" />
              {copy.builderPage.chooseZip}
            </Button>
            <Button
              variant="outline"
              className={`px-4 ${secondaryButtonClass}`}
              onClick={() => void inspectSource(form.sourcePath, form.sourceType)}
              disabled={!hasSource || isInspecting}
            >
              <ScanSearch className="size-4" />
              {copy.builderPage.inspectSource}
            </Button>
          </div>
        </div>
      </G2MPanel>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <G2MPanel className="p-5 lg:p-6">
            <SectionHeading
              title={copy.builderPage.metadataTitle}
              icon={<PackageCheck className="size-5" />}
            />

            <div className="mt-5 space-y-4">
              <FieldBlock label={copy.builderPage.sourcePath}>
                <Input
                  value={form.sourcePath}
                  readOnly
                  placeholder={copy.builderPage.sourcePlaceholder}
                  className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                />
              </FieldBlock>

              <FieldBlock label={copy.workspaceDialogs.modName}>
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.currentTarget.value,
                    }))
                  }
                  placeholder={copy.workspaceDialogs.modName}
                  className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                />
              </FieldBlock>

              <FieldBlock label={copy.builderPage.modVersion}>
                <Input
                  value={form.version}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      version: event.currentTarget.value,
                    }))
                  }
                  placeholder={copy.builderPage.modVersionPlaceholder}
                  className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                />
              </FieldBlock>

              <FieldBlock label={copy.builderPage.modAuthor}>
                <Input
                  value={form.author}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      author: event.currentTarget.value,
                    }))
                  }
                  placeholder={copy.builderPage.modAuthorPlaceholder}
                  className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                />
              </FieldBlock>
            </div>
          </G2MPanel>

          <G2MPanel className="p-5 lg:p-6">
            <SectionHeading
              title={copy.workspaceDialogs.manifestStatus}
              icon={<Sparkles className="size-5" />}
            />

            <div className="mt-5 space-y-3">
              <BuilderInfoCard
                label={copy.builderPage.sourceType}
                value={sourceDisplayType}
              />
              <BuilderInfoCard
                label={copy.builderPage.sourcePath}
                value={form.sourcePath || copy.builderPage.sourceWaiting}
                breakAll
              />
              <BuilderInfoCard
                label={copy.workspaceDialogs.manifestStatus}
                value={
                  preview
                    ? preview.hasG2mManifest
                      ? copy.workspaceDialogs.manifestDetected
                      : copy.workspaceDialogs.manifestMissing
                    : copy.workspaceDialogs.notDetectedYet
                }
              />
              {preview?.g2mManifestPath ? (
                <BuilderInfoCard
                  label="g2m.json"
                  value={preview.g2mManifestPath}
                  breakAll
                />
              ) : null}
            </div>
          </G2MPanel>
        </aside>

        <div className="space-y-5">
          <G2MPanel className="p-5 lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <SectionHeading
                title={copy.builderPage.mappingTitle}
                icon={<FolderTree className="size-5" />}
              />
              <Button
                variant="outline"
                className={`px-4 ${secondaryButtonClass}`}
                onClick={handleResetMappings}
                disabled={!preview}
              >
                <RefreshCcw className="size-4" />
                {copy.builderPage.resetMappings}
              </Button>
            </div>

            {!preview ? (
              <EmptyStateCard
                title={isInspecting ? copy.builderPage.inspectSource : copy.builderPage.sourceWaiting}
                description={isInspecting ? copy.workspaceActions.previewingMod : copy.builderPage.sourcePlaceholder}
              />
            ) : (
              <>
                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  <BuilderTreeCard
                    title={copy.builderPage.sourceTreeTitle}
                    files={mappings}
                    mode="source"
                    emptyLabel={copy.demo.previewPending}
                    draggingPayload={draggingPayload}
                    onFileDragEnd={handleMappingDragEnd}
                    onFileDragStart={handleMappingDragStart}
                    onDropToFolder={handleDropToFolder}
                  />
                  <BuilderTreeCard
                    title={copy.builderPage.targetTreeTitle}
                    files={mappings}
                    mode="target"
                    emptyLabel={copy.demo.targetPending}
                    draggingPayload={draggingPayload}
                    onFileDragEnd={handleMappingDragEnd}
                    onFileDragStart={handleMappingDragStart}
                    onDropToFolder={handleDropToFolder}
                  />
                </div>

                <G2MSubtlePanel className="mt-4 p-4">
                  <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                      <FileCode2 className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{copy.builderPage.mappingTitle}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {copy.workspacePage.fileCount} {mappings.length}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      {copy.workspacePage.targetFolders}
                    </p>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {TARGET_FOLDER_PRESETS.map((folder) => (
                      <TargetFolderDropZone
                        key={folder}
                        folder={folder}
                        fileCount={mappings.filter((file) => inferTargetFolder(file.targetPath).toLowerCase() === folder).length}
                        fileCountLabel={copy.workspacePage.fileCount}
                        isDragging={draggingPayload !== null}
                        onDragEnd={handleMappingDragEnd}
                        onDropToFolder={handleDropToFolder}
                      />
                    ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                        {copy.builderPage.mappingTitle}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {copy.workspacePage.fileCount} {mappings.length}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className={`px-4 ${secondaryButtonClass}`}
                      onClick={() => setShowDetailedMappings((current) => !current)}
                    >
                      <ChevronRight className={cn("size-4 transition-transform", showDetailedMappings && "rotate-90")} />
                      {showDetailedMappings ? copy.builderPage.hideMappingDetails : copy.builderPage.showMappingDetails}
                    </Button>
                  </div>

                  {showDetailedMappings ? (
                    <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
                      {mappings.map((file, index) => (
                        <BuilderMappingItemCard
                          key={`${file.relativePath}-${index}`}
                          file={file}
                          index={index}
                          draggingPayload={draggingPayload}
                          onDragEnd={handleMappingDragEnd}
                          onDragStart={handleMappingDragStart}
                          onMoveToPreset={moveMappingToPreset}
                          targetFoldersLabel={copy.workspacePage.targetFolders}
                          targetPendingLabel={copy.demo.targetPending}
                          onUpdateTarget={updateMappingTarget}
                        />
                      ))}
                    </div>
                  ) : null}
                </G2MSubtlePanel>
              </>
            )}
          </G2MPanel>

          <G2MPanel className="p-5 lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <SectionHeading
                title={copy.builderPage.generatedJsonTitle}
                icon={<FileCode2 className="size-5" />}
              />
              <Button
                className="cursor-pointer rounded-xl px-4"
                onClick={handleCopyManifest}
                disabled={!preview}
              >
                <ClipboardCopy className="size-4" />
                {copy.builderPage.copyJson}
              </Button>
            </div>

            <div className="mt-5">
              <Textarea
                value={manifestPreview}
                readOnly
                className="min-h-[420px] rounded-[22px] border-border/70 bg-background/70 font-mono text-sm leading-6 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
              />
            </div>
          </G2MPanel>
        </div>
      </div>
    </div>
  )
}

function SectionHeading({
  title,
  icon,
}: {
  title: string
  icon: ReactNode
}) {
  return (
    <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
        {icon}
      </div>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      </div>
    </div>
  )
}

function FieldBlock({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      {children}
    </div>
  )
}

function BuilderInfoCard({
  label,
  value,
  breakAll = false,
}: {
  label: string
  value: string
  breakAll?: boolean
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p
        className={
          breakAll
            ? "mt-2 break-all text-sm font-medium text-slate-900 dark:text-slate-100"
            : "mt-2 text-sm font-medium text-slate-900 dark:text-slate-100"
        }
      >
        {value}
      </p>
    </div>
  )
}

function BuilderTreeCard({
  title,
  files,
  mode,
  emptyLabel,
  draggingPayload,
  onFileDragStart,
  onFileDragEnd,
  onDropToFolder,
}: {
  title: string
  files: ModImportFileEntry[]
  mode: BuilderTreeMode
  emptyLabel: string
  draggingPayload: BuilderDragPayload | null
  onFileDragStart: (payload: BuilderDragPayload, event: DragEvent<HTMLElement>) => void
  onFileDragEnd: () => void
  onDropToFolder: (destinationFolder: string, event: DragEvent<HTMLElement>) => void
}) {
  return (
    <G2MSubtlePanel className="p-4">
      <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
          <FolderTree className="size-4" />
        </div>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <div className="mt-4 max-h-[360px] overflow-y-auto pr-1">
        <BuilderDraggableTree
          files={files}
          mode={mode}
          emptyLabel={emptyLabel}
          draggingPayload={draggingPayload}
          onFileDragEnd={onFileDragEnd}
          onFileDragStart={onFileDragStart}
          onDropToFolder={onDropToFolder}
        />
      </div>
    </G2MSubtlePanel>
  )
}

function BuilderDraggableTree({
  files,
  mode,
  emptyLabel,
  draggingPayload,
  onFileDragStart,
  onFileDragEnd,
  onDropToFolder,
}: {
  files: ModImportFileEntry[]
  mode: BuilderTreeMode
  emptyLabel: string
  draggingPayload: BuilderDragPayload | null
  onFileDragStart: (payload: BuilderDragPayload, event: DragEvent<HTMLElement>) => void
  onFileDragEnd: () => void
  onDropToFolder: (destinationFolder: string, event: DragEvent<HTMLElement>) => void
}) {
  const tree = useMemo(() => buildModFileTree(files, mode), [files, mode])

  if (tree.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 p-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {tree.map((node) => (
        <BuilderDraggableTreeNode
          key={node.key}
          node={node}
          depth={0}
          mode={mode}
          draggingPayload={draggingPayload}
          onFileDragEnd={onFileDragEnd}
          onFileDragStart={onFileDragStart}
          onDropToFolder={onDropToFolder}
        />
      ))}
    </div>
  )
}

function BuilderDraggableTreeNode({
  node,
  depth,
  mode,
  draggingPayload,
  onFileDragStart,
  onFileDragEnd,
  onDropToFolder,
}: {
  node: ModFileTreeNode
  depth: number
  mode: BuilderTreeMode
  draggingPayload: BuilderDragPayload | null
  onFileDragStart: (payload: BuilderDragPayload, event: DragEvent<HTMLElement>) => void
  onFileDragEnd: () => void
  onDropToFolder: (destinationFolder: string, event: DragEvent<HTMLElement>) => void
}) {
  const isFolder = node.kind === "folder"
  const [isExpanded, setIsExpanded] = useState(false)
  const nodeDragPath = node.file?.relativePath ?? node.fullPath
  const isDragging = draggingPayload?.path === nodeDragPath

  return (
    <div>
      <div
        className={cn(
          "flex items-start gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 ring-1 ring-black/5 transition-colors dark:text-slate-200 dark:ring-white/10",
          isFolder
            ? "cursor-pointer bg-slate-50/80 hover:bg-slate-100/80 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
            : "cursor-grab bg-background/80 hover:bg-slate-50 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]",
          isDragging && "border-violet-300 bg-violet-50/70 dark:border-violet-400/40 dark:bg-violet-500/10",
        )}
        style={{ marginLeft: depth * 14 }}
        onClick={isFolder ? () => setIsExpanded((current) => !current) : undefined}
        onDragOver={
          mode === "target" && isFolder
            ? (event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = "move"
              }
            : undefined
        }
        onDrop={mode === "target" && isFolder ? (event) => onDropToFolder(node.fullPath, event) : undefined}
        draggable={!isFolder}
        onDragEnd={!isFolder ? onFileDragEnd : undefined}
        onDragStart={
          !isFolder && node.file
            ? (event) =>
                onFileDragStart(
                  {
                    kind: "file",
                    mode,
                    path: mode === "source" ? node.file!.relativePath : node.file!.targetPath,
                  },
                  event,
                )
            : undefined
        }
      >
        {isFolder ? (
          <>
            <ChevronRight
              className={cn(
                "mt-0.5 size-4 shrink-0 text-slate-400 transition-transform dark:text-slate-500",
                isExpanded && "rotate-90",
              )}
            />
            <FolderTree className="mt-0.5 size-4 shrink-0 text-violet-600 dark:text-violet-300" />
          </>
        ) : (
          <>
            <GripVertical className="mt-0.5 size-4 shrink-0 text-slate-400 dark:text-slate-500" />
            <FileCode2 className="mt-0.5 size-4 shrink-0 text-slate-500 dark:text-slate-400" />
          </>
        )}
        <div className="min-w-0 flex-1">
          <p className="break-all font-medium">{node.name}</p>
          {!isFolder && node.file ? (
            <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">
              {node.file.targetPath}
            </p>
          ) : null}
        </div>
      </div>

      {isFolder && isExpanded && node.children.length > 0 ? (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => (
            <BuilderDraggableTreeNode
              key={child.key}
              node={child}
              depth={depth + 1}
              mode={mode}
              draggingPayload={draggingPayload}
              onFileDragEnd={onFileDragEnd}
              onFileDragStart={onFileDragStart}
              onDropToFolder={onDropToFolder}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function TargetFolderDropZone({
  folder,
  fileCount,
  fileCountLabel,
  isDragging,
  onDragEnd,
  onDropToFolder,
}: {
  folder: TargetFolderPreset
  fileCount: number
  fileCountLabel: string
  isDragging: boolean
  onDragEnd: () => void
  onDropToFolder: (destinationFolder: string, event: DragEvent<HTMLElement>) => void
}) {
  const [isOver, setIsOver] = useState(false)

  return (
    <div
      className={cn(
        "rounded-2xl border border-black/5 bg-white/70 p-4 transition-colors dark:border-white/10 dark:bg-white/[0.04]",
        isDragging && "border-dashed",
        isOver && "border-violet-300 bg-violet-50/70 dark:border-violet-400/40 dark:bg-violet-500/10",
      )}
      onDragEnter={(event) => {
        event.preventDefault()
        setIsOver(true)
      }}
      onDragLeave={() => setIsOver(false)}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
      }}
      onDrop={(event) => {
        setIsOver(false)
        onDropToFolder(folder, event)
        onDragEnd()
      }}
    >
      <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
          <FolderTree className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{folder}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {fileCountLabel} {fileCount}
          </p>
        </div>
      </div>
    </div>
  )
}

function BuilderMappingItemCard({
  file,
  index,
  draggingPayload,
  onDragStart,
  onDragEnd,
  onMoveToPreset,
  targetFoldersLabel,
  targetPendingLabel,
  onUpdateTarget,
}: {
  file: ModImportFileEntry
  index: number
  draggingPayload: BuilderDragPayload | null
  onDragStart: (payload: BuilderDragPayload, event: DragEvent<HTMLElement>) => void
  onDragEnd: () => void
  onMoveToPreset: (relativePath: string, nextRoot: TargetFolderPreset) => void
  targetFoldersLabel: string
  targetPendingLabel: string
  onUpdateTarget: (index: number, targetPath: string) => void
}) {
  const isDragging = draggingPayload?.kind === "file" && draggingPayload.path === file.targetPath

  return (
    <div
      className={cn(
        "rounded-2xl border border-black/5 bg-white/70 p-4 transition-colors dark:border-white/10 dark:bg-white/[0.04]",
        isDragging && "border-violet-300 bg-violet-50/70 dark:border-violet-400/40 dark:bg-violet-500/10",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex size-9 shrink-0 cursor-grab items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950"
          draggable
          onDragEnd={onDragEnd}
          onDragStart={(event) =>
            onDragStart(
              {
                kind: "file",
                mode: "target",
                path: file.targetPath,
              },
              event,
            )}
        >
          <GripVertical className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-all text-sm font-semibold text-slate-950 dark:text-slate-50">
            {file.relativePath}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {targetFoldersLabel}: {file.targetFolder || targetPendingLabel}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)]">
        <Select
          value={isTargetFolderPreset(file.targetFolder) ? file.targetFolder : undefined}
          onValueChange={(value) => onMoveToPreset(file.relativePath, value as TargetFolderPreset)}
        >
          <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background/70 px-3 shadow-none dark:border-white/10 dark:bg-white/[0.04]">
            <SelectValue placeholder={targetFoldersLabel} />
          </SelectTrigger>
          <SelectContent>
            {TARGET_FOLDER_PRESETS.map((folder) => (
              <SelectItem key={folder} value={folder}>
                {folder}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={file.targetPath}
          onChange={(event) => onUpdateTarget(index, event.currentTarget.value)}
          className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
        />
      </div>
    </div>
  )
}

function EmptyStateCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <G2MSubtlePanel className="mt-5 p-8">
      <div className="flex flex-col items-start gap-4">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
          <CheckCircle2 className="size-5" />
        </div>
        <div>
          <p className="text-lg font-semibold text-slate-950 dark:text-slate-50">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
        </div>
      </div>
    </G2MSubtlePanel>
  )
}

function StatusPill({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <Badge
      variant="secondary"
      className="rounded-full bg-white/80 px-3 py-1 text-slate-700 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10"
    >
      <span className="text-slate-400 dark:text-slate-500">{label}</span>
      <span className="ml-2">{value}</span>
    </Badge>
  )
}

function buildManifestPayload({
  author,
  files,
  hasG2mManifest,
  manifestPath,
  modName,
  sourcePath,
  sourceType,
  version,
}: {
  author: string
  files: ModImportFileEntry[]
  hasG2mManifest: boolean
  manifestPath: string | null
  modName: string
  sourcePath: string
  sourceType: BuilderForm["sourceType"]
  version: string
}) {
  const normalizedName = modName.trim()
  const normalizedVersion = version.trim()
  const normalizedAuthor = author.trim()

  return {
    manifestVersion: 1,
    mod: {
      name: normalizedName,
      ...(normalizedVersion ? { version: normalizedVersion } : {}),
      ...(normalizedAuthor ? { author: normalizedAuthor } : {}),
    },
    source: {
      path: sourcePath,
      type: sourceType,
      hasExistingManifest: hasG2mManifest,
      ...(manifestPath ? { existingManifestPath: manifestPath } : {}),
    },
    files: files.map((file) => ({
      path: file.relativePath,
      installTo: file.targetPath,
    })),
  }
}

function inferSourceType(selectedPath: string): BuilderForm["sourceType"] {
  return selectedPath.toLowerCase().endsWith(".zip") ? "zip" : "directory"
}

function getSourceDisplayName(selectedPath: string): string {
  const segments = selectedPath.split(/[\\/]/).filter(Boolean)
  const lastSegment = segments[segments.length - 1] ?? ""
  return lastSegment.replace(/\.zip$/i, "")
}

function inferTargetFolder(targetPath: string): string {
  const normalized = targetPath.replace(/\\/g, "/").replace(/^\/+/, "")
  return normalized.split("/").filter(Boolean)[0] ?? ""
}

function replaceTargetRoot(file: ModImportFileEntry, nextRoot: TargetFolderPreset): string {
  const normalizedTargetPath = normalizePath(file.targetPath)
  const normalizedRelativePath = normalizePath(file.relativePath)
  const currentRoot = inferTargetFolder(normalizedTargetPath)
  const lowerCurrentRoot = currentRoot.toLowerCase()
  const remainder =
    lowerCurrentRoot && normalizedTargetPath.toLowerCase().startsWith(`${lowerCurrentRoot}/`)
      ? normalizedTargetPath.slice(currentRoot.length + 1)
      : normalizedRelativePath

  return joinPathSegments(nextRoot, remainder || normalizedRelativePath)
}

function readBuilderDragPayload(event: DragEvent<HTMLElement>): BuilderDragPayload | null {
  const rawPayload =
    event.dataTransfer.getData("application/g2m-builder-tree") ||
    event.dataTransfer.getData("text/plain")
  if (!rawPayload) {
    return null
  }

  try {
    return JSON.parse(rawPayload) as BuilderDragPayload
  } catch {
    return null
  }
}

function moveBuilderEntries(
  files: ModImportFileEntry[],
  payload: BuilderDragPayload,
  destinationFolder: string,
): ModImportFileEntry[] {
  const normalizedDestination = normalizePath(destinationFolder)
  if (!normalizedDestination) {
    return files
  }

  return files.map((file) => {
    const nextTargetPath = buildMovedBuilderTargetPath(file, payload, normalizedDestination)
    if (!nextTargetPath || nextTargetPath === file.targetPath) {
      return file
    }

    return {
      ...file,
      targetPath: nextTargetPath,
      targetFolder: inferTargetFolder(nextTargetPath),
    }
  })
}

function buildMovedBuilderTargetPath(
  file: ModImportFileEntry,
  payload: BuilderDragPayload,
  destinationFolder: string,
): string | null {
  if (payload.mode === "source") {
    const normalizedRelativePath = normalizePath(file.relativePath)
    if (normalizePath(payload.path) !== normalizedRelativePath) {
      return null
    }

    return joinPathSegments(destinationFolder, getPathBaseName(file.relativePath))
  }

  const normalizedTargetPath = normalizePath(file.targetPath)
  if (normalizePath(payload.path) !== normalizedTargetPath) {
    return null
  }

  return joinPathSegments(destinationFolder, getPathBaseName(file.targetPath))
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/")
}

function joinPathSegments(...segments: string[]): string {
  return segments
    .map((segment) => normalizePath(segment))
    .filter(Boolean)
    .join("/")
}

function getPathBaseName(path: string): string {
  const normalized = normalizePath(path)
  const segments = normalized.split("/").filter(Boolean)
  return segments[segments.length - 1] ?? normalized
}

function isTargetFolderPreset(value: string): value is TargetFolderPreset {
  return TARGET_FOLDER_PRESETS.includes(value as TargetFolderPreset)
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

export { ModBuilderPage }
