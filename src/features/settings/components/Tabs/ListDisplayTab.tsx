import { AlignJustify, Eye, Layers3, LayoutGrid, List } from "lucide-react"
import { useTranslation } from "react-i18next"

import { G2MSubtlePanel } from "@/components/g2m/surface"
import { TabsContent } from "@/components/ui/tabs"
import { ChoiceCard, ToggleCard } from "@/features/settings/components/Cards"
import { CategoryHeader, MiniStat, SectionShell } from "@/features/settings/components/Layout"
import { useSummary } from "@/features/settings/hooks/useSummary"

export function ListDisplayTab() {
  const { t } = useTranslation()
  const {
    currentHomeViewLabel,
    currentListDisplayLabel,
    currentWorkspaceViewModeLabel,
    homeViewMode,
    modListViewMode,
    setHomeViewMode,
    setModListViewMode,
    setShowHomeGameDetails,
    showHomeGameDetails,
  } = useSummary()

  return (
    <TabsContent value="list-display" className="mt-0">
      <SectionShell
        title={t("settings.listDisplayTitle")}
        description={t("settings.listDisplayDescription")}
        badge={currentListDisplayLabel}
        icon={<List className="size-5" />}
      >
        <div className="space-y-6">
          <G2MSubtlePanel className="rounded-[28px] border border-white/75 bg-white/65 p-5 ring-1 ring-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/[0.04]">
            <CategoryHeader
              title={t("settings.homeDisplayTitle")}
              description={t("settings.homeDisplayDescription")}
              icon={<LayoutGrid className="size-5" />}
            />

            <div className="mt-5 space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <ChoiceCard
                  active={homeViewMode === "card"}
                  title={t("settings.homeDisplayGames")}
                  description={t("settings.homeDisplayGamesDescription")}
                  icon={<LayoutGrid className="size-5" />}
                  onClick={() => setHomeViewMode("card")}
                />
                <ChoiceCard
                  active={homeViewMode === "list"}
                  title={t("settings.homeDisplayMods")}
                  description={t("settings.homeDisplayModsDescription")}
                  icon={<List className="size-5" />}
                  onClick={() => setHomeViewMode("list")}
                />
              </div>

              <ToggleCard
                title={t("settings.moreInfoLabel")}
                description={t("settings.moreInfoDescription")}
                icon={<Eye className="size-5" />}
                checked={showHomeGameDetails}
                checkedLabel={showHomeGameDetails ? t("settings.on") : t("settings.off")}
                onCheckedChange={setShowHomeGameDetails}
              />
            </div>
          </G2MSubtlePanel>

          <G2MSubtlePanel className="rounded-[28px] border border-white/75 bg-white/65 p-5 ring-1 ring-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/[0.04]">
            <CategoryHeader
              title={t("settings.workspaceDisplayTitle")}
              description={t("settings.workspaceDisplayDescription")}
              icon={<Layers3 className="size-5" />}
            />

            <div className="mt-5 space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <ChoiceCard
                  active={modListViewMode === "detailed"}
                  title={t("settings.workspaceViewModeDetailed")}
                  description={t("settings.workspaceViewModeDetailedDescription")}
                  icon={<AlignJustify className="size-5" />}
                  onClick={() => setModListViewMode("detailed")}
                />
                <ChoiceCard
                  active={modListViewMode === "compact"}
                  title={t("settings.workspaceViewModeCompact")}
                  description={t("settings.workspaceViewModeCompactDescription")}
                  icon={<List className="size-5" />}
                  onClick={() => setModListViewMode("compact")}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <MiniStat
                  label={t("settings.workspaceDisplayModeLabel")}
                  value={currentWorkspaceViewModeLabel}
                />
                <MiniStat
                  label={t("settings.homeDisplayTitle")}
                  value={currentHomeViewLabel}
                />
              </div>
            </div>
          </G2MSubtlePanel>
        </div>
      </SectionShell>
    </TabsContent>
  )
}
