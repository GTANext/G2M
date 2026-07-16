import type { Dispatch, SetStateAction } from "react"

import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Field } from "@/features/builder/components/Field"
import type { BuilderForm } from "@/features/builder/types"

function IdentityFields({
  form,
  setForm,
}: {
  form: BuilderForm
  setForm: Dispatch<SetStateAction<BuilderForm>>
}) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Field label={t("workspaceDialogs.modName")}>
        <Input
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          className="h-10 rounded-lg border-border/70 bg-background shadow-none dark:border-white/10 dark:bg-white/[0.03]"
        />
      </Field>
      <Field label={t("builderPage.modVersion")}>
        <Input
          value={form.version}
          onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))}
          placeholder={t("builderPage.modVersionPlaceholder")}
          className="h-10 rounded-lg border-border/70 bg-background shadow-none dark:border-white/10 dark:bg-white/[0.03]"
        />
      </Field>
      <Field label={t("builderPage.modAuthor")}>
        <Input
          value={form.author}
          onChange={(event) => setForm((current) => ({ ...current, author: event.target.value }))}
          placeholder={t("builderPage.modAuthorPlaceholder")}
          className="h-10 rounded-lg border-border/70 bg-background shadow-none dark:border-white/10 dark:bg-white/[0.03]"
        />
      </Field>
    </div>
  )
}

export { IdentityFields }
