import { FolderTree, GripVertical } from "lucide-react"
import { useCallback } from "react"
import { useDrag, useDrop } from "react-dnd"

import type { AppCopy } from "@/components/app/i18nProvider"
import { canDropToFolder, type DragPayload } from "@/components/g2m/draggableTree"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ModMappingSummary } from "@/lib/g2m"
import { cn } from "@/lib/utils"

type MappingSummaryTargetOption = {
  label: string
  value: string
}

type MappingSummaryEditorProps = {
  copy: AppCopy
  summary: ModMappingSummary
  targetPath: string
  onDragEnd?: () => void
  onDragStart?: (payload: DragPayload) => void
  onDropToFolder?: (destinationFolder: string, payload: DragPayload) => void
  onTargetPathChange?: (targetPath: string) => void
  targetOptions?: MappingSummaryTargetOption[]
  selectedTargetValues?: string[]
  onToggleTarget?: (value: string) => void
}

function MappingSummaryEditor({
  copy,
  summary,
  targetPath,
  onDragEnd,
  onDragStart,
  onDropToFolder,
  targetOptions = [],
  selectedTargetValues = [],
  onToggleTarget,
}: MappingSummaryEditorProps) {
  const isDraggable = Boolean(onDragStart && onDragEnd)
  const isDropTarget = Boolean(onDropToFolder && summary.kind === "folder")
  const showTargetOptions = targetOptions.length > 0 && onToggleTarget
  const payload: DragPayload = {
    kind: summary.kind,
    mode: "target",
    path: targetPath,
  }
  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: "g2m-tree-item",
      item: () => {
        onDragStart?.(payload)
        return { payload }
      },
      canDrag: isDraggable,
      end: () => {
        onDragEnd?.()
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [isDraggable, onDragEnd, onDragStart, payload],
  )
  const [{ isOver, canDrop }, dropRef] = useDrop(
    () => ({
      accept: "g2m-tree-item",
      canDrop: (item: { payload: DragPayload }) =>
        isDropTarget && canDropToFolder(item.payload, targetPath),
      drop: (item: { payload: DragPayload }) => {
        onDropToFolder?.(targetPath, item.payload)
      },
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        canDrop: monitor.canDrop(),
      }),
    }),
    [isDropTarget, onDropToFolder, targetPath],
  )
  const attachDropRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (!isDropTarget || !element) {
        return
      }
      dropRef(element)
    },
    [dropRef, isDropTarget],
  )
  const attachDragRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) {
        return
      }
      dragRef(element)
    },
    [dragRef],
  )

  return (
    <div
      ref={isDropTarget ? attachDropRef : undefined}
      className={cn(
        "rounded-2xl border border-black/5 bg-white/70 p-4 transition-colors dark:border-white/10 dark:bg-white/[0.04]",
        isDragging && "border-violet-300 bg-violet-50/70 dark:border-violet-400/40 dark:bg-violet-500/10",
        isOver &&
          canDrop &&
          "border-violet-400 bg-violet-50/80 dark:border-violet-300/60 dark:bg-violet-500/15",
      )}
    >
      <div className="flex items-start gap-3">
        {isDraggable ? (
          <div
            ref={attachDragRef}
            className="mt-0.5 flex size-9 shrink-0 cursor-grab items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950"
          >
            <GripVertical className="size-4" />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="break-all text-sm font-semibold text-slate-950 dark:text-slate-50">
              {summary.sourcePath}
            </p>
            <Badge variant="secondary" className="rounded-full bg-background/80 px-2.5 py-1 text-xs dark:bg-white/10">
              {summary.kind === "folder" ? copy.builderPage.summaryFolder : copy.builderPage.summaryFile}
            </Badge>
            <Badge variant="secondary" className="rounded-full bg-background/80 px-2.5 py-1 text-xs dark:bg-white/10">
              {copy.workspacePage.fileCount} {summary.fileCount}
            </Badge>
          </div>
          <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">
            {targetPath}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-dashed border-black/10 bg-background/70 px-3 py-3 text-sm dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-background/80 text-slate-700 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
          <FolderTree className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            {copy.workspaceDialogs.installPath}
          </p>
          <p className="break-all font-medium text-slate-800 dark:text-slate-200">
            {targetPath}
          </p>
        </div>
      </div>

      {showTargetOptions ? (
        <div className="mt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            {copy.builderPage.gameTargets}
          </p>
          <div className="flex flex-wrap gap-2">
            {targetOptions.map((option) => {
              const isSelected = selectedTargetValues.includes(option.value)
              return (
                <Button
                  key={option.value}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer rounded-xl text-xs"
                  onClick={() => onToggleTarget?.(option.value)}
                >
                  {option.label}
                </Button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export { MappingSummaryEditor }
export type { MappingSummaryTargetOption }
