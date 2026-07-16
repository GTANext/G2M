import type { Dispatch, SetStateAction } from "react"
import { PackageCheck } from "lucide-react"

import { useTranslation } from "react-i18next"
import { G2MPanel } from "@/components/g2m/surface"
import { Textarea } from "@/components/ui/textarea"
import { Field } from "@/features/builder/components/Field"
import { IconField } from "@/features/builder/components/IconField"
import { IdentityFields } from "@/features/builder/components/IdentityFields"
import { Links } from "@/features/builder/components/Links"
import { Prerequisites } from "@/features/builder/components/Prerequisites"
import { SectionHeading } from "@/features/builder/components/SectionHeading"
import type { BuilderForm } from "@/features/builder/types"

function MetadataSection({
  addCustomPrerequisite,
  addExtraLink,
  customPrereqForm,
  form,
  isCustomPrereqSheetOpen,
  pickModIcon,
  removeCustomPrerequisite,
  removeExtraLink,
  setCustomPrereqForm,
  setForm,
  setIsCustomPrereqSheetOpen,
  updateExtraLink,
  updateSpecialLink,
}: {
  addCustomPrerequisite: () => void
  addExtraLink: () => void
  customPrereqForm: { name: string; url: string }
  form: BuilderForm
  isCustomPrereqSheetOpen: boolean
  pickModIcon: () => Promise<void>
  removeCustomPrerequisite: (index: number) => void
  removeExtraLink: (id: string) => void
  setCustomPrereqForm: Dispatch<SetStateAction<{ name: string; url: string }>>
  setForm: Dispatch<SetStateAction<BuilderForm>>
  setIsCustomPrereqSheetOpen: (open: boolean) => void
  updateExtraLink: (id: string, field: "label" | "url", value: string) => void
  updateSpecialLink: (kind: "github" | "gtamodx", value: string) => void
}) {
  const { t } = useTranslation()

  return (
    <G2MPanel>
      <div className="p-5 lg:p-6">
        <SectionHeading
          icon={PackageCheck}
          title={t("workspaceDialogs.modMetadata")}
          description={t("builderPage.pageDescription")}
        />
        <div className="mt-5">
          <IdentityFields form={form} setForm={setForm} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Field label={t("builderPage.modDescription")}>
            <Textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder={t("builderPage.modDescriptionPlaceholder")}
              className="h-[176px] rounded-[18px] border-border/70 bg-background shadow-none dark:border-white/10 dark:bg-white/[0.03]"
            />
          </Field>
          <IconField form={form} pickModIcon={pickModIcon} setForm={setForm} />
        </div>

        <Prerequisites
          addCustomPrerequisite={addCustomPrerequisite}
          customPrereqForm={customPrereqForm}
          form={form}
          isCustomPrereqSheetOpen={isCustomPrereqSheetOpen}
          removeCustomPrerequisite={removeCustomPrerequisite}
          setCustomPrereqForm={setCustomPrereqForm}
          setForm={setForm}
          setIsCustomPrereqSheetOpen={setIsCustomPrereqSheetOpen}
        />
        <Links
          addExtraLink={addExtraLink}
          form={form}
          removeExtraLink={removeExtraLink}
          updateExtraLink={updateExtraLink}
          updateSpecialLink={updateSpecialLink}
        />
      </div>
    </G2MPanel>
  )
}

export { MetadataSection }
