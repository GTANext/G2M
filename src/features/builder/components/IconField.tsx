import type { Dispatch, SetStateAction } from "react"
import { ImagePlus } from "lucide-react"

import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Field } from "@/features/builder/components/Field"
import type { BuilderForm } from "@/features/builder/types"

function IconField({
  form,
  pickModIcon,
  setForm,
}: {
  form: BuilderForm
  pickModIcon: () => Promise<void>
  setForm: Dispatch<SetStateAction<BuilderForm>>
}) {
  const { t } = useTranslation()

  return (
    <Field label={t("builderPage.modIcon")}>
      <div className="flex h-[176px] flex-col overflow-hidden rounded-[20px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.82))] p-3 shadow-[0_14px_30px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(23,26,35,0.96),rgba(15,23,42,0.82))] dark:shadow-[0_16px_36px_rgba(0,0,0,0.22)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex rounded-full border border-violet-200/80 bg-violet-50 px-2.5 py-1 text-[11px] font-medium tracking-[0.12em] text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200">
              {t("builderPage.modIconHint")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 whitespace-nowrap rounded-lg border-border/70 bg-background/80 px-3 dark:border-white/10 dark:bg-white/[0.04]"
              onClick={() => void pickModIcon()}
            >
              <ImagePlus className="mr-1.5 size-4" />
              {t("builderPage.pickModIcon")}
            </Button>
            {form.iconBase64 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 whitespace-nowrap rounded-lg px-3 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                onClick={() => setForm((current) => ({ ...current, iconBase64: "" }))}
              >
                {t("builderPage.clearModIcon")}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-1 items-center gap-3">
          <div className="flex size-[88px] shrink-0 items-center justify-center overflow-hidden rounded-[16px] border border-dashed border-slate-300/80 bg-white/80 shadow-inner dark:border-white/10 dark:bg-white/[0.04]">
            {form.iconBase64 ? (
              <img
                src={form.iconBase64}
                alt={form.name || t("builderPage.modIcon")}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImagePlus className="size-7 text-slate-400 dark:text-slate-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {form.iconBase64 ? (form.name || t("builderPage.modIcon")) : t("builderPage.modIcon")}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {t("builderPage.modIconSquareRecommendation")}
            </p>
            <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-slate-400 dark:text-slate-500">
              {t("builderPage.modIconBase64Storage")}
            </p>
          </div>
        </div>
      </div>
    </Field>
  )
}

export { IconField }
