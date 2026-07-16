import { CheckCircle2, FolderOpen, HardDriveDownload } from "lucide-react"

import { useTranslation } from "react-i18next"
import { G2MPanel } from "@/components/g2m/surface"
import { Button } from "@/components/ui/button"
import { formatFileSize, type ModImportPreview } from "@/lib/g2m"
import { SectionHeading } from "@/features/builder/components/SectionHeading"

function SourceSection({
  hasSource,
  isInspecting,
  pickSourceDir,
  pickSourceZip,
  preview,
  sourceDisplayType,
}: {
  hasSource: boolean
  isInspecting: boolean
  pickSourceDir: () => Promise<void>
  pickSourceZip: () => Promise<void>
  preview: ModImportPreview | null
  sourceDisplayType: string
}) {
  const { t } = useTranslation()

  return (
    <G2MPanel>
      <div className="p-5 lg:p-6">
        <SectionHeading
          icon={FolderOpen}
          title={t("builderPage.sourceTitle")}
          description={t("builderPage.pickSourceDescription")}
        />
        <div className="mt-5 flex flex-wrap gap-3">
          <Button className="cursor-pointer rounded-xl px-4" onClick={() => void pickSourceDir()} disabled={isInspecting}>
            <FolderOpen className="mr-2 size-4" />
            {t("builderPage.pickDirectory")}
          </Button>
          <Button
            variant="outline"
            className="cursor-pointer rounded-xl border-border/70 bg-background/70 px-4 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
            onClick={() => void pickSourceZip()}
            disabled={isInspecting}
          >
            <HardDriveDownload className="mr-2 size-4" />
            {t("builderPage.pickArchive")}
          </Button>
        </div>

        {hasSource && preview ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                {t("workspaceDialogs.importDetected")} - {sourceDisplayType} ({preview.fileCount} files, {formatFileSize(preview.sizeBytes)})
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </G2MPanel>
  )
}

export { SourceSection }
