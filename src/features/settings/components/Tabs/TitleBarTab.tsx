import { AppWindowMac, Monitor, MonitorCog } from "lucide-react"
import { useTranslation } from "react-i18next"

import { TabsContent } from "@/components/ui/tabs"
import { ChoiceCard } from "@/features/settings/components/Cards"
import { MiniStat, SectionShell } from "@/features/settings/components/Layout"
import { WindowPreview } from "@/features/settings/components/WindowPreview"
import { useSummary } from "@/features/settings/hooks/useSummary"

export function TitleBarTab() {
  const { t } = useTranslation()
  const { currentTitleBarLabel, setTitleBarStyle, titleBarStyle } = useSummary()

  return (
    <TabsContent value="title-bar" className="mt-0">
      <SectionShell
        title={t("settings.titleBar")}
        description={t("settings.titleBarDescription")}
        badge={currentTitleBarLabel}
        icon={<MonitorCog className="size-5" />}
      >
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <ChoiceCard
              active={titleBarStyle === "windows"}
              title={t("settings.windowsStyle")}
              description={t("settings.windowsDescription")}
              icon={<Monitor className="size-5" />}
              preview={<WindowPreview styleType="windows" />}
              onClick={() => setTitleBarStyle("windows")}
            />
            <ChoiceCard
              active={titleBarStyle === "mac"}
              title={t("settings.macStyle")}
              description={t("settings.macDescription")}
              icon={<AppWindowMac className="size-5" />}
              preview={<WindowPreview styleType="mac" />}
              onClick={() => setTitleBarStyle("mac")}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <MiniStat
              label={t("settings.buttonPosition")}
              value={titleBarStyle === "windows" ? t("settings.right") : t("settings.left")}
            />
            <MiniStat
              label={t("settings.titleAlignment")}
              value={titleBarStyle === "windows" ? t("settings.right") : t("settings.moreCentered")}
            />
            <MiniStat
              label={t("settings.defaultMode")}
              value={t("settings.windowsStyle")}
            />
          </div>
        </div>
      </SectionShell>
    </TabsContent>
  )
}
