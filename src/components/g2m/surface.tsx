import type { HTMLAttributes } from "react"

import { cn } from "@/lib/utils"

function G2MPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[30px] border border-white/70 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.12),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,245,249,0.94))] shadow-[0_24px_90px_rgba(15,23,42,0.1)] ring-1 ring-black/[0.03] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.14),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.82))] dark:shadow-[0_24px_90px_rgba(0,0,0,0.38)] dark:ring-white/[0.03]",
        className,
      )}
      {...props}
    />
  )
}

function G2MSubtlePanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-white/65 bg-[linear-gradient(135deg,rgba(248,250,252,0.96),rgba(241,245,249,0.88))] ring-1 ring-black/[0.03] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.6),rgba(15,23,42,0.72))] dark:ring-white/[0.03]",
        className,
      )}
      {...props}
    />
  )
}

function G2MPill({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium",
        className,
      )}
      {...props}
    />
  )
}

export { G2MPanel, G2MPill, G2MSubtlePanel }
