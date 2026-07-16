import { PackageCheck } from "lucide-react"

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof PackageCheck
  title: string
  description: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
          <Icon className="size-4" />
        </div>
        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      </div>
      <p className="pl-10 text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  )
}

export { SectionHeading }
