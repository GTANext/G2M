import { invoke } from "@tauri-apps/api/core"
import { open, save } from "@tauri-apps/plugin-dialog"
import type { ReactNode } from "react"
import {
  CheckCircle2,
  FileCode2,
  FolderOpen,
  HardDriveDownload,
  PackageCheck,
  RefreshCcw,
  Sparkles,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { useI18n } from "@/components/app/i18nProvider"
import { ModMappingWorkbench } from "@/components/g2m/ModMappingWorkbench"
import { G2MPanel, G2MPill, G2MSubtlePanel } from "@/components/g2m/surface"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { type DragPayload, moveFiles } from "@/components/g2m/draggableTree"
import {
  buildModMappingSummaries,
  formatFileSize,
  type ModImportFileEntry,
  type ModImportPreview,
  type ModMappingSummary,
} from "@/lib/g2m"

type BuilderForm = {
  author: string
  name: string
  sourcePath: string
  sourceType: "directory" | "zip"
  version: string
}

const GAME_TYPE_TARGETS = ["iii", "vc", "sa"] as const
const GAME_TARGET_OPTIONS = GAME_TYPE_TARGETS.map((type) => ({
  value: type,
  label: type.toUpperCase(),
}))

type GameTypeTarget = "iii" | "vc" | "sa"

type BuilderManifestFileEntry = {
  games?: GameTypeTarget[]
  path: string
  installTo: string
}

const softOutlineButtonClass =
  "cursor-pointer rounded-xl border-border/70 bg-background/70 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"

function ModBuilderPage() {
  const { copy } = useI18n()
  const [form, setForm] = useState<BuilderForm>({
    author: "",
    name: "",
    sourcePath: "",
    sourceType: "directory",
    version: "",
  })
  const [preview, setPreview] = useState<ModImportPreview | null>(null)
  const [mappings, setMappings] = useState<ModImportFileEntry[]>([])
  const [summaryGameTargets, setSummaryGameTargets] = useState<Record<string, GameTypeTarget[]>>({})
  const [isInspecting, setIsInspecting] = useState(false)

  const hasSource = form.sourcePath.trim().length > 0
  const sourceDisplayType =
    form.sourceType === "zip" ? copy.workspaceDialogs.importSourceZip : copy.workspaceDialogs.importSourceDirectory
  const mappingSummaries = useMemo(() => buildModMappingSummaries(mappings), [mappings])
  const manifestEntries = useMemo(
    () => buildManifestEntries(mappingSummaries, summaryGameTargets),
    [mappingSummaries, summaryGameTargets],
  )

  const manifestPreview = useMemo(
    () =>
      JSON.stringify(
        buildManifestPayload({
          author: form.author,
          modName: form.name,
          modType: preview?.modType ?? "Mixed",
          version: form.version,
          files: manifestEntries,
        }),
        null,
        2,
      ),
    [form, preview, manifestEntries],
  )

  async function pickSourceDir() {
    const result = await open({
      directory: true,
      multiple: false,
      title: copy.builderPage.pickDirectory,
    })
    if (!result || Array.isArray(result)) {
      return
    }
    await inspectSource(result, "directory")
  }

  async function pickSourceZip() {
    const result = await open({
      multiple: false,
      title: copy.builderPage.pickArchive,
      filters: [{ name: copy.builderPage.zipFiles, extensions: ["zip"] }],
    })
    if (!result || Array.isArray(result)) {
      return
    }
    await inspectSource(result, "zip")
  }

  async function inspectSource(path: string, type: "directory" | "zip") {
    setIsInspecting(true)
    try {
      const sourceName = path.split(/[\\/]/).pop() ?? ""
      setForm((current) => ({
        ...current,
        name: current.name || sourceName,
        sourcePath: path,
        sourceType: type,
      }))

      const result = await invoke<ModImportPreview>("inspect_mod_source", {
        modPath: path,
        modName: null,
      })

      setPreview(result)
      setMappings(result.files)
      setSummaryGameTargets({})
      toast.success(copy.builderPage.inspectSuccess)
    } catch (error) {
      toast.error(copy.builderPage.inspectFailed, {
        description: String(error),
      })
    } finally {
      setIsInspecting(false)
    }
  }

  function resetMappings() {
    if (!preview) {
      return
    }
    setMappings(preview.files)
    setSummaryGameTargets({})
  }

  function handleDropToFolder(destFolder: string, payload: DragPayload) {
    setMappings((current) => moveFiles(current, payload, destFolder))
  }

  function toggleGameType(summary: ModMappingSummary, type: GameTypeTarget) {
    const key = summary.id
    setSummaryGameTargets((current) => {
      const existing = current[key] ?? []
      const next = existing.includes(type)
        ? existing.filter((item) => item !== type)
        : [...existing, type]
      return { ...current, [key]: next }
    })
  }

  async function generateManifest() {
    if (!preview || !form.sourcePath.trim()) {
      return
    }

    try {
      let savePath: string | null = null

      if (form.sourceType === "zip") {
        const selectedPath = await save({
          title: copy.builderPage.selectManifestSavePath,
          defaultPath: "g2m.json",
          filters: [{ name: "JSON", extensions: ["json"] }],
        })

        if (!selectedPath) {
          return
        }

        savePath = selectedPath
      }

      const generatedPath = await invoke<string>("generate_manifest_file", {
        sourcePath: form.sourcePath,
        sourceType: form.sourceType,
        manifestContent: manifestPreview,
        savePath,
      })

      toast.success(copy.builderPage.generateManifestSuccess, {
        description: generatedPath,
      })
    } catch (error) {
      toast.error(copy.builderPage.generateManifestFailed, {
        description: String(error),
      })
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-6 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <G2MPanel>
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <G2MPill className="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
              {copy.builderPage.metadataTitle}
            </G2MPill>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              {copy.routes.builderSubtitle}
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              {copy.builderPage.pageDescription}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              className="cursor-pointer rounded-xl px-4"
              onClick={pickSourceDir}
              disabled={isInspecting}
            >
              <FolderOpen className="size-4" />
              {copy.builderPage.pickDirectory}
            </Button>
            <Button
              variant="outline"
              className={`${softOutlineButtonClass} px-4`}
              onClick={pickSourceZip}
              disabled={isInspecting}
            >
              <HardDriveDownload className="size-4" />
              {copy.builderPage.pickArchive}
            </Button>
          </div>
        </div>
      </G2MPanel>

      <div className="grid gap-6">
        <G2MPanel>
          <div className="p-5 lg:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <G2MPill icon={PackageCheck} title={copy.builderPage.metadataTitle} />
                <h2 className="mt-3 text-2xl font-semibold text-slate-950 dark:text-slate-50">
                  {copy.workspaceDialogs.modMetadata}
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {copy.builderPage.pageDescription}
                </p>
              </div>
              {hasSource && preview ? (
                <div className="flex flex-wrap items-center gap-2">
                  <G2MPill className="bg-background/80 px-3 py-1 text-slate-500 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
                    {copy.workspacePage.fileCount} {preview.fileCount}
                  </G2MPill>
                  <G2MPill className="bg-background/80 px-3 py-1 text-slate-500 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
                    {copy.workspacePage.size} {formatFileSize(preview.sizeBytes)}
                  </G2MPill>
                </div>
              ) : null}
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <G2MSubtlePanel>
                <section className="space-y-4 p-5">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      {copy.builderPage.sourceTitle}
                    </p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {copy.builderPage.pickSourceDescription}
                    </p>
                  </div>
                  <Input
                    value={form.sourcePath}
                    readOnly
                    placeholder={copy.builderPage.pickSourceDescription}
                    className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  />
                  {hasSource && preview ? (
                    <section className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                          {copy.workspaceDialogs.importDetected}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm text-emerald-800 dark:text-emerald-200">
                        <BuilderMetaItem label={copy.builderPage.sourceType} value={sourceDisplayType} />
                        <BuilderMetaItem label={copy.workspacePage.fileCount} value={String(preview.fileCount)} />
                        <BuilderMetaItem label={copy.workspacePage.size} value={formatFileSize(preview.sizeBytes)} />
                        <BuilderMetaItem
                          label={copy.workspaceDialogs.manifestStatus}
                          value={
                            preview.hasG2mManifest
                              ? copy.workspaceDialogs.manifestDetected
                              : copy.workspaceDialogs.manifestMissing
                          }
                        />
                      </div>
                    </section>
                  ) : null}
                </section>
              </G2MSubtlePanel>

              <G2MSubtlePanel>
                <section className="space-y-3 p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    {copy.workspaceDialogs.modMetadata}
                  </p>
                  <BuilderField label={copy.workspaceDialogs.modName}>
                    <Input
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, name: event.currentTarget.value }))}
                      className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                    />
                  </BuilderField>
                  <BuilderField label={copy.builderPage.modVersion}>
                    <Input
                      value={form.version}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, version: event.currentTarget.value }))}
                      placeholder={copy.builderPage.modVersionPlaceholder}
                      className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                    />
                  </BuilderField>
                  <BuilderField label={copy.builderPage.modAuthor}>
                    <Input
                      value={form.author}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, author: event.currentTarget.value }))}
                      placeholder={copy.builderPage.modAuthorPlaceholder}
                      className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                    />
                  </BuilderField>
                </section>
              </G2MSubtlePanel>
            </div>
          </div>
        </G2MPanel>

        {hasSource && preview ? (
          <>
            <G2MPanel>
              <div className="p-5 lg:p-6">
                <div className="flex items-center justify-between">
                  <G2MPill icon={Sparkles} title={copy.builderPage.mappingTitle} />
                  <Button
                    variant="outline"
                    className={softOutlineButtonClass}
                    onClick={resetMappings}
                  >
                    <RefreshCcw className="size-4" />
                    {copy.builderPage.resetMappings}
                  </Button>
                </div>

                <div className="mt-5 space-y-6">
                  <ModMappingWorkbench
                    copy={copy}
                    files={mappings}
                    headerTitle={copy.builderPage.mappingTitle}
                    headerDescription={copy.workspacePage.detailHint}
                    targetDescription={copy.workspaceDialogs.installPath}
                    summaryDescription={copy.workspaceDialogs.installPath}
                    onDropToFolder={handleDropToFolder}
                    emptyTargetLabel={copy.demo.targetPending}
                    getSummaryTargetState={(summaryId) => ({
                      options: GAME_TARGET_OPTIONS,
                      selectedValues: summaryGameTargets[summaryId] ?? [],
                      onToggle: (value) => {
                        const summary = mappingSummaries.find((item) => item.id === summaryId)
                        if (!summary) {
                          return
                        }
                        toggleGameType(summary, value as GameTypeTarget)
                      },
                    })}
                  />
                </div>
              </div>
            </G2MPanel>

            <G2MPanel>
              <div className="p-5 lg:p-6">
                <div className="flex items-center justify-between">
                  <G2MPill icon={FileCode2} title={copy.builderPage.manifestPreviewTitle} />
                  <Button
                    variant="outline"
                    className={softOutlineButtonClass}
                    onClick={() => void generateManifest()}
                  >
                    <HardDriveDownload className="size-4" />
                    {copy.builderPage.copyManifest}
                  </Button>
                </div>
                <div className="mt-4">
                  <Textarea
                    readOnly
                    value={manifestPreview}
                    className="h-[320px] rounded-2xl border-border/70 bg-slate-950/90 font-mono text-xs text-slate-100 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              </div>
            </G2MPanel>
          </>
        ) : (
          <G2MPanel>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/10">
                <FolderOpen className="size-7 text-slate-500 dark:text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {copy.builderPage.pickSourceTitle}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                {copy.builderPage.pickSourceDescription}
              </p>
            </div>
          </G2MPanel>
        )}
      </div>
    </div>
  )
}

function BuilderField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      {children}
    </div>
  )
}

function BuilderMetaItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-500 dark:text-emerald-300">
        {label}
      </p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

function buildManifestEntries(
  summaries: ModMappingSummary[],
  gameTargets: Record<string, GameTypeTarget[]>,
): BuilderManifestFileEntry[] {
  return summaries.map((summary) => {
    const games = gameTargets[summary.id]
    return {
      path: summary.sourcePath,
      installTo: summary.targetPath,
      ...(games && games.length > 0 ? { games } : {}),
    }
  })
}

function buildManifestPayload(options: {
  author: string
  files: BuilderManifestFileEntry[]
  modName: string
  modType: string
  version: string
}) {
  return {
    name: options.modName,
    version: options.version,
    author: options.author,
    type: options.modType,
    files: options.files,
  }
}

export { ModBuilderPage }
