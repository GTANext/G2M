import { ChevronRight, FileCode2, FolderTree } from "lucide-react"
import { useMemo, useState } from "react"

import { buildModFileTree, type ModImportFileEntry, type ModFileTreeNode } from "@/lib/g2m"
import { cn } from "@/lib/utils"

type ModFileTreeProps = {
  files: ModImportFileEntry[]
  mode?: "source" | "target"
  emptyLabel: string
  className?: string
}

function ModFileTree({
  files,
  mode = "target",
  emptyLabel,
  className,
}: ModFileTreeProps) {
  const tree = useMemo(() => buildModFileTree(files, mode), [files, mode])

  if (tree.length === 0) {
    return (
      <div className={cn("rounded-2xl border border-dashed border-border/70 p-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400", className)}>
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className={cn("space-y-1", className)}>
      {tree.map((node) => (
        <ModFileTreeNodeView key={node.key} node={node} depth={0} />
      ))}
    </div>
  )
}

function ModFileTreeNodeView({
  node,
  depth,
}: {
  node: ModFileTreeNode
  depth: number
}) {
  const isFolder = node.kind === "folder"
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div>
      <div
        className={cn(
          "flex items-start gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 ring-1 ring-black/5 transition-colors dark:text-slate-200 dark:ring-white/10",
          isFolder
            ? "cursor-pointer bg-slate-50/80 hover:bg-slate-100/80 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
            : "bg-background/80 dark:bg-white/[0.02]",
        )}
        style={{ marginLeft: depth * 14 }}
        onClick={isFolder ? () => setIsExpanded((current) => !current) : undefined}
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
            <span className="size-4 shrink-0" />
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
            <ModFileTreeNodeView key={child.key} node={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export { ModFileTree }
