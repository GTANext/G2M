import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { G2MPageHeroCard } from "@/components/g2m/pageHeroCard"
import { G2MPanel } from "@/components/g2m/surface"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList } from "@/components/ui/tabs"
import { TabTrigger } from "@/features/settings/components/Layout"
import {
  AiTab,
  AppearanceTab,
  BuilderTab,
  LanguageTab,
  ListDisplayTab,
  TitleBarTab,
  UpdateTab,
} from "@/features/settings/components/Tabs"

function Page() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-[1700px] space-y-6">
      <G2MPageHeroCard
        eyebrow={t("common.settings")}
        title={t("settings.heroTitle")}
        description={t("settings.heroDescription")}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="cursor-pointer rounded-xl border-border/70 bg-background/70 px-4 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              onClick={() => navigate(-1)}
            >
              {t("common.back")}
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="appearance">
        <G2MPanel className="overflow-hidden p-2">
          <div className="overflow-x-auto border-b border-black/5 px-4 py-3 dark:border-white/10 sm:px-5">
            <TabsList className="flex h-auto w-max min-w-full gap-1 rounded-full bg-black/[0.04] p-1 dark:bg-white/[0.05]">
              {[
                { value: "appearance", title: t("settings.appearanceTitle") },
                { value: "title-bar", title: t("settings.titleBar") },
                { value: "list-display", title: t("settings.listDisplayTitle") },
                { value: "update", title: t("update.settingsTitle") },
                { value: "builder", title: t("navbar.builder") },
                { value: "ai", title: t("settings.aiSettings") },
                { value: "language", title: t("settings.languageSectionTitle") },
              ].map((tab) => (
                <TabTrigger key={tab.value} value={tab.value} title={tab.title} />
              ))}
            </TabsList>
          </div>

          <div className="p-4 sm:p-5 lg:p-6">
            <AppearanceTab />
            <TitleBarTab />
            <ListDisplayTab />
            <UpdateTab />
            <BuilderTab />
            <AiTab />
            <LanguageTab />
          </div>
        </G2MPanel>
      </Tabs>
    </div>
  )
}

export { Page }
