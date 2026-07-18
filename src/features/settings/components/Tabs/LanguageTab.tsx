import { Languages } from "lucide-react"
import { useTranslation } from "react-i18next"

import { TabsContent } from "@/components/ui/tabs"
import { LanguageCard } from "@/features/settings/components/Cards"
import { SectionShell } from "@/features/settings/components/Layout"
import { useSummary } from "@/features/settings/hooks/useSummary"
import { localeOptions } from "@/i18n"

export function LanguageTab() {
  const { t } = useTranslation()
  const { locale, setLocale } = useSummary()

  return (
    <TabsContent value="language" className="mt-0">
      <SectionShell
        title={t("settings.languageSectionTitle")}
        description={t("settings.languageSectionDescription")}
        badge={locale}
        icon={<Languages className="size-5" />}
      >
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {localeOptions.map((item) => (
            <LanguageCard
              key={item.value}
              active={locale === item.value}
              code={item.code}
              title={item.label}
              description={t("settings.languageDescription")}
              onClick={() => setLocale(item.value)}
            />
          ))}
        </div>
      </SectionShell>
    </TabsContent>
  )
}
