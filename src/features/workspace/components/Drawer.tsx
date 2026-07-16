import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Drawer as DrawerPrimitive,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import type { MissingLoadedModPrerequisite } from "@/hooks/workspace/useWorkspacePrerequisiteState"
import { softOutlineButtonClass } from "@/features/workspace/types"
import { cn } from "@/lib/utils"

function Drawer({
  open,
  onOpenChange,
  items,
  selectedKeys,
  installing,
  onToggleKey,
  onInstallSelected,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: MissingLoadedModPrerequisite[]
  selectedKeys: string[]
  installing: boolean
  onToggleKey: (key: string, checked: boolean) => void
  onInstallSelected: () => void
}) {
  const { t } = useTranslation()
  const hasInstallableItems = items.some((item) => item.canInstall)
  const selectedInstallableCount = items.filter(
    (item) => item.canInstall && selectedKeys.includes(item.key),
  ).length

  return (
    <DrawerPrimitive open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto w-full max-w-3xl rounded-t-[28px] border-border/60 bg-background/96 px-0 pb-0 shadow-[0_30px_120px_rgba(15,23,42,0.22)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#10131a]/96 dark:shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <DrawerHeader className="px-6 pb-4 pt-5 text-left lg:px-7">
          <DrawerTitle className="text-xl font-semibold text-slate-950 dark:text-slate-50">
            {t("workspacePage.prerequisitesTitle")}
          </DrawerTitle>
          <DrawerDescription className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {t("workspacePage.missingPrerequisiteDrawerDescription")}
          </DrawerDescription>
        </DrawerHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-6 pb-4 lg:px-7">
          {items.map((item) => {
            const checked = selectedKeys.includes(item.key)

            return (
              <label
                key={item.key}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors",
                  item.canInstall
                    ? "border-border/70 bg-background/80 hover:bg-muted/60 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
                    : "cursor-default border-border/60 bg-muted/40 dark:border-white/10 dark:bg-white/[0.03]",
                )}
              >
                <Checkbox
                  checked={checked}
                  disabled={!item.canInstall || installing}
                  onCheckedChange={(value) => onToggleKey(item.key, value === true)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                      {item.label}
                    </p>
                    <Badge
                      variant="outline"
                      className={
                        item.canInstall
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
                      }
                    >
                      {item.canInstall
                        ? t("workspacePage.installPrerequisite")
                        : t("workspacePage.prerequisiteBuiltinMissing")}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {t("workspacePage.prerequisiteRequiredBy", {
                      mods: item.requiredBy.join("、"),
                    })}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {item.scanScope === "scriptsPlugins"
                      ? t("workspacePage.prerequisiteScriptsPlugins")
                      : t("workspacePage.prerequisiteRoot")}
                  </p>
                </div>
              </label>
            )
          })}
        </div>

        <DrawerFooter className="border-t border-border/60 bg-background/90 px-6 py-4 backdrop-blur dark:border-white/10 dark:bg-[#10131a]/90 lg:px-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {hasInstallableItems
                ? t("workspacePage.missingPrerequisitesAlertDescription", {
                    items: items
                      .filter((item) => item.canInstall && selectedKeys.includes(item.key))
                      .map((item) => item.label)
                      .join("、"),
                  })
                : t("workspacePage.prerequisiteBuiltinMissing")}
            </p>
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                variant="outline"
                className={softOutlineButtonClass}
                onClick={() => onOpenChange(false)}
              >
                {t("workspacePage.close")}
              </Button>
              <Button
                className="cursor-pointer rounded-xl px-4"
                disabled={!hasInstallableItems || selectedInstallableCount === 0 || installing}
                onClick={onInstallSelected}
              >
                {t("workspacePage.installSelectedPrerequisites")}
              </Button>
            </div>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </DrawerPrimitive>
  )
}

export { Drawer }
