import { useTranslation } from "react-i18next"

import { G2MPageHeroCard } from "@/components/g2m/pageHeroCard"
import { ManifestSection, MappingSection } from "@/features/builder/components\MappingSection"
import { MetadataSection } from "@/features/builder/components/MetadataSection"
import { SourceSection } from "@/features/builder/components/SourceSection"
import { useBuilder } from "@/features/builder/hooks/useBuilder"

function Page() {
  const { t } = useTranslation()
  const builder = useBuilder()

  return (
    <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-6 pb-10">
      <G2MPageHeroCard
        eyebrow={t("builderPage.metadataTitle")}
        title={t("routes.builderSubtitle")}
        description={t("builderPage.pageDescription")}
      />

      <div className="space-y-6">
        <SourceSection
          hasSource={builder.hasSource}
          isInspecting={builder.isInspecting}
          pickSourceDir={builder.pickSourceDir}
          pickSourceZip={builder.pickSourceZip}
          preview={builder.preview}
          sourceDisplayType={builder.sourceDisplayType}
        />

        {builder.hasSource && builder.preview ? (
          <>
            <MetadataSection
              addCustomPrerequisite={builder.addCustomPrerequisite}
              addExtraLink={builder.addExtraLink}
              customPrereqForm={builder.customPrereqForm}
              form={builder.form}
              isCustomPrereqSheetOpen={builder.isCustomPrereqSheetOpen}
              pickModIcon={builder.pickModIcon}
              removeCustomPrerequisite={builder.removeCustomPrerequisite}
              removeExtraLink={builder.removeExtraLink}
              setCustomPrereqForm={builder.setCustomPrereqForm}
              setForm={builder.setForm}
              setIsCustomPrereqSheetOpen={builder.setIsCustomPrereqSheetOpen}
              updateExtraLink={builder.updateExtraLink}
              updateSpecialLink={builder.updateSpecialLink}
            />
            <MappingSection
              builderMappingMode={builder.builderMappingMode}
              files={builder.mappings}
              gameTargetNodes={builder.gameTargetNodes}
              gameTargetsByPath={builder.gameTargetsByPath}
              handleDropToFolder={builder.handleDropToFolder}
              resetMappings={builder.resetMappings}
              setBuilderMappingMode={builder.setBuilderMappingMode}
              toggleGameType={builder.toggleGameType}
              updateTargetPath={builder.updateTargetPath}
            />
            <ManifestSection
              buildArchive={builder.buildArchive}
              generateManifest={builder.generateManifest}
              manifestPreview={builder.manifestPreview}
            />
          </>
        ) : null}
      </div>
    </div>
  )
}

export { Page }
