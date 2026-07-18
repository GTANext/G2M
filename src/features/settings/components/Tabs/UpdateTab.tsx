import { Download, RefreshCcw } from "lucide-react"
import { useTranslation } from "react-i18next"

import { G2MSubtlePanel } from "@/components/g2m/surface"
import { TabsContent } from "@/components/ui/tabs"
import { ChoiceCard } from "@/features/settings/components/Cards"
import { CategoryHeader, SectionShell } from "@/features/settings/components/Layout"
import { useSummary } from "@/features/settings/hooks/useSummary"

export function UpdateTab() {
  const { t } = useTranslation()
  const {
    appUpdateApiSource,
    appUpdateDownloadSource,
    currentUpdateApiSourceLabel,
    currentUpdateDownloadSourceLabel,
    setAppUpdateApiSource,
    setAppUpdateDownloadSource,
  } = useSummary()

  return (
    <TabsContent value="update" className="mt-0">
      <SectionShell
        title={t("update.settingsTitle")}
        description={t("update.settingsDescription")}
        badge={`${currentUpdateApiSourceLabel} · ${currentUpdateDownloadSourceLabel}`}
        icon={<RefreshCcw className="size-5" />}
      >
        <div className="space-y-6">
          <G2MSubtlePanel className="rounded-[28px] border border-white/75 bg-white/65 p-5 ring-1 ring-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/[0.04]">
            <CategoryHeader
              title={t("update.apiSource")}
              description={t("update.apiSourceDescription")}
              icon={<RefreshCcw className="size-5" />}
            />

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <ChoiceCard
                active={appUpdateApiSource === "gtamodx"}
                title="GTAMODX"
                description={t("update.apiSourceGtmodxDescription")}
                icon={<RefreshCcw className="size-5" />}
                onClick={() => setAppUpdateApiSource("gtamodx")}
              />
              <ChoiceCard
                active={appUpdateApiSource === "github"}
                title="GitHub RC"
                description={t("update.apiSourceGithubDescription")}
                icon={<Download className="size-5" />}
                onClick={() => setAppUpdateApiSource("github")}
              />
            </div>
          </G2MSubtlePanel>

          <G2MSubtlePanel className="rounded-[28px] border border-white/75 bg-white/65 p-5 ring-1 ring-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/[0.04]">
            <CategoryHeader
              title={t("update.downloadSource")}
              description={t("update.downloadSourceDescription")}
              icon={<Download className="size-5" />}
            />

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <ChoiceCard
                active={appUpdateDownloadSource === "proxy"}
                title="gh-proxy.com"
                description={t("update.downloadSourceProxyDescription")}
                icon={<Download className="size-5" />}
                onClick={() => setAppUpdateDownloadSource("proxy")}
              />
              <ChoiceCard
                active={appUpdateDownloadSource === "official"}
                title="GitHub"
                description={t("update.downloadSourceOfficialDescription")}
                icon={<Download className="size-5" />}
                onClick={() => setAppUpdateDownloadSource("official")}
              />
            </div>
          </G2MSubtlePanel>
        </div>
      </SectionShell>
    </TabsContent>
  )
}
