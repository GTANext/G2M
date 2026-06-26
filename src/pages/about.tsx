import { useState } from "react"
import { check } from "@tauri-apps/plugin-updater"
import { relaunch } from "@tauri-apps/plugin-process"
import { toast } from "sonner"
import type { ReactNode } from "react"
import { MonitorCog, DownloadCloud, RefreshCcw } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { useI18n } from "@/components/app/i18nProvider"
import { G2MPageHeroCard } from "@/components/g2m/pageHeroCard"
import { G2MPanel, G2MPill } from "@/components/g2m/surface"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatApiErrorMessage } from "@/lib/api"

const optionCardClass =
  "h-full rounded-[24px] border border-white/70 bg-white/70 p-5 text-left shadow-[0_12px_32px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.04] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/[0.04]"

export function AboutPage() {
  const navigate = useNavigate()
  const { copy } = useI18n()

  return (
    <div className="mx-auto max-w-[1380px] space-y-6">
      <G2MPageHeroCard
        eyebrow="G2M"
        title="关于应用"
        description="检查应用更新并查看版本信息。"
        actions={
          <Button
            variant="outline"
            className="cursor-pointer rounded-xl border-border/70 bg-background/70 px-4 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
            onClick={() => navigate(-1)}
          >
            {copy.common.back}
          </Button>
        }
      />

      <G2MPanel className="overflow-hidden p-2">
        <div className="rounded-[28px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.68),rgba(248,250,252,0.56))] ring-1 ring-black/[0.04] backdrop-blur-2xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.48),rgba(15,23,42,0.3))] dark:ring-white/[0.04]">
          <div className="p-4 sm:p-5 lg:p-6">
            <AboutSectionShell
              title="关于应用"
              description="检查应用更新并查看版本信息。"
              badge="G2M"
              icon={<MonitorCog className="size-5" />}
            >
              <UpdaterSection />
            </AboutSectionShell>
          </div>
        </div>
      </G2MPanel>
    </div>
  )
}

function UpdaterSection() {
  const [isChecking, setIsChecking] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  async function handleCheckUpdate() {
    let toastId: string | number | undefined
    try {
      setIsChecking(true)
      toastId = toast.loading("正在检查更新...")
      const update = await check()
      
      if (update) {
        toast.loading(`发现新版本 ${update.version}，正在下载并安装...`, { id: toastId })
        setIsUpdating(true)
        
        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              break
            case 'Progress':
              break
            case 'Finished':
              break
          }
        })
        
        toast.success("更新安装完成，即将重启应用...", { id: toastId })
        setTimeout(() => {
          void relaunch()
        }, 1500)
      } else {
        toast.success("当前已经是最新版本", { id: toastId })
      }
    } catch (error) {
      toast.error("检查更新失败", { 
        id: toastId,
        description: formatApiErrorMessage(error) 
      })
    } finally {
      setIsChecking(false)
      setIsUpdating(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={cn(optionCardClass, "flex flex-col gap-5 justify-between")}>
        <div>
          <div className="flex items-center gap-3">
            <DownloadCloud className="size-6 text-slate-700 dark:text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">应用更新</h3>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            检查并安装 G2M 的最新版本。如果发现新版本，程序将会自动下载并重启安装。
          </p>
        </div>
        <Button 
          disabled={isChecking || isUpdating} 
          onClick={() => void handleCheckUpdate()}
          className="w-full cursor-pointer bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {isUpdating ? (
            <>
              <RefreshCcw className="mr-2 size-4 animate-spin" />
              正在更新...
            </>
          ) : isChecking ? (
            <>
              <RefreshCcw className="mr-2 size-4 animate-spin" />
              检查中...
            </>
          ) : (
            "检查更新"
          )}
        </Button>
      </div>
    </div>
  )
}

function AboutSectionShell({
  title,
  description,
  badge,
  icon,
  children,
}: {
  title: string
  description: string
  badge: string
  icon: ReactNode
  children: ReactNode
}) {
  const { copy } = useI18n()

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-black/[0.05] text-slate-700 dark:bg-white/[0.08] dark:text-slate-100">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
              {copy.common.settings}
            </p>
            <h2 className="mt-2 text-[30px] font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              {title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              {description}
            </p>
          </div>
        </div>

        <G2MPill className="w-fit bg-black/[0.04] text-slate-600 dark:bg-white/[0.08] dark:text-slate-300">
          {badge}
        </G2MPill>
      </div>

      <div>{children}</div>
    </section>
  )
}
