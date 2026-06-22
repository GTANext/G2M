import { open, save } from "@tauri-apps/plugin-dialog"
import type { ReactNode } from "react"
import {
  ChevronRight,
  CheckCircle2,
  FileCode2,
  Files,
  FolderOpen,
  HardDriveDownload,
  Link2,
  PackageCheck,
  Plus,
  RefreshCcw,
  Sparkles,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { useI18n } from "@/components/app/i18nProvider"
import { ModMappingWorkbench } from "@/components/g2m/ModMappingWorkbench"
import { G2MPanel, G2MPill } from "@/components/g2m/surface"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { type DragPayload, moveFiles } from "@/components/g2m/draggableTree"
import { formatApiErrorMessage, invokeApi } from "@/lib/api"
import {
  buildModFileTree,
  buildModMappingSummaries,
  inferTargetFolderFromPath,
  type ExistingBuilderManifestLink,
  formatFileSize,
  type ManifestSourceDigest,
  normalizeModPath,
  type ExistingBuilderManifest,
  type ModImportFileEntry,
  type ModFileTreeNode,
  type ModImportPreview,
  type ModMappingSummary,
} from "@/lib/g2m"

type BuilderForm = {
  author: string
  links: BuilderLinkInput[]
  name: string
  sourcePath: string
  sourceType: "directory" | "zip"
  version: string
}

type BuilderLinkInput = {
  id: string
  kind: "external" | "github" | "gtamodx"
  label: string
  url: string
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

type BuilderStep = "mapping" | "metadata" | "preview" | "source"

const softOutlineButtonClass =
  "cursor-pointer rounded-xl border-border/70 bg-background/70 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"

function ModBuilderPage() {
  const { copy } = useI18n()
  const [form, setForm] = useState<BuilderForm>({
    author: "",
    links: createDefaultBuilderLinks(),
    name: "",
    sourcePath: "",
    sourceType: "directory",
    version: "",
  })
  const [preview, setPreview] = useState<ModImportPreview | null>(null)
  const [mappings, setMappings] = useState<ModImportFileEntry[]>([])
  const [gameTargetsByPath, setGameTargetsByPath] = useState<Record<string, GameTypeTarget[]>>({})
  const [sourceDigest, setSourceDigest] = useState<ManifestSourceDigest | null>(null)
  const [isInspecting, setIsInspecting] = useState(false)
  const [activeStep, setActiveStep] = useState<BuilderStep>("source")

  const hasSource = form.sourcePath.trim().length > 0
  const sourceDisplayType =
    form.sourceType === "zip" ? copy.workspaceDialogs.importSourceZip : copy.workspaceDialogs.importSourceDirectory
  const mappingSummaries = useMemo(() => buildModMappingSummaries(mappings), [mappings])
  const gameTargetNodes = useMemo(() => buildBuilderGameTargetNodes(mappings), [mappings])
  const manifestEntries = useMemo(
    () => buildManifestEntries(mappingSummaries, mappings, gameTargetsByPath),
    [gameTargetsByPath, mappingSummaries, mappings],
  )

  const manifestPreview = useMemo(
    () =>
      JSON.stringify(
        buildManifestPayload({
          author: form.author,
          links: form.links,
          modName: form.name,
          modType: preview?.existingManifest?.modType || preview?.modType || "Mixed",
          sourceDigest,
          version: form.version,
          files: manifestEntries,
        }),
        null,
        2,
      ),
    [form, preview, manifestEntries, sourceDigest],
  )
  const filledLinkCount = form.links.filter((link) => link.url.trim()).length
  const extraLinkCount = getExtraLinks(form.links).filter((link) => link.url.trim()).length
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

      const result = await invokeApi<ModImportPreview>("inspect_mod_source", {
        modPath: path,
        modName: null,
      })

      const initialBuilderState = buildInitialBuilderState(result, sourceName)

      setForm((current) => ({
        ...current,
        author: initialBuilderState.author,
        links: initialBuilderState.links,
        name: initialBuilderState.name || current.name || sourceName,
        sourcePath: path,
        sourceType: type,
        version: initialBuilderState.version,
      }))
      setPreview(initialBuilderState.preview)
      setMappings(initialBuilderState.mappings)
      setGameTargetsByPath(initialBuilderState.gameTargetsByPath)
      setSourceDigest(initialBuilderState.sourceDigest)

      try {
        const digest = await invokeApi<ManifestSourceDigest>("inspect_mod_source_digest", {
          sourcePath: path,
          sourceType: type,
        })
        setSourceDigest(digest)
      } catch {
        // Keep manifest-provided digest when local digest inspection is unavailable.
      }
      setActiveStep("metadata")
      toast.success(copy.builderPage.inspectSuccess)
    } catch (error) {
      toast.error(copy.builderPage.inspectFailed, {
        description: formatApiErrorMessage(error),
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
    setGameTargetsByPath({})
  }

  function updateExtraLink(id: string, field: "label" | "url", value: string) {
    setForm((current) => ({
      ...current,
      links: current.links.map((link) => (link.id === id ? { ...link, [field]: value } : link)),
    }))
  }

  function updateSpecialLink(kind: "github" | "gtamodx", value: string) {
    setForm((current) => ({
      ...current,
      links: current.links.map((link) => (link.kind === kind ? { ...link, url: value } : link)),
    }))
  }

  function addExtraLink() {
    setForm((current) => ({
      ...current,
      links: [...current.links, createBuilderLink("external")],
    }))
  }

  function removeExtraLink(id: string) {
    setForm((current) => ({
      ...current,
      links: current.links.filter((link) => link.id !== id),
    }))
  }

  function handleDropToFolder(destFolder: string, payload: DragPayload) {
    setMappings((current) => moveFiles(current, payload, destFolder))
  }

  function toggleGameType(path: string, type: GameTypeTarget) {
    const key = normalizeModPath(path)
    if (!key) {
      return
    }
    setGameTargetsByPath((current) => {
      const existing = current[key] ?? []
      const next = existing.includes(type)
        ? existing.filter((item) => item !== type)
        : [...existing, type]
      if (next.length === 0) {
        const { [key]: _removed, ...rest } = current
        return rest
      }
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

      const generatedPath = await invokeApi<string>("generate_manifest_file", {
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
        description: formatApiErrorMessage(error),
      })
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <G2MPanel>
        <div className="p-6 lg:p-8">
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <G2MPill className="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                {copy.builderPage.metadataTitle}
              </G2MPill>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 lg:text-4xl">
                  {copy.routes.builderSubtitle}
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300 lg:text-base">
                  {copy.builderPage.pageDescription}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <BuilderSummaryChip label={copy.builderPage.sourceType} value={hasSource ? sourceDisplayType : "-"} />
              <BuilderSummaryChip label={copy.builderPage.linksTitle} value={String(filledLinkCount)} />
              <BuilderSummaryChip label={copy.workspacePage.fileCount} value={preview ? String(preview.fileCount) : "-"} />
              <BuilderSummaryChip label={copy.builderPage.extraLinks} value={String(extraLinkCount)} />
            </div>
          </div>
        </div>
      </G2MPanel>

      <Tabs value={activeStep} onValueChange={(value) => setActiveStep(value as BuilderStep)} className="space-y-5">
        <TabsList className="!grid !h-auto !w-full grid-cols-1 gap-2 rounded-2xl border border-black/5 bg-slate-50/80 p-2 shadow-sm dark:border-white/10 dark:bg-white/[0.03] sm:grid-cols-2 xl:grid-cols-4">
          <TabsTrigger
            value="source"
            className="!h-auto !flex-none rounded-xl border-0 bg-transparent p-0 text-left data-active:bg-transparent data-active:shadow-none"
          >
            <BuilderFlowStep
              step="1"
              title={copy.builderPage.pickSourceTitle}
              active={activeStep === "source"}
            />
          </TabsTrigger>
          <TabsTrigger
            value="metadata"
            disabled={!hasSource}
            className="!h-auto !flex-none rounded-xl border-0 bg-transparent p-0 text-left data-active:bg-transparent data-active:shadow-none"
          >
            <BuilderFlowStep
              step="2"
              title={copy.workspaceDialogs.modMetadata}
              muted={!hasSource}
              active={activeStep === "metadata"}
            />
          </TabsTrigger>
          <TabsTrigger
            value="mapping"
            disabled={!hasSource}
            className="!h-auto !flex-none rounded-xl border-0 bg-transparent p-0 text-left data-active:bg-transparent data-active:shadow-none"
          >
            <BuilderFlowStep
              step="3"
              title={copy.builderPage.mappingTitle}
              muted={!hasSource}
              active={activeStep === "mapping"}
            />
          </TabsTrigger>
          <TabsTrigger
            value="preview"
            disabled={!hasSource}
            className="!h-auto !flex-none rounded-xl border-0 bg-transparent p-0 text-left data-active:bg-transparent data-active:shadow-none"
          >
            <BuilderFlowStep
              step="4"
              title={copy.builderPage.manifestPreviewTitle}
              muted={!hasSource}
              active={activeStep === "preview"}
            />
          </TabsTrigger>
        </TabsList>

        <G2MPanel>
          <div className="p-5 lg:p-6">
            {activeStep === "source" ? (
              <div className="space-y-6">
                <BuilderStageHeader
                  step="1"
                  title={copy.builderPage.sourceTitle}
                  description={copy.builderPage.pickSourceDescription}
                  icon={FolderOpen}
                />

                <BuilderSectionCard>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-3">
                      <Button className="cursor-pointer rounded-xl px-4" onClick={pickSourceDir} disabled={isInspecting}>
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

                    <div className="space-y-3">

                      {hasSource && preview ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                          <div className="mb-4 flex items-center gap-2">
                            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                              {copy.workspaceDialogs.importDetected}
                            </p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <BuilderStatCard label={copy.builderPage.sourceType} value={sourceDisplayType} />
                            <BuilderStatCard label={copy.workspacePage.fileCount} value={String(preview.fileCount)} />
                            <BuilderStatCard label={copy.workspacePage.size} value={formatFileSize(preview.sizeBytes)} />
                            <BuilderStatCard
                              label={copy.workspaceDialogs.manifestStatus}
                              value={
                                preview.hasG2mManifest
                                  ? copy.workspaceDialogs.manifestDetected
                                  : copy.workspaceDialogs.manifestMissing
                              }
                            />
                          </div>
                        </div>
                      ) : (
                        <BuilderEmptyState>{copy.builderPage.pickSourceDescription}</BuilderEmptyState>
                      )}
                    </div>
                  </div>
                </BuilderSectionCard>

                <BuilderStepActions
                  nextLabel={copy.workspaceDialogs.modMetadata}
                  onNext={() => setActiveStep("metadata")}
                  nextDisabled={!hasSource}
                />
              </div>
            ) : null}

            {activeStep === "metadata" && hasSource && preview ? (
              <div className="space-y-6">
                <BuilderStageHeader
                  step="2"
                  title={copy.workspaceDialogs.modMetadata}
                  description={copy.builderPage.pageDescription}
                  icon={PackageCheck}
                />

                <BuilderSectionCard>
                  <BuilderSectionHeading
                    icon={PackageCheck}
                    title={copy.workspaceDialogs.modMetadata}
                    description={copy.builderPage.pageDescription}
                  />
                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    <BuilderField label={copy.workspaceDialogs.modName}>
                      <Input
                        value={form.name}
                        onChange={(event) => {
                          const value = event.currentTarget.value
                          setForm((current) => ({ ...current, name: value }))
                        }}
                        className="h-11 rounded-xl border-border/70 bg-background shadow-none dark:border-white/10 dark:bg-white/[0.03]"
                      />
                    </BuilderField>
                    <BuilderField label={copy.builderPage.modVersion}>
                      <Input
                        value={form.version}
                        onChange={(event) => {
                          const value = event.currentTarget.value
                          setForm((current) => ({ ...current, version: value }))
                        }}
                        placeholder={copy.builderPage.modVersionPlaceholder}
                        className="h-11 rounded-xl border-border/70 bg-background shadow-none dark:border-white/10 dark:bg-white/[0.03]"
                      />
                    </BuilderField>
                    <BuilderField label={copy.builderPage.modAuthor}>
                      <Input
                        value={form.author}
                        onChange={(event) => {
                          const value = event.currentTarget.value
                          setForm((current) => ({ ...current, author: value }))
                        }}
                        placeholder={copy.builderPage.modAuthorPlaceholder}
                        className="h-11 rounded-xl border-border/70 bg-background shadow-none dark:border-white/10 dark:bg-white/[0.03]"
                      />
                    </BuilderField>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <BuilderSummaryChip label={copy.builderPage.sourceType} value={sourceDisplayType} />
                    <BuilderSummaryChip label={copy.builderPage.linksTitle} value={String(filledLinkCount)} />
                    <BuilderSummaryChip label={copy.builderPage.extraLinks} value={String(extraLinkCount)} />
                    <BuilderSummaryChip
                      label={copy.builderPage.md5Mode}
                      value={formatMd5ModeLabel(sourceDigest?.md5Mode, copy) || "-"}
                    />
                  </div>
                </BuilderSectionCard>

                <BuilderSectionCard>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <BuilderSectionHeading
                      icon={Link2}
                      title={copy.builderPage.linksTitle}
                      description={copy.builderPage.extraLinksDescription}
                    />
                    <Button type="button" variant="outline" className={softOutlineButtonClass} onClick={addExtraLink}>
                      <Plus className="size-4" />
                      {copy.builderPage.addLink}
                    </Button>
                  </div>

                  <div className="mt-5 space-y-4">
                    <BuilderField label={copy.builderPage.gtamodxUrl}>
                      <Input
                        value={getSpecialLinkUrl(form.links, "gtamodx")}
                        onChange={(event) => updateSpecialLink("gtamodx", event.currentTarget.value)}
                        placeholder={copy.builderPage.gtamodxUrlPlaceholder}
                        className="h-11 rounded-xl border-border/70 bg-background shadow-none dark:border-white/10 dark:bg-white/[0.03]"
                      />
                    </BuilderField>
                    <BuilderField label={copy.builderPage.githubUrl}>
                      <Input
                        value={getSpecialLinkUrl(form.links, "github")}
                        onChange={(event) => updateSpecialLink("github", event.currentTarget.value)}
                        placeholder={copy.builderPage.githubUrlPlaceholder}
                        className="h-11 rounded-xl border-border/70 bg-background shadow-none dark:border-white/10 dark:bg-white/[0.03]"
                      />
                    </BuilderField>

                    {getExtraLinks(form.links).length > 0 ? (
                      <div className="space-y-3">
                        {getExtraLinks(form.links).map((link, index) => (
                          <div
                            key={link.id}
                            className="rounded-2xl border border-black/5 bg-muted/20 p-4 dark:border-white/10 dark:bg-white/[0.02]"
                          >
                            <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_auto]">
                              <BuilderField label={`${copy.builderPage.extraLinks} ${index + 1}`}>
                                <Input
                                  value={link.label}
                                  onChange={(event) => updateExtraLink(link.id, "label", event.currentTarget.value)}
                                  placeholder={copy.builderPage.linkLabelPlaceholder}
                                  className="h-11 rounded-xl border-border/70 bg-background shadow-none dark:border-white/10 dark:bg-white/[0.03]"
                                />
                              </BuilderField>
                              <BuilderField label={copy.builderPage.linkUrlPlaceholder}>
                                <Input
                                  value={link.url}
                                  onChange={(event) => updateExtraLink(link.id, "url", event.currentTarget.value)}
                                  placeholder={copy.builderPage.linkUrlPlaceholder}
                                  className="h-11 rounded-xl border-border/70 bg-background shadow-none dark:border-white/10 dark:bg-white/[0.03]"
                                />
                              </BuilderField>
                              <div className="flex items-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={`${softOutlineButtonClass} h-11 px-3 text-red-600 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200`}
                                  onClick={() => removeExtraLink(link.id)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <BuilderEmptyState>{copy.builderPage.extraLinksDescription}</BuilderEmptyState>
                    )}
                  </div>
                </BuilderSectionCard>

                <BuilderSectionCard>
                  <BuilderSectionHeading
                    icon={ShieldCheck}
                    title={copy.builderPage.updateFingerprintTitle}
                    description={copy.builderPage.updateFingerprintDescription}
                  />
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <BuilderField label={copy.builderPage.md5Mode}>
                      <Input
                        value={formatMd5ModeLabel(sourceDigest?.md5Mode, copy)}
                        readOnly
                        placeholder={copy.builderPage.md5ModePlaceholder}
                        className="h-11 rounded-xl border-border/70 bg-background shadow-none dark:border-white/10 dark:bg-white/[0.03]"
                      />
                    </BuilderField>
                    <BuilderField label={copy.builderPage.md5Value}>
                      <Input
                        value={sourceDigest?.md5 ?? ""}
                        readOnly
                        placeholder={copy.builderPage.md5ValuePlaceholder}
                        className="h-11 rounded-xl border-border/70 bg-background font-mono text-xs shadow-none dark:border-white/10 dark:bg-white/[0.03]"
                      />
                    </BuilderField>
                  </div>
                </BuilderSectionCard>

                <BuilderSectionCard>
                  <BuilderSectionHeading
                    icon={Files}
                    title={copy.builderPage.manifestPreviewTitle}
                    description={copy.workspaceDialogs.modMetadata}
                  />
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <BuilderStatCard label={copy.workspacePage.fileCount} value={String(manifestEntries.length)} />
                    <BuilderStatCard
                      label={copy.workspaceDialogs.manifestStatus}
                      value={
                        preview.hasG2mManifest
                          ? copy.workspaceDialogs.manifestDetected
                          : copy.workspaceDialogs.manifestMissing
                      }
                    />
                    <BuilderStatCard label={copy.builderPage.linksTitle} value={String(filledLinkCount)} />
                    <BuilderStatCard label={copy.builderPage.sourceType} value={sourceDisplayType} />
                  </div>
                </BuilderSectionCard>

                <BuilderStepActions
                  previousLabel={copy.builderPage.pickSourceTitle}
                  onPrevious={() => setActiveStep("source")}
                  nextLabel={copy.builderPage.mappingTitle}
                  onNext={() => setActiveStep("mapping")}
                />
              </div>
            ) : null}

            {activeStep === "mapping" && hasSource && preview ? (
              <div className="space-y-6">
                <BuilderStageHeader
                  step="3"
                  title={copy.builderPage.mappingTitle}
                  description={copy.workspaceDialogs.folderMappingHint}
                  icon={Sparkles}
                />

                <BuilderSectionCard>
                  <div className="flex justify-end">
                    <Button variant="outline" className={softOutlineButtonClass} onClick={resetMappings}>
                      <RefreshCcw className="size-4" />
                      {copy.builderPage.resetMappings}
                    </Button>
                  </div>
                  <div className="mt-5 space-y-6">
                    <ModMappingWorkbench
                      copy={copy}
                      files={mappings}
                      headerTitle={copy.builderPage.mappingTitle}
                      headerDescription={copy.workspaceDialogs.folderMappingHint}
                      targetDescription={copy.workspaceDialogs.folderMappingHint}
                      summaryDescription={copy.workspaceDialogs.folderMappingHint}
                      onDropToFolder={handleDropToFolder}
                      emptyTargetLabel={copy.demo.targetPending}
                    />
                    <GameTargetTreeSection
                      copy={copy}
                      nodes={gameTargetNodes}
                      selectedTargets={gameTargetsByPath}
                      onToggleGameType={toggleGameType}
                    />
                  </div>
                </BuilderSectionCard>

                <BuilderStepActions
                  previousLabel={copy.workspaceDialogs.modMetadata}
                  onPrevious={() => setActiveStep("metadata")}
                  nextLabel={copy.builderPage.manifestPreviewTitle}
                  onNext={() => setActiveStep("preview")}
                />
              </div>
            ) : null}

            {activeStep === "preview" && hasSource && preview ? (
              <div className="space-y-6">
                <BuilderStageHeader
                  step="4"
                  title={copy.builderPage.manifestPreviewTitle}
                  description={copy.builderPage.copyManifest}
                  icon={FileCode2}
                />

                <BuilderSectionCard>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <BuilderSectionHeading
                      icon={FileCode2}
                      title={copy.builderPage.manifestPreviewTitle}
                      description={copy.builderPage.copyManifest}
                    />
                    <Button variant="outline" className={softOutlineButtonClass} onClick={() => void generateManifest()}>
                      <HardDriveDownload className="size-4" />
                      {copy.builderPage.copyManifest}
                    </Button>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-900/10 bg-slate-950 p-2 dark:border-white/10">
                    <Textarea
                      readOnly
                      value={manifestPreview}
                      className="h-[360px] rounded-xl border-0 bg-transparent font-mono text-xs text-slate-100 shadow-none focus-visible:ring-0"
                    />
                  </div>
                </BuilderSectionCard>

                <BuilderStepActions
                  previousLabel={copy.builderPage.mappingTitle}
                  onPrevious={() => setActiveStep("mapping")}
                />
              </div>
            ) : null}

            {!hasSource && activeStep !== "source" ? (
              <div className="space-y-6">
                <BuilderStageHeader
                  step="1"
                  title={copy.builderPage.pickSourceTitle}
                  description={copy.builderPage.pickSourceDescription}
                  icon={FolderOpen}
                />
                <BuilderSectionCard>
                  <BuilderEmptyState>{copy.builderPage.pickSourceDescription}</BuilderEmptyState>
                </BuilderSectionCard>
              </div>
            ) : null}
          </div>
        </G2MPanel>
      </Tabs>
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

function BuilderStageHeader({
  step,
  title,
  description,
  icon: Icon,
}: {
  step: string
  title: string
  description: string
  icon: typeof PackageCheck
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 ring-1 ring-violet-200/80 dark:bg-violet-500/15 dark:text-violet-200 dark:ring-violet-400/30">
        <Icon className="size-5" />
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <BuilderMiniBadge>{`步骤 ${step}`}</BuilderMiniBadge>
          <p className="text-lg font-semibold text-slate-950 dark:text-slate-50">{title}</p>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  )
}

function BuilderFlowStep({
  step,
  title,
  muted = false,
  active = false,
}: {
  step: string
  title: string
  muted?: boolean
  active?: boolean
}) {
  return (
    <div
      className={`h-full w-full rounded-xl border px-4 py-3 text-left transition-all ${
        active
          ? "border-violet-200 bg-white text-slate-900 shadow-sm dark:border-violet-400/30 dark:bg-white/[0.08] dark:text-slate-50"
          : muted
            ? "border-transparent bg-transparent text-slate-400 dark:text-slate-500"
            : "border border-transparent bg-transparent text-slate-700 hover:border-black/5 hover:bg-white dark:text-slate-200 dark:hover:border-white/10 dark:hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex min-h-11 items-center gap-3">
        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
            active
              ? "bg-violet-600 text-white dark:bg-violet-400 dark:text-slate-950"
              : muted
                ? "bg-slate-100 text-slate-400 dark:bg-white/[0.05] dark:text-slate-500"
                : "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
          }`}
        >
          {step}
        </div>
        <p className="min-w-0 truncate text-sm font-semibold">{title}</p>
      </div>
    </div>
  )
}

function BuilderSectionCard({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="rounded-[24px] border border-black/5 bg-background p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      {children}
    </div>
  )
}

function BuilderStepActions({
  previousLabel,
  onPrevious,
  nextLabel,
  onNext,
  nextDisabled = false,
}: {
  previousLabel?: string
  onPrevious?: () => void
  nextLabel?: string
  onNext?: () => void
  nextDisabled?: boolean
}) {
  return (
    <div className={`flex gap-3 ${previousLabel ? "justify-between" : "justify-end"}`}>
      {previousLabel && onPrevious ? (
        <Button variant="outline" className={softOutlineButtonClass} onClick={onPrevious}>
          {previousLabel}
        </Button>
      ) : (
        <div />
      )}
      {nextLabel && onNext ? (
        <Button onClick={onNext} disabled={nextDisabled}>
          {nextLabel}
          <ChevronRight className="size-4" />
        </Button>
      ) : null}
    </div>
  )
}

function BuilderSummaryChip({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-slate-100/80 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-white/[0.06]">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  )
}

function BuilderSectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof PackageCheck
  title: string
  description: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-slate-500 dark:text-slate-400" />
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  )
}

function BuilderMiniBadge({
  children,
}: {
  children: ReactNode
}) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/5 bg-background/80 px-2.5 py-1 text-xs font-medium text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-400">
      {children}
    </span>
  )
}

function BuilderEmptyState({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-black/10 bg-background/70 px-4 py-5 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
      {children}
    </div>
  )
}

function BuilderStatCard({
  label,
  value,
  monospace = false,
}: {
  label: string
  value: string
  monospace?: boolean
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className={`mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50 ${monospace ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  )
}

function buildManifestEntries(
  summaries: ModMappingSummary[],
  files: ModImportFileEntry[],
  gameTargets: Record<string, GameTypeTarget[]>,
): BuilderManifestFileEntry[] {
  const summaryEntries = summaries.map((summary) => {
    const games = gameTargets[normalizeModPath(summary.sourcePath)]
    return {
      path: summary.sourcePath,
      installTo: summary.targetPath,
      ...(games && games.length > 0 ? { games } : {}),
    }
  })

  const summaryPaths = new Set(summaryEntries.map((entry) => normalizeModPath(entry.path)))
  const detailEntries = Object.entries(gameTargets)
    .filter(([path, games]) => !summaryPaths.has(path) && games.length > 0)
    .map(([path, games]) => ({
      path,
      installTo: inferManifestDetailTargetPath(path, files),
      games,
    }))
    .filter((entry) => entry.installTo)

  return [...summaryEntries, ...detailEntries]
}

function buildManifestPayload(options: {
  author: string
  files: BuilderManifestFileEntry[]
  links: BuilderLinkInput[]
  modName: string
  modType: string
  sourceDigest: ManifestSourceDigest | null
  version: string
}) {
  const links = options.links
    .map((link) => ({
      kind: link.kind,
      label: link.label.trim(),
      url: link.url.trim(),
    }))
    .filter((link) => link.url)

  return {
    name: options.modName,
    version: options.version,
    author: options.author,
    type: options.modType,
    ...(links.length > 0 ? { links } : {}),
    ...(options.sourceDigest?.md5
      ? {
          update: {
            md5: options.sourceDigest.md5,
            md5Mode: options.sourceDigest.md5Mode,
          },
        }
      : {}),
    files: options.files,
  }
}

function buildInitialBuilderState(preview: ModImportPreview, fallbackName: string) {
  const existingManifest = preview.existingManifest
  if (!existingManifest) {
    return {
      author: "",
      links: createDefaultBuilderLinks(),
      name: preview.name || fallbackName,
      sourceDigest: null as ManifestSourceDigest | null,
      version: "",
      mappings: preview.files,
      preview,
      gameTargetsByPath: {} as Record<string, GameTypeTarget[]>,
    }
  }

  const mappings = applyExistingManifestMappings(preview.files, existingManifest)

  return {
    author: existingManifest.author,
    links: buildBuilderLinks(existingManifest.links),
    name: existingManifest.name || preview.name || fallbackName,
    sourceDigest: existingManifest.update,
    version: existingManifest.version,
    mappings,
    preview,
    gameTargetsByPath: buildGameTargetsFromManifest(existingManifest),
  }
}

function applyExistingManifestMappings(
  files: ModImportFileEntry[],
  manifest: ExistingBuilderManifest,
): ModImportFileEntry[] {
  const manifestEntries = manifest.files
    .map((entry) => ({
      path: normalizeModPath(entry.path),
      installTo: normalizeModPath(entry.installTo),
    }))
    .filter((entry) => entry.path)
    .sort((left, right) => right.path.length - left.path.length)

  return files.map((file) => {
    const normalizedRelativePath = normalizeModPath(file.relativePath)
    const exactEntry = manifestEntries.find((entry) => entry.path === normalizedRelativePath)

    if (exactEntry) {
      return {
        ...file,
        targetPath: exactEntry.installTo,
        targetFolder: inferTargetFolderFromPath(exactEntry.installTo),
        skipInstall: !exactEntry.installTo,
      }
    }

    const folderEntry = manifestEntries.find((entry) =>
      normalizedRelativePath.startsWith(`${entry.path}/`),
    )
    if (!folderEntry) {
      return file
    }

    const suffix = normalizedRelativePath.slice(folderEntry.path.length).replace(/^\/+/, "")
    const targetPath = joinManifestFolderTargetPath(
      folderEntry.installTo,
      folderEntry.path,
      suffix,
    )
    return {
      ...file,
      targetPath,
      targetFolder: inferTargetFolderFromPath(targetPath),
      skipInstall: !targetPath,
    }
  })
}

function buildGameTargetsFromManifest(
  manifest: ExistingBuilderManifest,
): Record<string, GameTypeTarget[]> {
  const targets: Record<string, GameTypeTarget[]> = {}

  for (const entry of manifest.files) {
    const games = entry.games.filter(isGameTypeTarget)
    if (games.length > 0) {
      const normalizedPath = normalizeModPath(entry.path)
      if (normalizedPath) {
        targets[normalizedPath] = games
      }
    }
  }

  return targets
}

type BuilderGameTargetNode = {
  children: BuilderGameTargetNode[]
  fileCount: number
  kind: "file" | "folder"
  path: string
  targetPath: string
}

function buildBuilderGameTargetNodes(files: ModImportFileEntry[]): BuilderGameTargetNode[] {
  return buildModFileTree(files, "source").map((node) => buildBuilderGameTargetNode(node, files))
}

function buildBuilderGameTargetNode(
  node: ModFileTreeNode,
  files: ModImportFileEntry[],
): BuilderGameTargetNode {
  return {
    children: node.children.map((child) => buildBuilderGameTargetNode(child, files)),
    fileCount: node.fileCount,
    kind: node.kind,
    path: normalizeModPath(node.fullPath),
    targetPath: inferManifestDetailTargetPath(node.fullPath, files),
  }
}

function inferManifestDetailTargetPath(path: string, files: ModImportFileEntry[]): string {
  const normalizedPath = normalizeModPath(path)
  if (!normalizedPath) {
    return ""
  }

  const exactFile = files.find((file) => normalizeModPath(file.relativePath) === normalizedPath)
  if (exactFile) {
    return normalizeModPath(exactFile.targetPath)
  }

  const sourcePrefix = `${normalizedPath}/`
  const candidates = files
    .map((file) => {
      const normalizedRelativePath = normalizeModPath(file.relativePath)
      const normalizedTargetPath = normalizeModPath(file.targetPath)
      if (!normalizedRelativePath.startsWith(sourcePrefix) || !normalizedTargetPath) {
        return ""
      }

      const remainder = normalizedRelativePath.slice(sourcePrefix.length)
      if (!remainder) {
        return normalizedTargetPath
      }

      const suffix = `/${remainder}`
      if (!normalizedTargetPath.endsWith(suffix)) {
        return ""
      }

      return normalizedTargetPath.slice(0, normalizedTargetPath.length - suffix.length)
    })
    .filter(Boolean)

  const uniqueCandidates = Array.from(new Set(candidates))
  return uniqueCandidates.length === 1 ? uniqueCandidates[0] : ""
}

function GameTargetTreeSection({
  copy,
  nodes,
  selectedTargets,
  onToggleGameType,
}: {
  copy: ReturnType<typeof useI18n>["copy"]
  nodes: BuilderGameTargetNode[]
  selectedTargets: Record<string, GameTypeTarget[]>
  onToggleGameType: (path: string, type: GameTypeTarget) => void
}) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-background/80 text-slate-700 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
            <Files className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
              {copy.builderPage.gameTargets}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {copy.workspaceDialogs.folderMappingHint}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {nodes.map((node) => (
          <GameTargetTreeNode
            key={node.path}
            copy={copy}
            node={node}
            selectedTargets={selectedTargets}
            onToggleGameType={onToggleGameType}
          />
        ))}
      </div>
    </section>
  )
}

function GameTargetTreeNode({
  copy,
  node,
  selectedTargets,
  onToggleGameType,
  depth = 0,
}: {
  copy: ReturnType<typeof useI18n>["copy"]
  node: BuilderGameTargetNode
  selectedTargets: Record<string, GameTypeTarget[]>
  onToggleGameType: (path: string, type: GameTypeTarget) => void
  depth?: number
}) {
  const [expanded, setExpanded] = useState(false)
  const isFolder = node.kind === "folder"
  const selectedValues = selectedTargets[node.path] ?? []

  return (
    <div>
      <div
        className="rounded-2xl border border-black/5 bg-background/70 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]"
        style={{ marginLeft: depth * 14 }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {isFolder ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 cursor-pointer rounded-xl"
                  onClick={() => setExpanded((current) => !current)}
                >
                  <ChevronRight className={`size-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
                </Button>
              ) : (
                <span className="inline-flex size-7 shrink-0 items-center justify-center" />
              )}
              <p className="break-all text-sm font-semibold text-slate-950 dark:text-slate-50">
                {node.path}
              </p>
              <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
                {isFolder ? copy.builderPage.summaryFolder : copy.builderPage.summaryFile}
              </span>
              <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
                {copy.workspacePage.fileCount} {node.fileCount}
              </span>
            </div>
            <p className="mt-2 break-all pl-9 text-xs text-slate-500 dark:text-slate-400">
              {node.targetPath || copy.workspaceDialogs.doNotInstall}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pl-9 lg:pl-0">
            {GAME_TARGET_OPTIONS.map((option) => {
              const isSelected = selectedValues.includes(option.value as GameTypeTarget)
              return (
                <Button
                  key={`${node.path}-${option.value}`}
                  variant={isSelected ? "default" : "outline"}
                  className="h-8 cursor-pointer rounded-lg px-2.5 text-xs"
                  onClick={() => onToggleGameType(node.path, option.value as GameTypeTarget)}
                >
                  {option.label}
                </Button>
              )
            })}
          </div>
        </div>
      </div>
      {isFolder && expanded ? (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <GameTargetTreeNode
              key={child.path}
              copy={copy}
              node={child}
              selectedTargets={selectedTargets}
              onToggleGameType={onToggleGameType}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function joinManifestTargetPath(prefix: string, suffix: string): string {
  const normalizedPrefix = normalizeModPath(prefix)
  const normalizedSuffix = normalizeModPath(suffix)

  if (!normalizedPrefix) {
    return normalizedSuffix
  }
  if (!normalizedSuffix) {
    return normalizedPrefix
  }

  return `${normalizedPrefix}/${normalizedSuffix}`
}

function joinManifestFolderTargetPath(
  installTo: string,
  sourcePath: string,
  suffix: string,
): string {
  const normalizedSourcePath = normalizeModPath(sourcePath)
  const sourceFolderName = normalizedSourcePath.split("/").filter(Boolean).pop() ?? ""
  const normalizedInstallTo = normalizeModPath(installTo)

  const baseTargetPath =
    sourceFolderName &&
    normalizedInstallTo &&
    normalizedInstallTo.split("/").filter(Boolean).pop() === sourceFolderName
      ? normalizedInstallTo
      : joinManifestTargetPath(normalizedInstallTo, sourceFolderName)

  return joinManifestTargetPath(baseTargetPath, suffix)
}

function isGameTypeTarget(value: string): value is GameTypeTarget {
  return GAME_TYPE_TARGETS.includes(value as GameTypeTarget)
}

function buildBuilderLinks(links: ExistingBuilderManifestLink[]): BuilderLinkInput[] {
  const builtLinks = createDefaultBuilderLinks()
  const extraLinks: BuilderLinkInput[] = []

  for (const link of links) {
    const kind = normalizeBuilderLinkKind(link.kind)
    if (kind === "gtamodx" || kind === "github") {
      const target = builtLinks.find((item) => item.kind === kind)
      if (target) {
        target.label = link.label || target.label
        target.url = link.url
      }
      continue
    }

    extraLinks.push({
      id: createBuilderLinkId(),
      kind: "external",
      label: link.label,
      url: link.url,
    })
  }

  return [...builtLinks, ...extraLinks]
}

function createBuilderLink(kind: BuilderLinkInput["kind"]): BuilderLinkInput {
  return {
    id: createBuilderLinkId(),
    kind,
    label: kind === "gtamodx" ? "GTAMODX" : kind === "github" ? "GitHub" : "",
    url: "",
  }
}

function createDefaultBuilderLinks(): BuilderLinkInput[] {
  return [createBuilderLink("gtamodx"), createBuilderLink("github")]
}

function getSpecialLinkUrl(
  links: BuilderLinkInput[],
  kind: "gtamodx" | "github",
): string {
  return links.find((link) => link.kind === kind)?.url ?? ""
}

function getExtraLinks(links: BuilderLinkInput[]): BuilderLinkInput[] {
  return links.filter((link) => link.kind === "external")
}

function normalizeBuilderLinkKind(
  kind: string | undefined,
): BuilderLinkInput["kind"] {
  switch ((kind || "").trim().toLowerCase()) {
    case "gtamodx":
      return "gtamodx"
    case "github":
      return "github"
    default:
      return "external"
  }
}

function createBuilderLinkId(): string {
  return `link-${Math.random().toString(36).slice(2, 10)}`
}

function formatMd5ModeLabel(
  md5Mode: string | undefined,
  copy: ReturnType<typeof useI18n>["copy"],
): string {
  switch ((md5Mode || "").trim().toLowerCase()) {
    case "archive":
      return copy.builderPage.md5ModeArchive
    case "directory":
      return copy.builderPage.md5ModeDirectory
    default:
      return ""
  }
}

export { ModBuilderPage }
