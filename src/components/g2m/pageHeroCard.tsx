import type { ReactNode } from "react"

import { G2MPanel, G2MPill } from "@/components/g2m/surface"
import { cn } from "@/lib/utils"

type G2MPageHeroCardProps = {
  eyebrow: ReactNode
  title: ReactNode
  description: ReactNode
  actions?: ReactNode
  bottom?: ReactNode
  className?: string
  contentClassName?: string
  actionsClassName?: string
}

function G2MPageHeroCard({
  eyebrow,
  title,
  description,
  actions,
  bottom,
  className,
  contentClassName,
  actionsClassName,
}: G2MPageHeroCardProps) {
  return (
    <G2MPanel className={className}>
      <div className={cn("p-6 lg:p-7", contentClassName)}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <G2MPill className="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                {eyebrow}
              </G2MPill>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                {title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
                {description}
              </p>
            </div>

            {actions ? (
              <div className={cn("flex flex-wrap gap-3 lg:justify-end", actionsClassName)}>
                {actions}
              </div>
            ) : null}
          </div>

          {bottom ? <div className="border-t border-black/5 pt-5 dark:border-white/10">{bottom}</div> : null}
        </div>
      </div>
    </G2MPanel>
  )
}

export { G2MPageHeroCard }
