import { useState, useEffect, useMemo } from "react"
import { ChevronRight, Folder, PanelLeftClose, PanelLeft, ArrowUp, HardDrive, Gamepad2, Trash2 } from "lucide-react"
import { useDroppable, DndContext, DragOverlay, useSensor, useSensors, PointerSensor, closestCenter } from "@dnd-kit/core"
import { open } from "@tauri-apps/plugin-dialog"

import { Drawer, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger, DrawerClose, DrawerHeader, DrawerFooter } from "@/components/ui/drawer"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Badge } from "@/components/ui/badge"
import type { ModImportFileEntry } from "@/lib/g2m"
import type { AppCopy } from "@/components/app/i18nProvider"
import { invokeApi } from "@/lib/api"
import { useG2mWorkspace } from "@/hooks/useG2MWorkspace"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  type DragPayload,
  DraggableTree,
  TreeDragOverlay,
  ROOT_INSTALL_TARGET,
  SKIP_INSTALL_TARGET,
  normalizePath,
  getBaseName,
  getFileIcon,
  TARGET_FOLDER_PRESETS
} from "./draggableTree"
import { G2MGameCoverCard } from "@/components/g2m/gameCoverCard"
import { useAppPreferences } from "@/components/app/preferencesProvider"

type ModMappingExplorerProps = {
  copy: AppCopy
  files: ModImportFileEntry[]
  onDropToFolder: (targetFolder: string, payload: DragPayload) => void
}

