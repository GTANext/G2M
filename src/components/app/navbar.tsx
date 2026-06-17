import { getCurrentWindow } from "@tauri-apps/api/window"
import {
  Maximize2,
  Minimize2,
  MonitorCog,
  MoonStar,
  Square,
  SunMedium,
  X,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useMemo, useState, type MouseEvent } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type NavbarProps = {
  subtitle?: string
  title: string
}

function Navbar({ subtitle, title }: NavbarProps) {
  const appWindow = useMemo(() => getCurrentWindow(), [])
  const [isMaximized, setIsMaximized] = useState(false)
  const { resolvedTheme, setTheme, theme = "system" } = useTheme()

  useEffect(() => {
    void (async () => {
      setIsMaximized(await appWindow.isMaximized())
    })()
  }, [appWindow])

  async function handleToggleMaximize() {
    await appWindow.toggleMaximize()
    setIsMaximized(await appWindow.isMaximized())
  }

  function handleDragStart(event: MouseEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return
    }

    void appWindow.startDragging()
  }

  function handleTitleBarDoubleClick() {
    void handleToggleMaximize()
  }

  function handleCycleTheme() {
    const nextTheme =
      theme === "system" ? "light" : theme === "light" ? "dark" : "system"

    setTheme(nextTheme)
  }

  const themeMeta =
    theme === "light"
      ? {
          icon: SunMedium,
          label: "浅色",
          title: "当前主题：浅色，点击切换到深色",
        }
      : theme === "dark"
        ? {
            icon: MoonStar,
            label: "深色",
            title: "当前主题：深色，点击切换到跟随系统",
          }
        : {
            icon: MonitorCog,
            label: `系统·${resolvedTheme === "dark" ? "深色" : "浅色"}`,
            title: `当前主题：跟随系统，现在使用${resolvedTheme === "dark" ? "深色" : "浅色"}，点击切换到浅色`,
          }

  const ThemeIcon = themeMeta.icon

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 lg:px-6">
      <div className="mx-auto max-w-[1700px]">
        <div className="flex h-16 items-center justify-between rounded-[22px] border border-white/60 bg-white/80 px-3 shadow-[0_16px_60px_rgba(15,23,42,0.08)] backdrop-blur select-none dark:border-white/10 dark:bg-black/45 dark:shadow-[0_16px_60px_rgba(0,0,0,0.35)]">
          <div
            data-tauri-drag-region
            className="flex min-w-0 flex-1 cursor-move items-center gap-3 px-2"
            onMouseDown={handleDragStart}
            onDoubleClick={handleTitleBarDoubleClick}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl text-white">
              <img src="/images/logo.svg" alt="G2M" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {subtitle ?? "GTA 三部曲 Mod 管理工作区"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer rounded-xl px-3 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              onClick={handleCycleTheme}
              title={themeMeta.title}
            >
              <ThemeIcon className="size-4" />
              <span>{themeMeta.label}</span>
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              className="cursor-pointer rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              onClick={() => void appWindow.minimize()}
            >
              <Minimize2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="cursor-pointer rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              onClick={() => void handleToggleMaximize()}
            >
              {isMaximized ? (
                <Square className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn(
                "cursor-pointer rounded-xl text-slate-500 hover:text-white",
                "hover:bg-red-500",
              )}
              onClick={() => void appWindow.close()}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

export { Navbar }
