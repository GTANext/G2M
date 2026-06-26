import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import { FolderTree } from "lucide-react"

import type { AppCopy } from "@/components/app/i18nProvider"
import {
  type DragPayload,
  normalizePath,
  TARGET_FOLDER_PRESETS,
  DraggableTree,
  ROOT_INSTALL_TARGET,
  SKIP_INSTALL_TARGET,
  TreeDragOverlay,
} from "@/components/g2m/draggableTree"
import { Badge } from "@/components/ui/badge"
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, closestCenter, useDroppable, useDndContext } from "@dnd-kit/core"
import { Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ModImportFileEntry } from "@/lib/g2m"

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

function ModMappingWorkbenchInner({
  copy,
  files,
  initialTargetFolders = EMPTY_TARGET_FOLDERS,
  targetDescription,
  emptyTargetLabel,
}: ModMappingWorkbenchProps) {
  const [customTargetFolders, setCustomTargetFolders] = useState<string[]>([])
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

  useEffect(() => {
    setCustomTargetFolders((current) => (current.length > 0 ? [] : current))
  }, [initialTargetFoldersKey])

  const { active } = useDndContext()
  const activePayload = active?.data.current as DragPayload | undefined

  const { isOver: isOverSkip, setNodeRef: dropRefSkip } = useDroppable({
    id: "drop::skip-install",
    data: { acceptsDrop: true, folderPath: SKIP_INSTALL_TARGET },
  })
  const canDropSkip = !!activePayload

  const { isOver: isOverRoot, setNodeRef: dropRefRoot } = useDroppable({
    id: "drop::root-install",
    data: { acceptsDrop: true, folderPath: ROOT_INSTALL_TARGET },
  })
  const canDropRoot = !!activePayload

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <WorkbenchPanel
          title={copy.builderPage.sourceTreeTitle || "源文件 (Source)"}
          description={copy.builderPage.pickSourceDescription || "拖拽文件或文件夹到右侧"}
          icon={<FolderTree className="size-4" />}
          headerAction={
            <Badge
              variant="secondary"
              className="rounded-full bg-background/80 px-3 py-1 text-slate-700 dark:bg-white/10 dark:text-slate-200"
            >
              {copy.workspacePage.fileCount} {files.length}
            </Badge>
          }
        >
          <div className="h-[460px] overflow-hidden rounded-xl border border-black/5 bg-slate-50/50 p-2 dark:border-white/10 dark:bg-black/20">
            <div className="h-full overflow-y-auto pr-2">
              <DraggableTree
                files={files}
                mode="source"
                emptyLabel={"No files"}
                className="pb-8"
                showFullPath={false}
                defaultExpandedDepth={2}
              />
            </div>
          </div>
        </WorkbenchPanel>

        <WorkbenchPanel
          title={copy.workspacePage.targetFolders || "游戏目录 (Target)"}
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
          <div className="flex h-[460px] flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-2 pb-4">
              <div
                className={cn(
                  "rounded-xl border border-dashed border-red-500/30 bg-red-50/50 p-4 transition-colors dark:border-red-400/20 dark:bg-red-500/5 mb-4",
                  isOverSkip && canDropSkip && "border-red-500/50 bg-red-100/80 dark:border-red-400/40 dark:bg-red-500/20 shadow-[0_0_0_2px_rgba(239,68,68,0.2)]"
                )}
                ref={dropRefSkip}
              >
                <div className="flex items-center gap-3 text-red-900 dark:text-red-200">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                    <Trash2 className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-all text-sm font-semibold">{copy.workspaceDialogs.doNotInstall}</p>
                    <p className="mt-1 text-xs text-red-500/80 dark:text-red-400/80">
                      {copy.builderPage.dragToIgnore || "拖拽到此处以忽略文件"}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "min-h-[280px] rounded-xl border border-black/5 bg-slate-50/50 p-2 dark:border-white/10 dark:bg-black/20 transition-colors",
                  isOverRoot && canDropRoot && "border-violet-300 bg-violet-50/70 dark:border-violet-400/40 dark:bg-violet-500/10 shadow-[0_0_0_2px_rgba(139,92,246,0.2)]"
                )}
                ref={dropRefRoot}
              >
                <div className="mb-2 flex items-center justify-between px-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span>{copy.workspaceDialogs.installToRoot}</span>
                  <span>{copy.builderPage.dragToRoot || "可直接拖拽至此面板空白处"}</span>
                </div>
                <DraggableTree
                  files={files}
                  mode="target"
                  emptyLabel={emptyTargetLabel || "未分配任何文件"}
                  showFullPath={false}
                  defaultExpandedDepth={2}
                  includePresets={true}
                />
              </div>
            </div>
          </div>
        </WorkbenchPanel>
      </div>
    </div>
  )
}

function ModMappingWorkbench(props: ModMappingWorkbenchProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )
  const [activePayload, setActivePayload] = useState<DragPayload | null>(null)

  function handleDragStart(event: any) {
    setActivePayload(event.active.data.current as DragPayload)
  }

  function handleDragEnd(event: any) {
    setActivePayload(null)
    const { active, over } = event
    if (!over) return

    const payload = active.data.current as DragPayload
    const overData = over.data.current
    if (overData && overData.acceptsDrop && overData.folderPath !== undefined) {
      props.onDropToFolder(overData.folderPath, payload)
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <ModMappingWorkbenchInner {...props} />
      <DragOverlay dropAnimation={null}>
        {activePayload ? <TreeDragOverlay payload={activePayload} /> : null}
      </DragOverlay>
    </DndContext>
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
      <div className="mt-4 max-h-[460px] pr-1">
        {children}
      </div>
    </section>
  )
}

export { ModMappingWorkbench }
