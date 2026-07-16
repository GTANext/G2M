import type { ReactNode } from "react"

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      {children}
    </div>
  )
}

export { Field }