export function ModMappingExplorer({ copy, files, onDropToFolder }: ModMappingExplorerProps) {
  const workspace = useG2mWorkspace()
  const { showHomeGameDetails } = useAppPreferences()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showSourceTree, setShowSourceTree] = useState(true)

  // Target explorer state
  const [targetRootPath, setTargetRootPath] = useState<string>("")
  const [currentRelativePath, setCurrentRelativePath] = useState<string>("")
  const [diskFolders, setDiskFolders] = useState<string[]>([])
  
  // Fetch real disk folders when path changes
  useEffect(() => {
    let isMounted = true
    async function fetchFolders() {
      if (!targetRootPath) {
        setDiskFolders(currentRelativePath === "" ? TARGET_FOLDER_PRESETS : [])
        return
      }
      
      try {
        const fullPath = currentRelativePath ? `${targetRootPath}/${currentRelativePath}` : targetRootPath
        const folders = await invokeApi<string[]>("read_game_folders", { path: fullPath })
        if (isMounted) {
          setDiskFolders(folders)
        }
      } catch (error) {
        console.error("Failed to read folders:", error)
        if (isMounted) {
          setDiskFolders([])
        }
      }
    }
    fetchFolders()
    return () => { isMounted = false }
  }, [targetRootPath, currentRelativePath])

  // Virtual items based on current mappings
  const virtualItems = useMemo(() => {
    const folders = new Set<string>()
    const mappedFiles: ModImportFileEntry[] = []
    
    const prefix = currentRelativePath ? `${currentRelativePath}/` : ""
    
    files.forEach(file => {
      const target = normalizePath(file.targetPath)
      if (!target) return
      
      if (currentRelativePath === "") {
        if (!target.includes("/")) {
          mappedFiles.push(file)
        } else {
          folders.add(target.split("/")[0])
        }
      } else if (target.startsWith(prefix)) {
        const remainder = target.slice(prefix.length)
        if (!remainder.includes("/")) {
          mappedFiles.push(file)
        } else {
          folders.add(remainder.split("/")[0])
        }
      }
    })
    
    return { folders: Array.from(folders), files: mappedFiles }
  }, [files, currentRelativePath])

  // Combine disk folders and virtual folders
  const allFolders = useMemo(() => {
    const combined = new Set([...diskFolders, ...virtualItems.folders])
    return Array.from(combined).sort((a, b) => a.localeCompare(b))
  }, [diskFolders, virtualItems.folders])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )
  const [activePayload, setActivePayload] = useState<DragPayload | null>(null)
  const currentDropPath = currentRelativePath || ROOT_INSTALL_TARGET

  function handleDragStart(event: any) {
    setActivePayload(event.active.data.current as DragPayload)
  }

  function handleDragEnd(event: any) {
    setActivePayload(null)
    const { active, over } = event
    const payload = active.data.current as DragPayload
    if (!over) {
      onDropToFolder(currentDropPath, payload)
      return
    }

    const overData = over.data.current
    if (overData && overData.acceptsDrop && overData.folderPath !== undefined) {
      onDropToFolder(overData.folderPath, payload)
    }
  }

  async function handleSelectCustomDir() {
    const result = await open({
      directory: true,
      multiple: false,
      title: copy.builderPage.explorerTitle,
    })
    if (result && !Array.isArray(result)) {
      setTargetRootPath(normalizePath(result))
      setCurrentRelativePath("")
    }
  }

  // Droppable for the current directory background
  const { isOver: isOverCurrent, setNodeRef: dropRefCurrent } = useDroppable({
    id: `drop::target::${currentDropPath}::explorer-bg`,
    data: { acceptsDrop: !!activePayload, folderPath: currentDropPath },
  })

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-4">
        {/* Explorer Toolbar */}
        <div className="flex flex-col gap-3 rounded-xl border border-black/5 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              onClick={() => setShowSourceTree(!showSourceTree)}
              title={showSourceTree ? copy.builderPage.hideSourceTree : copy.builderPage.showSourceTree}
            >
              {showSourceTree ? <PanelLeftClose className="size-4" /> : <PanelLeft className="size-4" />}
            </Button>
            
            <div className="h-4 w-px bg-border/50" />
            
            <div className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-200">
              <span 
                className="cursor-pointer hover:text-violet-600 dark:hover:text-violet-400"
                onClick={() => setCurrentRelativePath("")}
              >
                {targetRootPath ? getBaseName(targetRootPath) : copy.builderPage.explorerRootLabel}
              </span>
              {currentRelativePath.split("/").filter(Boolean).map((part, index, arr) => (
                <div key={index} className="flex items-center">
                  <ChevronRight className="mx-1 size-3.5 text-slate-400" />
                  <span 
                    className="cursor-pointer hover:text-violet-600 dark:hover:text-violet-400"
                    onClick={() => setCurrentRelativePath(arr.slice(0, index + 1).join("/"))}
                  >
                    {part}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Drawer open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DrawerTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Gamepad2 className="size-3 mr-1.5" />
                  {copy.builderPage.explorerTitle}
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[85vh]">
                <div className="mx-auto w-full max-w-5xl overflow-hidden flex flex-col">
                  <DrawerHeader className="text-left px-6 pt-6">
                    <Badge variant="secondary" className="w-fit rounded-full bg-violet-100 px-3 py-1 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200 mb-2">
                      {copy.builderPage.explorerTitle}
                    </Badge>
                    <DrawerTitle className="text-2xl font-semibold tracking-tight">
                      {copy.builderPage.explorerTitle}
                    </DrawerTitle>
                    <DrawerDescription className="mt-2 text-sm leading-6">
                      {copy.builderPage.explorerDescription}
                    </DrawerDescription>
                  </DrawerHeader>

                  <div className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                      {workspace.games.map(g => (
                        <DrawerClose asChild key={g.id}>
                          <div className="cursor-pointer text-left transition-transform hover:scale-[1.02]">
                            <G2MGameCoverCard
                              game={g}
                              onClick={() => {
                                setTargetRootPath(normalizePath(g.gamePath))
                                setCurrentRelativePath("")
                                setIsDialogOpen(false)
                              }}
                              showMoreInfo={showHomeGameDetails}
                            />
                          </div>
                        </DrawerClose>
                      ))}
                      
                      <DrawerClose asChild>
                        <button
                          type="button"
                          className="flex h-full min-h-[140px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-black/20 bg-transparent p-4 transition-colors hover:bg-slate-50 dark:border-white/20 dark:hover:bg-white/[0.02]"
                          onClick={() => {
                            handleSelectCustomDir()
                            setIsDialogOpen(false)
                          }}
                        >
                          <HardDrive className="size-8 text-slate-400" />
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{copy.builderPage.explorerCustom}</span>
                        </button>
                      </DrawerClose>
                    </div>
                  </div>

                  <DrawerFooter className="px-6 pb-6">
                    <div className="flex justify-end gap-3">
                      <DrawerClose asChild>
                        <Button variant="outline" className="rounded-xl px-6">
                          {copy.common.close}
                        </Button>
                      </DrawerClose>
                    </div>
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>
            
            <Button
              variant="ghost"
              size="icon"
              className="ml-2 size-8 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
              disabled={!currentRelativePath}
              onClick={() => {
                if (!currentRelativePath) return
                const parts = currentRelativePath.split("/")
                parts.pop()
                setCurrentRelativePath(parts.join("/"))
              }}
              title={copy.builderPage.explorerGoUp}
            >
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </div>

        {/* Main Workspace Area */}
        <div className="flex h-[500px] gap-4">
          {/* Left Panel: Source Tree */}
          {showSourceTree && (
            <div className="w-[320px] shrink-0 overflow-hidden rounded-xl border border-black/5 bg-slate-50/50 p-2 dark:border-white/10 dark:bg-black/20">
              <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {copy.builderPage.sourceTitle}
              </div>
              <div className="h-[calc(100%-24px)] overflow-y-auto pr-2 pb-4">
                <DraggableTree
                  files={files}
                  mode="source"
                  emptyLabel={copy.builderPage.sourceTreeEmpty}
                  showFullPath={false}
                  defaultExpandedDepth={2}
                />
              </div>
            </div>
          )}

          {/* Right Panel: Target Explorer View */}
          <div 
            ref={dropRefCurrent}
            className={cn(
              "flex-1 overflow-y-auto rounded-xl border border-black/5 bg-white/50 p-4 dark:border-white/10 dark:bg-black/40 transition-colors",
              isOverCurrent && !!activePayload && "border-violet-300 bg-violet-50/70 dark:border-violet-400/40 dark:bg-violet-500/10 shadow-[inset_0_0_0_2px_rgba(139,92,246,0.2)]"
            )}
          >
            {allFolders.length === 0 && virtualItems.files.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                {copy.builderPage.explorerEmpty}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {allFolders.map(folder => (
                  <ExplorerFolderItem 
                    key={folder}
                    name={folder}
                    currentRelativePath={currentRelativePath}
                    onNavigate={() => setCurrentRelativePath(currentRelativePath ? `${currentRelativePath}/${folder}` : folder)}
                    activePayload={activePayload}
                    hasMappedFiles={virtualItems.folders.includes(folder)}
                    onRemoveMapping={() => onDropToFolder(SKIP_INSTALL_TARGET, {
                      kind: "folder",
                      mode: "target",
                      path: currentRelativePath ? `${currentRelativePath}/${folder}` : folder
                    })}
                    copy={copy}
                  />
                ))}
                
                {virtualItems.files.map(file => (
                  <ExplorerFileItem 
                    key={file.relativePath}
                    file={file}
                    isMapped
                    onRemoveMapping={() => onDropToFolder(SKIP_INSTALL_TARGET, {
                      kind: "file",
                      mode: "target",
                      path: file.targetPath
                    })}
                    copy={copy}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <DragOverlay dropAnimation={null}>
        {activePayload ? <TreeDragOverlay payload={activePayload} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function ExplorerFolderItem({ 
  name, 
  currentRelativePath,
  onNavigate,
  activePayload,
  hasMappedFiles,
  onRemoveMapping,
  copy
}: { 
  name: string
  currentRelativePath: string
  onNavigate: () => void
  activePayload: DragPayload | null
  hasMappedFiles?: boolean
  onRemoveMapping?: () => void
  copy: AppCopy
}) {
  const folderPath = currentRelativePath ? `${currentRelativePath}/${name}` : name
  
  const { isOver, setNodeRef } = useDroppable({
    id: `drop::target::${folderPath}::explorer-item`,
    data: { acceptsDrop: !!activePayload, folderPath },
  })

  const content = (
    <div
      ref={setNodeRef}
      onDoubleClick={onNavigate}
      className={cn(
        "group relative flex cursor-pointer select-none flex-col items-center gap-2 rounded-xl p-3 text-center transition-all",
        "hover:bg-slate-100 dark:hover:bg-white/5",
        isOver && !!activePayload && "bg-violet-100 ring-1 ring-violet-400 dark:bg-violet-500/20"
      )}
    >
      <Folder className={cn("size-10", isOver && !!activePayload ? "text-violet-500 dark:text-violet-400" : "text-amber-400 dark:text-amber-500/80")} fill="currentColor" fillOpacity={0.4} />
      {hasMappedFiles && (
        <div className="absolute right-3 top-3 size-2.5 rounded-full border-2 border-white bg-violet-500 dark:border-slate-900" title="Mapped file" />
      )}
      <span className="line-clamp-2 text-xs font-medium text-slate-700 dark:text-slate-200" title={name}>
        {name}
      </span>
    </div>
  )

  if (!hasMappedFiles || !onRemoveMapping) {
    return content
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {content}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onRemoveMapping} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:text-red-400 dark:focus:text-red-400 dark:focus:bg-red-500/10 cursor-pointer">
          <Trash2 className="mr-2 size-4" />
          {copy.workspaceDialogs.doNotInstall}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function ExplorerFileItem({ 
  file, 
  isMapped,
  onRemoveMapping,
  copy
}: { 
  file: ModImportFileEntry
  isMapped?: boolean
  onRemoveMapping?: () => void
  copy: AppCopy
}) {
  const name = getBaseName(file.targetPath)
  
  const content = (
    <div
      className={cn(
        "group relative flex select-none flex-col items-center gap-2 rounded-xl p-3 text-center transition-all",
        "hover:bg-slate-50 dark:hover:bg-white/[0.02]"
      )}
    >
      <div className="flex size-10 items-center justify-center">
        {getFileIcon(name)}
      </div>
      {isMapped && (
        <div className="absolute right-3 top-3 size-2.5 rounded-full border-2 border-white bg-violet-500 dark:border-slate-900" title="Mapped file" />
      )}
      <span className="line-clamp-2 text-xs text-slate-600 dark:text-slate-300" title={name}>
        {name}
      </span>
    </div>
  )

  if (!isMapped || !onRemoveMapping) {
    return content
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {content}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onRemoveMapping} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:text-red-400 dark:focus:text-red-400 dark:focus:bg-red-500/10 cursor-pointer">
          <Trash2 className="mr-2 size-4" />
          {copy.workspaceDialogs.doNotInstall}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
