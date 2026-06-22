import {
  ChevronRight,
  FileCode2,
  FolderTree,
  GripVertical,
  Plus,
} from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { useDrag, useDrop } from "react-dnd"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  buildModFileTree,
  inferTargetFolderFromPath,
  type ModImportFileEntry,
  type ModFileTreeNode,
} from "@/lib/g2m"
import { cn } from "@/lib/utils"

export type TreeMode = "source" | "target"
export type DragKind = "file" | "folder"

export type DragPayload = {
  kind: DragKind
  mode: TreeMode
  path: string
}

type TreeDragItem = {
  payload: DragPayload
}

const TREE_ITEM_TYPE = "g2m-tree-item"

export type TargetFolderPreset = "modloader" | "plugins" | "scripts" | "cleo"

export const TARGET_FOLDER_PRESETS: TargetFolderPreset[] = [
  "modloader",
  "plugins",
  "scripts",
  "cleo",
]
export const ROOT_INSTALL_TARGET = "__g2m_root__"
export const SKIP_INSTALL_TARGET = "__g2m_skip__"

export function buildTargetDragPath(
  path: string,
  mode: TreeMode,
  file: ModImportFileEntry | null,
): string {
  if (mode === "source") {
    return path
  }
  return file?.targetPath ?? path
}

export type DraggableTreeProps = {
  files: ModImportFileEntry[]
  mode: TreeMode
  emptyLabel: string
  onDragStart?: (payload: DragPayload) => void
  onDragEnd?: () => void
  onDropToFolder: (targetFolder: string, payload: DragPayload) => void
  className?: string
  showFullPath?: boolean
  defaultExpandedDepth?: number
}

export function DraggableTree({
  files,
  mode,
  emptyLabel,
  onDragStart,
  onDragEnd,
  onDropToFolder,
  className,
  showFullPath = true,
  defaultExpandedDepth = 1,
}: DraggableTreeProps) {
  const tree = useMemo(() => buildModFileTree(files, mode), [files, mode])

  if (tree.length === 0) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-dashed border-border/70 p-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400",
          className,
        )}
      >
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className={cn("space-y-1", className)}>
      {tree.map((node) => (
        <DraggableTreeNode
          key={node.key}
          node={node}
          depth={0}
          mode={mode}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDropToFolder={onDropToFolder}
          showFullPath={showFullPath}
          defaultExpandedDepth={defaultExpandedDepth}
        />
      ))}
    </div>
  )
}

type DraggableTreeNodeProps = {
  node: ModFileTreeNode
  depth: number
  mode: TreeMode
  onDragStart?: (payload: DragPayload) => void
  onDragEnd?: () => void
  onDropToFolder: (targetFolder: string, payload: DragPayload) => void
  showFullPath?: boolean
  defaultExpandedDepth: number
}

