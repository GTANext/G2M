import { List, MousePointer2, Workflow } from "lucide-react"

import type { AppCopy } from "@/components/app/i18nProvider"
import type { BuilderMappingMode } from "@/components/app/preferencesProvider"
import { cn } from "@/lib/utils"

type FileMappingModeSwitchProps = {
  copy?: AppCopy
  t?: (key: string) => string
  mode: BuilderMappingMode
  onChange: (value: BuilderMappingMode) => void
}

function FileMappingModeSwitch({
  copy,
  t,
  mode,
  onChange,
}: FileMappingModeSwitchProps) {
  const getLabel = (key: string) => {
    if (t) {
      return t(key)
    }
    // 兼容旧的 copy prop
    const parts = key.split('.')
    let result: any = copy
    for (const part of parts) {
      result = result?.[part]
    }
    return result || ''
  }
  
  const options: Array<{
    icon: typeof List
    label: string
    value: BuilderMappingMode
  }> = [
    {
      icon: List,
      label: getLabel("builderPage.builderModeList"),
      value: "list",
    },
    {
      icon: Workflow,
      label: getLabel("builderPage.builderModeTree"),
      value: "tree",
    },
    {
      icon: MousePointer2,
      label: getLabel("builderPage.builderModeExplorer"),
      value: "explorer",
    },
  ]

  return (
    <div className="flex items-center rounded-lg border border-border/50 bg-background/50 p-1 dark:border-white/10 dark:bg-white/[0.02]">
      {options.map((option) => {
        const Icon = option.icon
        const isActive = mode === option.value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
            )}
          >
            <Icon className="size-3.5" />
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export { FileMappingModeSwitch }
