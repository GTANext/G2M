function WindowPreview({ styleType }: { styleType: "windows" | "mac" }) {
  return (
    <div className="rounded-[20px] border border-black/5 bg-white/70 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
      <div className="rounded-[16px] border border-black/5 bg-slate-50/90 p-3 dark:border-white/10 dark:bg-slate-950/60">
        <div className="flex items-center justify-between">
          {styleType === "mac" ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-[#ff5f57]" />
                <span className="size-3 rounded-full bg-[#febc2e]" />
                <span className="size-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="h-2 w-24 rounded-full bg-slate-300/80 dark:bg-slate-700" />
              <div className="w-10" />
            </>
          ) : (
            <>
              <div className="h-2 w-24 rounded-full bg-slate-300/80 dark:bg-slate-700" />
              <div className="flex items-center gap-1.5">
                <span className="h-6 w-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
                <span className="h-6 w-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
                <span className="h-6 w-8 rounded-lg bg-red-100 dark:bg-red-500/20" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export { WindowPreview }
