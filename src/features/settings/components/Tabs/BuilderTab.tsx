import { Hammer, List, MousePointer2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { TabsContent } from "@/components/ui/tabs"
import { ChoiceCard } from "@/features/settings/components/Cards"
import { SectionShell } from "@/features/settings/components/Layout"
import { useSummary } from "@/features/settings/hooks/useSummary"

export function BuilderTab() {
  const { t } = useTranslation()
  const { builderMappingMode, currentBuilderModeLabel, setBuilderMappingMode } = useSummary()

  return (
    <TabsContent value="builder" className="mt-0">
      <SectionShell
        title={t("settings.builderModeTitle")}
        description={t("settings.builderModeDescription")}
        badge={currentBuilderModeLabel}
        icon={<Hammer className="size-5" />}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <ChoiceCard
            active={builderMappingMode === "list"}
            title={t("settings.builderModeList")}
            description={t("settings.builderModeListDescription")}
            icon={<List className="size-5" />}
            onClick={() => setBuilderMappingMode("list")}
          />
          <ChoiceCard
            active={builderMappingMode === "tree"}
            title={t("settings.builderModeTree")}
            description={t("settings.builderModeTreeDescription")}
            icon={<List className="size-5" />}
            onClick={() => setBuilderMappingMode("tree")}
          />
          <ChoiceCard
            active={builderMappingMode === "explorer"}
            title={t("settings.builderModeExplorer")}
            description={t("settings.builderModeExplorerDescription")}
            icon={<MousePointer2 className="size-5" />}
            onClick={() => setBuilderMappingMode("explorer")}
          />
        </div>
      </SectionShell>
    </TabsContent>
  )
}
