import { useState } from "react"
import { ChevronRight } from "lucide-react"

import type { useI18n } from "@/components/app/i18nProvider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { GameTypeTarget, BuilderGameTargetNode } from "@/lib/g2m"

const PREDEFINED_LOCATIONS = [
  { value: "skip", label: "skip" },
  { value: "/", label: "/" },
  { value: "modloader", label: "modloader" },
  { value: "CLEO", label: "CLEO" },
  { value: "scripts", label: "scripts" },
  { value: "plugins", label: "plugins" },
  { value: "models", label: "models" },
  { value: "data", label: "data" },
  { value: "audio", label: "audio" },
  { value: "text", label: "text" },
  { value: "anim", label: "anim" },
  { value: "movies", label: "movies" },
]

const GAME_TYPE_TARGETS = ["iii", "vc", "sa"] as const
const GAME_TARGET_OPTIONS = GAME_TYPE_TARGETS.map((type) => ({
  value: type,
  label: type.toUpperCase(),
}))

type TargetFolderSelectProps = {
  value: string
  onChange: (v: string) => void
  copy?: ReturnType<typeof useI18n>["copy"]
  t?: (key: string) => string
}

function TargetFolderSelect({ value, onChange, copy, t }: TargetFolderSelectProps) {
  const getLabel = (key: string) => {
    if (t) {
      return t(key)
    }
    const parts = key.split('.')
    let result: any = copy
    for (const part of parts) {
      result = result?.[part]
    }
    return result || ''
  }
  
  const displayValue = !value ? "skip" : value

  const predefinedLocations = PREDEFINED_LOCATIONS.map((loc) => {
    if (loc.value === "skip") return { ...loc, label: getLabel("workspaceDialogs.doNotInstall") }
    if (loc.value === "/") return { ...loc, label: getLabel("workspaceDialogs.installToRoot") }
    return loc
  })
  
  const options = predefinedLocations.some((l) => l.value === displayValue) 
    ? predefinedLocations 
    : [...predefinedLocations, { value: displayValue, label: displayValue }]

  return (
    <Select value={displayValue} onValueChange={(v) => onChange(v === "skip" ? "" : v)}>
      <SelectTrigger className="h-8 w-[180px] rounded-lg border-black/10 bg-background shadow-none dark:border-white/10 dark:bg-white/[0.02]">
        <SelectValue placeholder={getLabel("workspaceDialogs.installPath")} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

type GameTargetTreeNodeProps = {
  copy?: ReturnType<typeof useI18n>["copy"]
  t?: (key: string) => string
  node: BuilderGameTargetNode
  selectedTargets: Record<string, GameTypeTarget[]>
  onToggleGameType?: (path: string, type: GameTypeTarget) => void
  onUpdateTargetPath: (path: string, newTargetPath: string) => void
  showGameTargets?: boolean
  depth?: number
}

function GameTargetTreeNode({
  copy,
  t,
  node,
  selectedTargets,
  onToggleGameType,
  onUpdateTargetPath,
  showGameTargets,
  depth = 0,
}: GameTargetTreeNodeProps) {
  const getLabel = (key: string) => {
    if (t) {
      return t(key)
    }
    const parts = key.split('.')
    let result: any = copy
    for (const part of parts) {
      result = result?.[part]
    }
    return result || ''
  }
  
  const [expanded, setExpanded] = useState(false)
  const isFolder = node.kind === "folder"
  const selectedValues = selectedTargets[node.path] ?? []

  return (
    <div>
      <div
        className="flex flex-col gap-3 rounded-xl border border-transparent px-3 py-2 transition-colors hover:border-black/5 hover:bg-black/[0.02] dark:hover:border-white/5 dark:hover:bg-white/[0.02] lg:flex-row lg:items-center lg:justify-between"
        style={{ marginLeft: depth * 16 }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 pr-4">
          {isFolder ? (
            <button
              type="button"
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-black/5 dark:hover:bg-white/10"
              onClick={() => setExpanded((current) => !current)}
            >
              <ChevronRight className={`size-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
            </button>
          ) : (
            <span className="inline-flex size-6 shrink-0 items-center justify-center" />
          )}
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100" title={node.path}>
            {node.path.split("/").pop() || node.path}
          </p>
          <span className="ml-2 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400">
            {isFolder ? `${node.fileCount} ${getLabel("builderPage.summaryFile")}` : getLabel("builderPage.summaryFile")}
          </span>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-4 pl-8 lg:w-auto lg:pl-0">
          <div className="flex items-center gap-2 w-[240px] justify-end">
            <span className="shrink-0 text-xs font-medium text-slate-500">{getLabel("workspaceDialogs.installPath")}</span>
            <TargetFolderSelect value={node.targetPath} onChange={(val) => onUpdateTargetPath(node.path, val)} copy={copy} t={t} />
          </div>

          {showGameTargets ? (
            <div className="flex w-[140px] justify-end gap-1">
              {GAME_TARGET_OPTIONS.map((option) => {
                const isSelected = selectedValues.includes(option.value as GameTypeTarget)
                return (
                  <button
                    key={`${node.path}-${option.value}`}
                    type="button"
                    className={`flex h-8 items-center justify-center rounded-lg px-2.5 text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-violet-600 text-white dark:bg-violet-500"
                        : "bg-muted text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
                    }`}
                    onClick={() => onToggleGameType?.(node.path, option.value as GameTypeTarget)}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>

      {isFolder && expanded && node.children.length > 0 && (
        <div className="mt-1 flex flex-col">
          {node.children.map((child) => (
            <GameTargetTreeNode
              key={child.path}
              copy={copy}
              t={t}
              node={child}
              selectedTargets={selectedTargets}
              showGameTargets={showGameTargets}
              onToggleGameType={onToggleGameType}
              onUpdateTargetPath={onUpdateTargetPath}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

type ModMappingListProps = {
  copy?: ReturnType<typeof useI18n>["copy"]
  t?: (key: string) => string
  gameTargetNodes: BuilderGameTargetNode[]
  gameTargetsByPath: Record<string, GameTypeTarget[]>
  toggleGameType?: (path: string, type: GameTypeTarget) => void
  updateTargetPath: (path: string, newTargetPath: string) => void
  showGameTargets?: boolean
}

export function ModMappingList({
  copy,
  t,
  gameTargetNodes,
  gameTargetsByPath,
  toggleGameType,
  updateTargetPath,
  showGameTargets = true,
}: ModMappingListProps) {
  return (
    <div className="space-y-1">
      {gameTargetNodes.map((node) => (
        <GameTargetTreeNode
          key={node.path}
          copy={copy}
          t={t}
          node={node}
          selectedTargets={gameTargetsByPath}
          showGameTargets={showGameTargets}
          onToggleGameType={toggleGameType}
          onUpdateTargetPath={updateTargetPath}
        />
      ))}
    </div>
  )
}