function DraggableTreeNode({
  node,
  depth,
  mode,
  onDragStart,
  onDragEnd,
  onDropToFolder,
  showFullPath = true,
  defaultExpandedDepth,
}: DraggableTreeNodeProps) {
  const isFolder = node.kind === "folder"
  const [isExpanded, setIsExpanded] = useState(depth < defaultExpandedDepth)
  const dragPath = buildTargetDragPath(node.fullPath, mode, node.file)
  const payload = useMemo<DragPayload>(
    () => ({
      kind: isFolder ? "folder" : "file",
      mode,
      path: dragPath,
    }),
    [dragPath, isFolder, mode],
  )
  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: TREE_ITEM_TYPE,
      item: () => {
        onDragStart?.(payload)
        return { payload }
      },
      end: () => {
        onDragEnd?.()
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [onDragEnd, onDragStart, payload],
  )
  const [{ isOver, canDrop }, dropRef] = useDrop(
    () => ({
      accept: TREE_ITEM_TYPE,
      canDrop: (item: TreeDragItem) =>
        mode === "target" && isFolder && canDropToFolder(item.payload, dragPath),
      drop: (item: TreeDragItem, monitor) => {
        if (monitor.didDrop() || mode !== "target" || !isFolder) {
          return
        }
        onDropToFolder(dragPath, item.payload)
      },
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        canDrop: monitor.canDrop(),
      }),
    }),
    [dragPath, isFolder, mode, onDropToFolder],
  )
  const attachDropRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (mode === "target" && isFolder && element) {
        dropRef(element)
      }
    },
    [dropRef, isFolder, mode],
  )
  const attachDragRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (element) {
        dragRef(element)
      }
    },
    [dragRef],
  )

  return (
    <div>
      <div
        ref={attachDropRef}
        className={cn(
          "flex items-start gap-2 rounded-2xl px-3 py-2.5 text-sm text-slate-700 ring-1 ring-black/5 transition-colors dark:text-slate-200 dark:ring-white/10",
          isFolder
            ? "bg-slate-50/90 hover:bg-slate-100 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]"
            : "bg-background/80 hover:bg-slate-50 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]",
          isDragging &&
            "border-violet-300 bg-violet-50/70 dark:border-violet-400/40 dark:bg-violet-500/10",
          isOver &&
            canDrop &&
            "border-violet-400 bg-violet-50/80 dark:border-violet-300/60 dark:bg-violet-500/15",
        )}
        style={{ marginLeft: depth * 14 }}
      >
        <div
          ref={attachDragRef}
          className="mt-0.5 flex size-5 shrink-0 items-center justify-center text-slate-400 dark:text-slate-500"
        >
          <GripVertical className="size-4 cursor-grab" />
        </div>
        {isFolder ? (
          <>
            <button
              type="button"
              className="mt-0.5 flex size-4 shrink-0 items-center justify-center"
              onClick={(event) => {
                event.stopPropagation()
                setIsExpanded((current) => !current)
              }}
            >
              <ChevronRight
                className={cn(
                  "size-4 text-slate-400 transition-transform dark:text-slate-500",
                  isExpanded && "rotate-90",
                )}
              />
            </button>
            <FolderTree className="mt-0.5 size-4 shrink-0 text-violet-600 dark:text-violet-300" />
          </>
        ) : (
          <>
            <span className="size-4 shrink-0" />
            <FileCode2 className="mt-0.5 size-4 shrink-0 text-slate-500 dark:text-slate-400" />
          </>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="break-all font-medium">{node.name}</p>
            <span className="shrink-0 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
              {node.fileCount}
            </span>
          </div>
          {showFullPath && !isFolder && node.file ? (
            <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">
              {node.file.targetPath}
            </p>
          ) : null}
        </div>
      </div>

      {isFolder && isExpanded && node.children.length > 0 ? (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => (
            <DraggableTreeNode
              key={child.key}
              node={child}
              depth={depth + 1}
              mode={mode}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDropToFolder={onDropToFolder}
              showFullPath={showFullPath}
              defaultExpandedDepth={defaultExpandedDepth}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export type TargetPresetDropZoneProps = {
  folders?: string[]
  fileCount: (folder: string) => number
  fileCountLabel: string
  onDropToFolder: (targetFolder: string, payload: DragPayload) => void
  onCreateFolder?: (folder: string) => void
  createFolderLabel?: string
  customFolderLabel?: string
  customFolderPlaceholder?: string
}

export function TargetPresetDropZone({
  folders = TARGET_FOLDER_PRESETS,
  fileCount,
  fileCountLabel,
  onDropToFolder,
  onCreateFolder,
  createFolderLabel = "Add Folder",
  customFolderLabel = "Custom Folder",
  customFolderPlaceholder = "mods/custom",
}: TargetPresetDropZoneProps) {
  const [customFolderInput, setCustomFolderInput] = useState("")
  const resolvedFolders = useMemo(
    () => Array.from(new Set(folders.map((folder) => normalizePath(folder)).filter(Boolean))),
    [folders],
  )

  function submitCustomFolder() {
    const nextFolder = normalizePath(customFolderInput.trim())
    if (!nextFolder) {
      return
    }
    onCreateFolder?.(nextFolder)
    setCustomFolderInput("")
  }

  return (
    <div className="space-y-3">
      {onCreateFolder ? (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-black/10 bg-background/70 p-3 dark:border-white/10 dark:bg-white/[0.03] lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {customFolderLabel}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {createFolderLabel}
            </p>
          </div>
          <div className="flex gap-2 lg:w-[420px]">
            <Input
              value={customFolderInput}
              onChange={(event) => setCustomFolderInput(event.currentTarget.value)}
              placeholder={customFolderPlaceholder}
              className="h-10 rounded-xl border-border/70 bg-background/70 text-sm shadow-none dark:border-white/10 dark:bg-white/[0.04]"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  submitCustomFolder()
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer rounded-xl"
              onClick={submitCustomFolder}
              disabled={!normalizePath(customFolderInput)}
            >
              <Plus className="size-4" />
              {customFolderLabel}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {resolvedFolders.map((folder) => (
          <TargetFolderCard
            key={`target-preset-${folder}`}
            folder={folder}
            fileCount={fileCount(folder)}
            fileCountLabel={fileCountLabel}
            onDropToFolder={onDropToFolder}
          />
        ))}
      </div>
    </div>
  )
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/").replace(/\/+$/, "")
}

export function getBaseName(path: string): string {
  const normalized = normalizePath(path)
  const segments = normalized.split("/").filter(Boolean)
  return segments[segments.length - 1] ?? normalized
}

export function joinPath(...segments: string[]): string {
  return segments
    .map((s) => normalizePath(s))
    .filter(Boolean)
    .join("/")
}

export function buildMovedTargetPath(
  file: ModImportFileEntry,
  payload: DragPayload,
  dest: string,
): string | null {
  if (dest === SKIP_INSTALL_TARGET) {
    if (payload.mode === "source") {
      const normalizedSource = normalizePath(payload.path)
      if (payload.kind === "file") {
        return normalizePath(file.relativePath) === normalizedSource ? "" : null
      }

      return normalizePath(file.relativePath).startsWith(`${normalizedSource}/`) ? "" : null
    }

    const normalizedTarget = normalizePath(payload.path)
    if (payload.kind === "file") {
      return normalizePath(file.targetPath) === normalizedTarget ? "" : null
    }

    return normalizePath(file.targetPath).startsWith(`${normalizedTarget}/`) ? "" : null
  }

  const normalizedDest = dest === ROOT_INSTALL_TARGET ? "" : normalizePath(dest)

  if (dest !== ROOT_INSTALL_TARGET && !normalizedDest) {
    return null
  }
  if (payload.mode === "source") {
    if (payload.kind === "file") {
      if (normalizePath(file.relativePath) !== normalizePath(payload.path)) {
        return null
      }
      return joinPath(normalizedDest, getBaseName(file.relativePath))
    }

    const normalizedSourceDir = normalizePath(payload.path)
    const normalizedRel = normalizePath(file.relativePath)
    if (!normalizedRel.startsWith(`${normalizedSourceDir}/`)) {
      return null
    }

    const suffix = normalizedRel.slice(normalizedSourceDir.length).replace(/^\/+/, "")
    return joinPath(normalizedDest, getBaseName(normalizedSourceDir), suffix)
  }

  if (payload.kind === "file") {
    if (normalizePath(file.targetPath) !== normalizePath(payload.path)) {
      return null
    }
    return joinPath(normalizedDest, getBaseName(file.targetPath))
  }

  const normalizedTargetDir = normalizePath(payload.path)
  const normalizedTarget = normalizePath(file.targetPath)
  if (!normalizedTarget.startsWith(`${normalizedTargetDir}/`)) {
    return null
  }

  const suffix = normalizedTarget.slice(normalizedTargetDir.length).replace(/^\/+/, "")
  return joinPath(normalizedDest, getBaseName(normalizedTargetDir), suffix)
}

export function moveFiles(
  files: ModImportFileEntry[],
  payload: DragPayload,
  dest: string,
): ModImportFileEntry[] {
  const normalizedDest = dest === ROOT_INSTALL_TARGET ? "" : normalizePath(dest)
  if (dest !== ROOT_INSTALL_TARGET && dest !== SKIP_INSTALL_TARGET && !normalizedDest) {
    return files
  }

  if (dest !== SKIP_INSTALL_TARGET && payload.mode === "target" && payload.kind === "folder") {
    const normalizedDragged = normalizePath(payload.path)
    if (
      normalizedDest === normalizedDragged ||
      (normalizedDest && normalizedDest.startsWith(`${normalizedDragged}/`))
    ) {
      return files
    }
  }

  return files.map((file) => {
    const nextPath = buildMovedTargetPath(file, payload, dest)
    if (nextPath === null || nextPath === file.targetPath) {
      return file
    }
    return {
      ...file,
      targetPath: nextPath,
      targetFolder: inferTargetFolderFromPath(nextPath),
      skipInstall: !nextPath,
    }
  })
}

export function canDropToFolder(payload: DragPayload, destination: string): boolean {
  const normalizedDest = normalizePath(destination)
  if (!normalizedDest) {
    return false
  }

  if (payload.mode === "target" && payload.kind === "folder") {
    const normalizedDragged = normalizePath(payload.path)
    if (
      normalizedDest === normalizedDragged ||
      normalizedDest.startsWith(`${normalizedDragged}/`)
    ) {
      return false
    }
  }

  return true
}

function TargetFolderCard({
  folder,
  fileCount,
  fileCountLabel,
  onDropToFolder,
}: {
  folder: string
  fileCount: number
  fileCountLabel: string
  onDropToFolder: (targetFolder: string, payload: DragPayload) => void
}) {
  const [{ isOver, canDrop }, dropRef] = useDrop(
    () => ({
      accept: TREE_ITEM_TYPE,
      canDrop: (item: TreeDragItem) => canDropToFolder(item.payload, folder),
      drop: (item: TreeDragItem) => {
        onDropToFolder(folder, item.payload)
      },
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        canDrop: monitor.canDrop(),
      }),
    }),
    [folder, onDropToFolder],
  )
  const attachDropRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) {
        return
      }
      dropRef(element)
    },
    [dropRef],
  )

  return (
    <div
      ref={attachDropRef}
      className={cn(
        "rounded-2xl border border-black/5 bg-white/70 p-4 transition-colors dark:border-white/10 dark:bg-white/[0.04]",
        isOver &&
          canDrop &&
          "border-violet-300 bg-violet-50/70 dark:border-violet-400/40 dark:bg-violet-500/10",
      )}
    >
      <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
          <FolderTree className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-all text-sm font-semibold">{folder}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {fileCountLabel} {fileCount}
          </p>
        </div>
      </div>
    </div>
  )
}
