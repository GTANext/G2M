import type { ReactNode } from "react"

import { useTranslation } from "react-i18next"
import { G2MPill, G2MSubtlePanel } from "@/components/g2m/surface"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

const optionCardClassName =
  "h-full rounded-[24px] border border-white/70 bg-white/70 p-5 text-left shadow-[0_12px_32px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.04] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/[0.04]"

function ChoiceCard({
  active,
  title,
  description,
  icon,
  preview,
  onClick,
}: {
  active: boolean
  title: string
  description: ReactNode
  icon: ReactNode
  preview?: ReactNode
  onClick: () => void
}) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        optionCardClassName,
        "cursor-pointer",
        active
          ? "border-sky-200/80 bg-sky-50/80 ring-2 ring-sky-100 dark:border-sky-400/30 dark:bg-sky-500/10 dark:ring-sky-400/15"
          : "hover:border-black/10 dark:hover:border-white/15",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-black/[0.05] text-slate-700 dark:bg-white/[0.08] dark:text-slate-100">
          {icon}
        </div>
        <G2MPill
          className={
            active
              ? "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200"
              : "bg-black/[0.04] text-slate-500 dark:bg-white/[0.08] dark:text-slate-300"
          }
        >
          {active ? t("common.current") : t("common.clickToSwitch")}
        </G2MPill>
      </div>

      <h3 className="mt-5 text-lg font-semibold text-slate-950 dark:text-slate-50">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {description}
      </p>
      {preview ? <div className="mt-5">{preview}</div> : null}
    </button>
  )
}

function ToggleCard({
  title,
  description,
  icon,
  checked,
  checkedLabel,
  onCheckedChange,
}: {
  title: string
  description: string
  icon: ReactNode
  checked: boolean
  checkedLabel: string
  onCheckedChange: (value: boolean) => void
}) {
  return (
    <G2MSubtlePanel className="rounded-[24px] border border-white/75 bg-white/65 p-5 ring-1 ring-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/[0.04]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-black/[0.05] text-slate-700 dark:bg-white/[0.08] dark:text-slate-100">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
              {title}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-full border border-black/5 bg-white/80 px-4 py-2 dark:border-white/10 dark:bg-white/[0.05]">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {checkedLabel}
          </span>
          <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={title} />
        </div>
      </div>
    </G2MSubtlePanel>
  )
}

function LanguageCard({
  active,
  title,
  description,
  code,
  onClick,
}: {
  active: boolean
  title: string
  description: string
  code: string
  onClick: () => void
}) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        optionCardClassName,
        "cursor-pointer",
        active
          ? "border-sky-200/80 bg-sky-50/80 ring-2 ring-sky-100 dark:border-sky-400/30 dark:bg-sky-500/10 dark:ring-sky-400/15"
          : "hover:border-black/10 dark:hover:border-white/15",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 min-w-11 items-center justify-center rounded-2xl bg-black/[0.05] px-3 text-xs font-semibold tracking-[0.22em] text-slate-700 dark:bg-white/[0.08] dark:text-slate-100">
          {code}
        </div>
        <G2MPill
          className={
            active
              ? "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200"
              : "bg-black/[0.04] text-slate-500 dark:bg-white/[0.08] dark:text-slate-300"
          }
        >
          {active ? t("common.current") : t("common.clickToSwitch")}
        </G2MPill>
      </div>

      <h3 className="mt-5 text-lg font-semibold text-slate-950 dark:text-slate-50">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {description}
      </p>
    </button>
  )
}

export { ChoiceCard, LanguageCard, ToggleCard }
