import {
  ChevronRight,
  File,
  FileArchive,
  FileAudio,
  FileCode2,
  FileImage,
  FileJson,
  FileText,
  FileVideo,
  Folder,
  FolderOpen,
  GripVertical,
} from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { useDraggable, useDroppable, useDndContext } from "@dnd-kit/core"

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
  className?: string
  showFullPath?: boolean
  defaultExpandedDepth?: number
}

export function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'json':
    case 'xml':
      return <FileJson className="size-4 shrink-0 text-amber-500 dark:text-amber-400" />
    case 'txt':
    case 'md':
    case 'ini':
    case 'cfg':
    case 'ide':
      return <FileText className="size-4 shrink-0 text-slate-500 dark:text-slate-400" />
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'bmp':
    case 'txd':
      return <FileImage className="size-4 shrink-0 text-blue-500 dark:text-blue-400" />
    case 'wav':
    case 'mp3':
    case 'ogg':
      return <FileAudio className="size-4 shrink-0 text-purple-500 dark:text-purple-400" />
    case 'mp4':
    case 'avi':
    case 'mpg':
      return <FileVideo className="size-4 shrink-0 text-rose-500 dark:text-rose-400" />
    case 'zip':
    case 'rar':
    case '7z':
      return <FileArchive className="size-4 shrink-0 text-red-500 dark:text-red-400" />
    case 'cs':
    case 'cs4':
    case 'asi':
    case 'dll':
    case 'lua':
      return <FileCode2 className="size-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
    case 'dff':
    case 'col':
    case 'ifp':
      return <File className="size-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
    default:
      return <File className="size-4 shrink-0 text-slate-400 dark:text-slate-500" />
  }
}

