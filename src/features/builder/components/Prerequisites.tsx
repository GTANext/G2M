import type { Dispatch, SetStateAction } from "react"
import { Plus, Puzzle, Trash2 } from "lucide-react"

import { useTranslation } from "react-i18next"
import {
  drawerBodyClass,
  drawerCardContentClass,
  drawerFooterClass,
  drawerHandleBarClass,
  drawerHandleClass,
  drawerHeaderClass,
  drawerOverlayClass,
  drawerPanelClass,
  drawerViewportClass,
} from "@/components/g2m/workspaceDialogs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Field } from "@/features/builder/components/Field"
import { SectionHeading } from "@/features/builder/components/SectionHeading"
import { AVAILABLE_PREREQUISITES, type BuilderForm } from "@/features/builder/types"
import type { BuilderCustomPrerequisite } from "@/lib/g2m"

function Prerequisites({
  addCustomPrerequisite,
  customPrereqForm,
  form,
  isCustomPrereqSheetOpen,
  removeCustomPrerequisite,
  setCustomPrereqForm,
  setForm,
  setIsCustomPrereqSheetOpen,
}: {
  addCustomPrerequisite: () => void
  customPrereqForm: { name: string; url: string }
  form: BuilderForm
  isCustomPrereqSheetOpen: boolean
  removeCustomPrerequisite: (index: number) => void
  setCustomPrereqForm: Dispatch<SetStateAction<{ name: string; url: string }>>
  setForm: Dispatch<SetStateAction<BuilderForm>>
  setIsCustomPrereqSheetOpen: (open: boolean) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="mt-6 border-t border-border/50 pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeading
          icon={Puzzle}
          title={t("builderPage.prerequisitesTitle")}
          description={t("builderPage.prerequisitesDescription")}
        />
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg"
            onClick={() => setIsCustomPrereqSheetOpen(true)}
          >
            <Plus className="mr-1.5 size-3" />
            {t("builderPage.addCustomPrerequisite")}
          </Button>
        </div>
      </div>

      <Sheet
        addCustomPrerequisite={addCustomPrerequisite}
        customPrereqForm={customPrereqForm}
        isOpen={isCustomPrereqSheetOpen}
        setCustomPrereqForm={setCustomPrereqForm}
        setIsOpen={setIsCustomPrereqSheetOpen}
      />

      <div className="mt-5 flex flex-wrap gap-4">
        {AVAILABLE_PREREQUISITES.map((requirement) => (
          <label key={requirement.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-2 transition-colors hover:bg-muted/50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]">
            <input
              type="checkbox"
              checked={form.prerequisites.includes(requirement.key)}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  prerequisites: event.target.checked
                    ? [...current.prerequisites, requirement.key]
                    : current.prerequisites.filter((key) => key !== requirement.key),
                }))
              }}
              className="size-4 rounded border-slate-300 text-violet-600 focus:ring-violet-600 dark:border-slate-700 dark:bg-slate-900 dark:ring-offset-slate-950 dark:checked:border-violet-600 dark:checked:bg-violet-600"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{requirement.label}</span>
          </label>
        ))}
        {form.customPrerequisites.map((requirement, index) => (
          <Chip
            key={`${requirement.name}-${index}`}
            index={index}
            item={requirement}
            removeCustomPrerequisite={removeCustomPrerequisite}
          />
        ))}
      </div>
    </div>
  )
}

function Sheet({
  addCustomPrerequisite,
  customPrereqForm,
  isOpen,
  setCustomPrereqForm,
  setIsOpen,
}: {
  addCustomPrerequisite: () => void
  customPrereqForm: { name: string; url: string }
  isOpen: boolean
  setCustomPrereqForm: Dispatch<SetStateAction<{ name: string; url: string }>>
  setIsOpen: (open: boolean) => void
}) {
  const { t } = useTranslation()

  if (!isOpen) {
    return null
  }

  return (
    <div className={drawerOverlayClass}>
      <div className={drawerViewportClass}>
        <Card className={drawerPanelClass}>
          <CardContent className={drawerCardContentClass}>
            <div className={drawerHandleClass}>
              <div className={drawerHandleBarClass} />
            </div>

            <div className={drawerHeaderClass}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="secondary" className="rounded-full bg-violet-100 px-3 py-1 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                    {t("builderPage.customPrerequisitesBadge")}
                  </Badge>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                    {t("builderPage.addCustomPrerequisite")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {t("builderPage.customPrerequisiteUrlError")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="cursor-pointer rounded-xl border-border/70 bg-background/70 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                  onClick={() => setIsOpen(false)}
                >
                  {t("workspaceDialogs.cancel")}
                </Button>
              </div>
            </div>

            <div className={drawerBodyClass}>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label={t("builderPage.customPrerequisiteName")}>
                  <Input
                    value={customPrereqForm.name}
                    onChange={(event) => setCustomPrereqForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder={t("builderPage.customPrerequisiteNamePlaceholder")}
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </Field>
                <Field label={t("builderPage.customPrerequisiteUrl")}>
                  <Input
                    value={customPrereqForm.url}
                    onChange={(event) => setCustomPrereqForm((current) => ({ ...current, url: event.target.value }))}
                    placeholder={t("builderPage.customPrerequisiteUrlPlaceholder")}
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </Field>
              </div>
            </div>

            <div className={drawerFooterClass}>
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  variant="outline"
                  className="cursor-pointer rounded-xl border-border/70 bg-background/70 px-4 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                  onClick={() => setIsOpen(false)}
                >
                  {t("workspaceDialogs.cancel")}
                </Button>
                <Button
                  className="cursor-pointer rounded-xl px-4 shadow-sm"
                  onClick={addCustomPrerequisite}
                >
                  <Plus className="mr-2 size-4" />
                  {t("builderPage.addCustomPrerequisite")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Chip({
  index,
  item,
  removeCustomPrerequisite,
}: {
  index: number
  item: BuilderCustomPrerequisite
  removeCustomPrerequisite: (index: number) => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.02]">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
      <button
        type="button"
        onClick={() => removeCustomPrerequisite(index)}
        className="ml-2 text-slate-400 hover:text-red-500"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  )
}

export { Prerequisites }
