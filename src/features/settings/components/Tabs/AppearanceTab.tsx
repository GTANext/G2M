import { MoonStar, Monitor, Palette, SunMedium } from "lucide-react"
import { useTranslation } from "react-i18next"

import { TabsContent } from "@/components/ui/tabs"
import { ChoiceCard } from "@/features/settings/components/Cards"
import { SectionShell } from "@/features/settings/components/Layout"
import { useSummary } from "@/features/settings/hooks/useSummary"

export function AppearanceTab() {
  const { t } = useTranslation()
  const { currentThemeLabel, resolvedThemeMode, setTheme, theme } = useSummary()

  return (
    <TabsContent value="appearance" className="mt-0">
      <SectionShell
        title={t("settings.appearanceTitle")}
        description={t("settings.appearanceDescription")}
        badge={currentThemeLabel}
        icon={<Palette className="size-5" />}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <ChoiceCard
            active={theme === "system"}
            title={t("settings.followSystem")}
            description={t("settings.followSystemDescription", { mode: resolvedThemeMode })}
            icon={<Monitor className="size-5" />}
            onClick={() => setTheme("system")}
          />
          <ChoiceCard
            active={theme === "light"}
            title={t("settings.light")}
            description={t("settings.lightDescription")}
            icon={<SunMedium className="size-5" />}
            onClick={() => setTheme("light")}
          />
          <ChoiceCard
            active={theme === "dark"}
            title={t("navbar.darkLabel")}
            description={t("navbar.darkTitle")}
            icon={<MoonStar className="size-5" />}
            onClick={() => setTheme("dark")}
          />
        </div>
      </SectionShell>
    </TabsContent>
  )
}