export function DraggableTree({
  files,
  mode,
  emptyLabel,
  className,
  showFullPath = true,
  defaultExpandedDepth = 1,
  includePresets = false,
}: DraggableTreeProps & { includePresets?: boolean }) {
  const tree = useMemo(() => buildModFileTree(files, mode, includePresets), [files, mode, includePresets])

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
    <div className={cn("space-y-0", className)}>
      {tree.map((node) => (
        <DraggableTreeNode
          key={node.key}
          node={node}
          depth={0}
          mode={mode}
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
  showFullPath?: boolean
  defaultExpandedDepth: number
}

function DraggableTreeNode({
  node,
  depth,
  mode,
  showFullPath = true,
  defaultExpandedDepth,
}: DraggableTreeNodeProps) {
  const isFolder = node.kind === "folder"
  const [isExpanded, setIsExpanded] = useState(depth < defaultExpandedDepth || node.isPresetFolder)
  const dragPath = buildTargetDragPath(node.fullPath, mode, node.file)
  
  const payload = useMemo<DragPayload>(
    () => ({
      kind: isFolder ? "folder" : "file",
      mode,
      path: dragPath,
    }),
    [dragPath, isFolder, mode],
  )

  const draggableId = `drag::${mode}::${dragPath}`
  const { attributes, listeners, setNodeRef: setDragNodeRef, isDragging } = useDraggable({
    id: draggableId,
    data: payload,
  })

  const { active } = useDndContext()
  const activePayload = active?.data.current as DragPayload | undefined
  const destFolder = isFolder ? dragPath : getDirName(dragPath)
  const canDrop = activePayload && mode === "target" && canDropToFolder(activePayload, destFolder)

  // Use the destFolder as the droppable ID, but prefix it so it's unique across the app just in case
  const droppableId = `drop::target::${destFolder}::from::${dragPath}`
  
  const { isOver, setNodeRef: setDropNodeRef } = useDroppable({
    id: droppableId,
    data: {
      acceptsDrop: canDrop,
      folderPath: destFolder,
    },
    disabled: mode !== "target" || !canDrop,
  })

  const attachRefs = useCallback(
    (element: HTMLDivElement | null) => {
      if (mode === "target" && element) {
        setDropNodeRef(element)
      }
    },
    [mode, setDropNodeRef],
  )

  return (
    <div>
      <div
        ref={attachRefs}
        className={cn(
          "group flex items-center gap-1.5 py-1 pr-2 rounded-md text-[13px] transition-all select-none cursor-pointer",
          isFolder
            ? "hover:bg-slate-100/80 dark:hover:bg-white/[0.08]"
            : "hover:bg-slate-50/80 dark:hover:bg-white/[0.04]",
          isDragging &&
            "opacity-50 bg-violet-50/50 dark:bg-violet-500/10",
          isOver &&
            canDrop &&
            "bg-violet-100/80 dark:bg-violet-500/20 ring-1 ring-inset ring-violet-400/40",
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={(event) => {
          if (isFolder) {
            event.stopPropagation()
            setIsExpanded((current) => !current)
          }
        }}
      >
        <div
          ref={setDragNodeRef}
          {...listeners}
          {...attributes}
          className="flex size-4 shrink-0 items-center justify-center text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity hover:text-slate-500 dark:hover:text-slate-400"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="size-3.5 cursor-grab active:cursor-grabbing" />
        </div>
        {isFolder ? (
          <>
            <div className="flex size-4 shrink-0 items-center justify-center">
              <ChevronRight
                className={cn(
                  "size-3.5 text-slate-400 transition-transform dark:text-slate-500",
                  isExpanded && "rotate-90",
                )}
              />
            </div>
            {isExpanded ? (
              <FolderOpen className="size-4 shrink-0 text-amber-500 dark:text-amber-400" fill="currentColor" fillOpacity={0.4} />
            ) : (
              <Folder className="size-4 shrink-0 text-amber-500 dark:text-amber-400" fill="currentColor" fillOpacity={0.4} />
            )}
          </>
        ) : (
          <>
            <span className="size-4 shrink-0" />
            {getFileIcon(node.name)}
          </>
        )}
        <div className="min-w-0 flex-1 ml-0.5">
          <div className="flex items-center justify-between gap-3">
            <p className={cn("truncate", isFolder ? "font-medium text-slate-700 dark:text-slate-200" : "text-slate-600 dark:text-slate-300")}>
              {node.name}
            </p>
            {isFolder && (node.fileCount > 0 || !node.isPresetFolder) && (
              <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">
                {node.fileCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {isFolder && isExpanded && node.children.length > 0 ? (
        <div className="space-y-0">
          {node.children.map((child) => (
            <DraggableTreeNode
              key={child.key}
              node={child}
              depth={depth + 1}
              mode={mode}
              showFullPath={showFullPath}
              defaultExpandedDepth={defaultExpandedDepth}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function TreeDragOverlay({ payload }: { payload: DragPayload }) {
  const isFolder = payload.kind === "folder"
  const name = getBaseName(payload.path)
  
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-2 text-[13px] text-slate-700 shadow-xl ring-1 ring-black/10 dark:bg-slate-800/95 dark:text-slate-200 dark:ring-white/20 backdrop-blur-md">
      {isFolder ? (
        <Folder className="size-4 shrink-0 text-amber-500 dark:text-amber-400" fill="currentColor" fillOpacity={0.4} />
      ) : (
        getFileIcon(name)
      )}
      <p className="truncate font-medium">{name}</p>
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

export function getDirName(path: string): string {
  const normalized = normalizePath(path)
  const segments = normalized.split("/").filter(Boolean)
  segments.pop()
  return segments.length > 0 ? segments.join("/") : ROOT_INSTALL_TARGET
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

  // target to target
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
    if (nextPath === null) {
      return file
    }
    
    // Always update targetFolder when updating targetPath
    const newTargetFolder = dest === SKIP_INSTALL_TARGET ? file.targetFolder : inferTargetFolderFromPath(nextPath)
    
    return {
      ...file,
      targetPath: nextPath,
      targetFolder: newTargetFolder,
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
