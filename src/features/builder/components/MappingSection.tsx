import { FileCode2, Files, RefreshCcw, Sparkles } from "lucide-react"

import { useTranslation } from "react-i18next"
import { FileMappingModeSwitch } from "@/components/g2m/FileMappingModeSwitch"
import { ModMappingExplorer } from "@/components/g2m/ModMappingExplorer"
import { ModMappingList } from "@/components/g2m/ModMappingList"
import { ModMappingWorkbench } from "@/components/g2m/ModMappingWorkbench"
import { Button } from "@/components/ui/button"
import { G2MPanel } from "@/components/g2m/surface"
import { SectionHeading } from "@/features/builder/components/SectionHeading"
import type { DragPayload } from "@/features/builder/hooks/useMappingActions"
import type { BuilderGameTargetNode, GameTypeTarget, ModImportFileEntry } from "@/lib/g2m"

function MappingSection({
  builderMappingMode,
  files,
  gameTargetNodes,
  gameTargetsByPath,
  handleDropToFolder,
  resetMappings,
  setBuilderMappingMode,
  toggleGameType,
  updateTargetPath,
  handleAiAutoMap,
  isAiProcessing,
}: {
  builderMappingMode: "list" | "tree" | "explorer"
  files: ModImportFileEntry[]
  gameTargetNodes: BuilderGameTargetNode[]
  gameTargetsByPath: Record<string, GameTypeTarget[]>
  handleDropToFolder: (destFolder: string, payload: DragPayload) => void
  resetMappings: () => void
  setBuilderMappingMode: (mode: "list" | "tree" | "explorer") => void
  toggleGameType: (path: string, type: GameTypeTarget) => void
  updateTargetPath: (path: string, newTargetPath: string) => void
  handleAiAutoMap: () => Promise<void>
  isAiProcessing: boolean
}) {
  const { t } = useTranslation()

  return (
    <G2MPanel>
      <div className="p-5 lg:p-6">
        <div className="flex items-start justify-between">
          <SectionHeading
            icon={Files}
            title={t("builderPage.mappingTitle")}
            description={t("workspaceDialogs.folderMappingHint")}
          />
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
              onClick={() => void handleAiAutoMap()}
              disabled={isAiProcessing}
            >
              <Sparkles className="mr-1.5 size-3" />
              {isAiProcessing ? t("builderPage.aiProcessing") : t("builderPage.aiAutoMap")}
            </Button>
            <FileMappingModeSwitch
              t={t}
              mode={builderMappingMode}
              onChange={setBuilderMappingMode}
            />
            <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={resetMappings}>
              <RefreshCcw className="mr-1.5 size-3" />
              {t("builderPage.resetMappings")}
            </Button>
          </div>
        </div>
        <div className="mt-5 space-y-6">
          {builderMappingMode === "list" ? (
            <ModMappingList
              t={t}
              gameTargetNodes={gameTargetNodes}
              gameTargetsByPath={gameTargetsByPath}
              toggleGameType={toggleGameType}
              updateTargetPath={updateTargetPath}
            />
          ) : builderMappingMode === "tree" ? (
            <ModMappingWorkbench
              t={t}
              files={files}
              headerTitle={t("builderPage.mappingTitle")}
              headerDescription={t("workspaceDialogs.folderMappingHint")}
              targetDescription={t("workspaceDialogs.folderMappingHint")}
              summaryDescription={t("workspaceDialogs.folderMappingHint")}
              onDropToFolder={handleDropToFolder}
              emptyTargetLabel={t("builderPage.emptyMapping")}
            />
          ) : (
            <ModMappingExplorer
              t={t}
              files={files}
              onDropToFolder={handleDropToFolder}
              gameTargetsByPath={gameTargetsByPath}
              toggleGameType={toggleGameType}
            />
          )}
        </div>
      </div>
    </G2MPanel>
  )
}

function ManifestSection({
  buildArchive,
  generateManifest,
  manifestPreview,
}: {
  buildArchive: () => Promise<void>
  generateManifest: () => Promise<void>
  manifestPreview: string
}) {
  const { t } = useTranslation()

  return (
    <G2MPanel>
      <div className="p-5 lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeading
            icon={FileCode2}
            title={t("builderPage.manifestPreviewTitle")}
            description={t("builderPage.copyManifest")}
          />
          <div className="flex items-center gap-3">
            <Button onClick={() => void generateManifest()} variant="secondary" className="rounded-xl px-6">
              <FileCode2 className="mr-2 size-4" />
              {t("builderPage.copyManifest")}
            </Button>
            <Button onClick={() => void buildArchive()} className="rounded-xl px-6">
              <Files className="mr-2 size-4" />
              打包构建 ZIP
            </Button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-900/10 bg-slate-950 p-2 dark:border-white/10">
          <textarea
            readOnly
            value={manifestPreview}
            className="h-[360px] w-full rounded-xl border-0 bg-transparent p-3 font-mono text-xs text-slate-100 shadow-none outline-none"
          />
        </div>
      </div>
    </G2MPanel>
  )
}

export { ManifestSection, MappingSection }
