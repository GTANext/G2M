import { Link2, Plus, Trash2 } from "lucide-react"

import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/features/builder/components/Field"
import { SectionHeading } from "@/features/builder/components/SectionHeading"
import type { BuilderForm } from "@/features/builder/types"
import { getExtraLinks, getSpecialLinkUrl } from "@/features/builder/utils"

function Links({
  addExtraLink,
  form,
  removeExtraLink,
  updateExtraLink,
  updateSpecialLink,
}: {
  addExtraLink: () => void
  form: BuilderForm
  removeExtraLink: (id: string) => void
  updateExtraLink: (id: string, field: "label" | "url", value: string) => void
  updateSpecialLink: (kind: "github" | "gtamodx", value: string) => void
}) {
  const { t } = useTranslation()
  const extraLinks = getExtraLinks(form.links)

  return (
    <div className="mt-6 border-t border-border/50 pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeading
          icon={Link2}
          title={t("builderPage.linksTitle")}
          description={t("builderPage.extraLinksDescription")}
        />
        <Button type="button" variant="outline" size="sm" onClick={addExtraLink} className="h-8 rounded-lg">
          <Plus className="mr-1.5 size-3" />
          {t("builderPage.addLink")}
        </Button>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Field label={t("builderPage.gtamodxUrl")}>
          <Input
            value={getSpecialLinkUrl(form.links, "gtamodx")}
            onChange={(event) => updateSpecialLink("gtamodx", event.target.value)}
            placeholder={t("builderPage.gtamodxUrlPlaceholder")}
            className="h-10 rounded-lg border-border/70 bg-background shadow-none dark:border-white/10 dark:bg-white/[0.03]"
          />
        </Field>
        <Field label={t("builderPage.githubUrl")}>
          <Input
            value={getSpecialLinkUrl(form.links, "github")}
            onChange={(event) => updateSpecialLink("github", event.target.value)}
            placeholder={t("builderPage.githubUrlPlaceholder")}
            className="h-10 rounded-lg border-border/70 bg-background shadow-none dark:border-white/10 dark:bg-white/[0.03]"
          />
        </Field>
      </div>

      {extraLinks.length > 0 ? (
        <div className="mt-4 space-y-3">
          {extraLinks.map((link, index) => (
            <div key={link.id} className="rounded-xl border border-black/5 bg-muted/30 p-3 dark:border-white/10 dark:bg-white/[0.02]">
              <div className="grid gap-3 lg:grid-cols-[1fr_2fr_auto]">
                <Field label={`${t("builderPage.extraLinks")} ${index + 1}`}>
                  <Input
                    value={link.label}
                    onChange={(event) => updateExtraLink(link.id, "label", event.target.value)}
                    placeholder={t("builderPage.linkLabelPlaceholder")}
                    className="h-9 rounded-md bg-background"
                  />
                </Field>
                <Field label={t("builderPage.linkUrlPlaceholder")}>
                  <Input
                    value={link.url}
                    onChange={(event) => updateExtraLink(link.id, "url", event.target.value)}
                    placeholder={t("builderPage.linkUrlPlaceholder")}
                    className="h-9 rounded-md bg-background"
                  />
                </Field>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 px-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                    onClick={() => removeExtraLink(link.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export { Links }
