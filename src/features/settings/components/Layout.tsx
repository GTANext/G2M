import type { ReactNode } from "react"

import { useTranslation } from "react-i18next"
import { G2MPill, G2MSubtlePanel } from "@/components/g2m/surface"
import { TabsTrigger } from "@/components/ui/tabs"

function TabTrigger({
  value,
  title,
}: {
  value: string
  title: string
}) {
  return (
    <TabsTrigger
      value={value}
      className="!h-auto rounded-full border border-transparent bg-transparent px-3 py-2.5 text-sm font-medium text-slate-500 transition-all hover:text-slate-800 data-active:border-white/80 data-active:bg-white/90 data-active:text-slate-950 data-active:shadow-[0_6px_20px_rgba(15,23,42,0.08)] dark:text-slate-300 dark:hover:text-slate-100 dark:data-active:border-white/10 dark:data-active:bg-white/[0.08] dark:data-active:text-slate-50"
    >
      {title}
    </TabsTrigger>
  )
}

function SectionShell({
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
  const { t } = useTranslation()

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-black/[0.05] text-slate-700 dark:bg-white/[0.08] dark:text-slate-100">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
              {t("common.settings")}
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

function CategoryHeader({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: ReactNode
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-black/[0.05] text-slate-700 dark:bg-white/[0.08] dark:text-slate-100">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
          {title}
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          {description}
        </p>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <G2MSubtlePanel className="rounded-[20px] border border-white/75 bg-white/60 p-4 ring-1 ring-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/[0.04]">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {value}
      </p>
    </G2MSubtlePanel>
  )
}

export { CategoryHeader, MiniStat, SectionShell, TabTrigger }
