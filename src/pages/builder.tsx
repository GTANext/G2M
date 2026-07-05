import { open, save } from "@tauri-apps/plugin-dialog"
import type { ReactNode } from "react"
import {
  CheckCircle2,
  FileCode2,
  Files,
  FolderOpen,
  HardDriveDownload,
  Link2,
  PackageCheck,
  Plus,
  Puzzle,
  RefreshCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { useTranslation } from "react-i18next"
import { useAppPreferences } from "@/components/app/preferencesProvider"
import { FileMappingModeSwitch } from "@/components/g2m/FileMappingModeSwitch"
import { ModMappingWorkbench } from "@/components/g2m/ModMappingWorkbench"
import { ModMappingExplorer } from "@/components/g2m/ModMappingExplorer"
import { ModMappingList } from "@/components/g2m/ModMappingList"
import { type DragPayload, moveFiles } from "@/components/g2m/draggableTree"
import { G2MPageHeroCard } from "@/components/g2m/pageHeroCard"
import { G2MPanel } from "@/components/g2m/surface"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  drawerBodyClass,
  drawerCardContentClass,
  drawerFooterClass,
  drawerHandleBarClass,
  drawerHandleClass,
  drawerHeaderClass,
  drawerOverlayClass,
  drawerPanelClass,
  drawerViewportClass,
} from "@/components/g2m/workspaceDialogs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { formatApiErrorMessage, invokeApi } from "@/lib/api"
import {
  buildMappingTargetNodes,
  buildModMappingSummaries,
  inferTargetFolderFromPath,
  type ExistingBuilderManifestLink,
  formatFileSize,
  type ManifestSourceDigest,
  normalizeModPath,
  type ExistingBuilderManifest,
  type ModImportFileEntry,
  type ModImportPreview,
  type ModMappingSummary,
  type GameTypeTarget,
  type BuilderCustomPrerequisite,
} from "@/lib/g2m"

type BuilderForm = {
  author: string
  links: BuilderLinkInput[]
  name: string
  prerequisites: string[]
  customPrerequisites: BuilderCustomPrerequisite[]
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

type BuilderManifestFileEntry = {
  games?: GameTypeTarget[]
  path: string
  installTo: string
}

const AVAILABLE_PREREQUISITES = [
  { key: "asiloader", label: "ASILoader" },
  { key: "modloader", label: "ModLoader" },
  { key: "cleo", label: "CLEO" },
  { key: "cleo_redux", label: "CLEO Redux" },
  { key: "silentpatch", label: "SilentPatch" },
  { key: "d3d8to9", label: "D3D8to9" },
]

function ModBuilderPage() {
  const { t } = useTranslation()
  const preferences = useAppPreferences()
  const { builderMappingMode, setBuilderMappingMode } = preferences

  const [form, setForm] = useState<BuilderForm>({
    author: "",
    links: createDefaultBuilderLinks(),
    name: "",
    prerequisites: [],
    customPrerequisites: [],
    sourcePath: "",
    sourceType: "directory",
    version: "",
  })
  const [preview, setPreview] = useState<ModImportPreview | null>(null)
  const [mappings, setMappings] = useState<ModImportFileEntry[]>([])
  const [gameTargetsByPath, setGameTargetsByPath] = useState<Record<string, GameTypeTarget[]>>({})
  const [sourceDigest, setSourceDigest] = useState<ManifestSourceDigest | null>(null)
  const [isInspecting, setIsInspecting] = useState(false)
  const [isCustomPrereqSheetOpen, setIsCustomPrereqSheetOpen] = useState(false)
  const [customPrereqForm, setCustomPrereqForm] = useState({ name: "", url: "" })

  const hasSource = form.sourcePath.trim().length > 0
  const sourceDisplayType =
    form.sourceType === "zip" ? t("workspaceDialogs.importSourceZip") : t("workspaceDialogs.importSourceDirectory")
  const mappingSummaries = useMemo(() => buildModMappingSummaries(mappings), [mappings])
  const gameTargetNodes = useMemo(() => buildMappingTargetNodes(mappings), [mappings])
  const manifestEntries = useMemo(
    () => buildManifestEntries(mappingSummaries, mappings, gameTargetsByPath),
    [gameTargetsByPath, mappingSummaries, mappings],
  )
  const manifestSourceDigest = useMemo<ManifestSourceDigest | null>(() => {
    if (sourceDigest?.md5) {
      return sourceDigest
    }

    if (preview?.existingManifest?.update?.md5) {
      return preview.existingManifest.update
    }

    return null
  }, [preview?.existingManifest?.update, sourceDigest])
  const manifestPayload = useMemo(
    () =>
      buildManifestPayload({
        author: form.author,
        links: form.links,
        modName: form.name,
        modType: preview?.existingManifest?.modType || preview?.modType || "Mixed",
        prerequisites: form.prerequisites,
        customPrerequisites: form.customPrerequisites,
        sourceDigest: manifestSourceDigest,
        version: form.version,
        files: manifestEntries,
      }),
    [form, manifestEntries, manifestSourceDigest, preview],
  )

  const manifestPreview = useMemo(
    () => JSON.stringify(manifestPayload, null, 2),
    [manifestPayload],
  )

  async function pickSourceDir() {
    const result = await open({
      directory: true,
      multiple: false,
      title: t("builderPage.pickDirectory"),
    })
    if (!result || Array.isArray(result)) return
    await inspectSource(result, "directory")
  }

  async function pickSourceZip() {
    const result = await open({
      multiple: false,
      title: t("builderPage.pickArchive"),
      filters: [{ name: t("builderPage.zipFiles"), extensions: ["zip"] }],
    })
    if (!result || Array.isArray(result)) return
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
        prerequisites: initialBuilderState.prerequisites,
        customPrerequisites: initialBuilderState.customPrerequisites,
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
        // Keep manifest-provided digest
      }
      toast.success(t("builderPage.inspectSuccess"))
    } catch (error) {
      toast.error(t("builderPage.inspectFailed"), {
        description: formatApiErrorMessage(error),
      })
    } finally {
      setIsInspecting(false)
    }
  }

  function resetMappings() {
    if (!preview) return
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

  function addCustomPrerequisite() {
    let { name, url } = customPrereqForm
    if (!name.trim() || !url.trim()) {
      toast.error(t("builderPage.customPrerequisiteMissingFields"))
      return
    }

    url = url.trim()
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url
    }

    try {
      const parsedUrl = new URL(url)
      const hostname = parsedUrl.hostname.toLowerCase()
      if (!hostname.endsWith("github.com") && !hostname.endsWith("gtamodx.com")) {
        toast.error(t("builderPage.customPrerequisiteUrlError"))
        return
      }
    } catch {
      toast.error(t("builderPage.customPrerequisiteInvalidUrl"))
      return
    }

    setForm((current) => ({
      ...current,
      customPrerequisites: [...current.customPrerequisites, { name: name.trim(), url }],
    }))
    setCustomPrereqForm({ name: "", url: "" })
    setIsCustomPrereqSheetOpen(false)
  }

  function removeCustomPrerequisite(index: number) {
    setForm((current) => {
      const next = [...current.customPrerequisites]
      next.splice(index, 1)
      return { ...current, customPrerequisites: next }
    })
  }

  function handleDropToFolder(destFolder: string, payload: DragPayload) {
    setMappings((current) => moveFiles(current, payload, destFolder))
  }

  function updateTargetPath(path: string, newTargetPath: string) {
    const key = normalizeModPath(path)
    if (!key) return
    
    setMappings((current) => {
      return current.map((file) => {
        const fileKey = normalizeModPath(file.relativePath)
        if (fileKey === key) {
          return {
            ...file,
            targetPath: newTargetPath,
            targetFolder: inferTargetFolderFromPath(newTargetPath),
            skipInstall: !newTargetPath
          }
        }
        if (fileKey && fileKey.startsWith(`${key}/`)) {
          const suffix = fileKey.slice(key.length).replace(/^\/+/, "")
          const nextTarget = newTargetPath ? `${newTargetPath}/${suffix}` : ""
          return {
            ...file,
            targetPath: nextTarget,
            targetFolder: inferTargetFolderFromPath(nextTarget),
            skipInstall: !nextTarget
          }
        }
        return file
      })
    })
  }

  function toggleGameType(path: string, type: GameTypeTarget) {
    const key = normalizeModPath(path)
    if (!key) return
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
    if (!preview || !form.sourcePath.trim()) return

    try {
      let savePath: string | null = null

      if (form.sourceType === "zip") {
        const selectedPath = await save({
          title: t("builderPage.selectManifestSavePath"),
          defaultPath: "g2m.json",
          filters: [{ name: "JSON", extensions: ["json"] }],
        })
        if (!selectedPath) return
        savePath = selectedPath
      }

      const content = JSON.stringify(manifestPayload, null, 2)
      
      const generatedPath = await invokeApi<string>("generate_manifest_file", {
        sourcePath: form.sourcePath,
        sourceType: form.sourceType,
        manifestContent: content,
        savePath,
      })

      toast.success(t("builderPage.generateManifestSuccess"), {
        description: generatedPath,
      })
    } catch (error) {
      toast.error(t("builderPage.generateManifestFailed"), {
        description: formatApiErrorMessage(error),
      })
    }
  }

  async function buildArchive() {
    if (!preview || !form.sourcePath.trim()) return

    try {
      let outputPath = preferences.defaultBuilderOutputPath
      if (!outputPath) {
        const selectedPath = await save({
          filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
          defaultPath: `${form.name.trim() || "mod"}_${form.version.trim() || "1.0.0"}.zip`,
        })
        if (!selectedPath) return
        outputPath = selectedPath
        preferences.setDefaultBuilderOutputPath(outputPath)
      } else {
        const selectedPath = await save({
          filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
          defaultPath: `${outputPath}\\${form.name.trim() || "mod"}_${form.version.trim() || "1.0.0"}.zip`,
        })
        if (!selectedPath) return
        outputPath = selectedPath
        
        const lastSlash = outputPath.lastIndexOf("\\")
        if (lastSlash > -1) {
          preferences.setDefaultBuilderOutputPath(outputPath.substring(0, lastSlash))
        }
      }

      const content = JSON.stringify(manifestPayload, null, 2)
      
      await invokeApi("build_mod_archive", {
        sourcePath: form.sourcePath,
        sourceType: form.sourceType,
        manifestContent: content,
        outputPath,
      })

      toast.success("Mod 压缩包构建成功！")
    } catch (error) {
      toast.error(`构建失败: ${formatApiErrorMessage(error)}`)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-6 pb-10">
      <G2MPageHeroCard
        eyebrow={t("builderPage.metadataTitle")}
        title={t("routes.builderSubtitle")}
        description={t("builderPage.pageDescription")}
      />

      <div className="space-y-6">
        <G2MPanel>
          <div className="p-5 lg:p-6">
            <BuilderSectionHeading
              icon={FolderOpen}
              title={t("builderPage.sourceTitle")}
              description={t("builderPage.pickSourceDescription")}
            />
            <div className="mt-5 flex flex-wrap gap-3">
              <Button className="cursor-pointer rounded-xl px-4" onClick={pickSourceDir} disabled={isInspecting}>
                <FolderOpen className="size-4 mr-2" />
                {t("builderPage.pickDirectory")}
              </Button>
              <Button
                variant="outline"
                className="cursor-pointer rounded-xl border-border/70 bg-background/70 px-4 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                onClick={pickSourceZip}
                disabled={isInspecting}
              >
                <HardDriveDownload className="size-4 mr-2" />
                {t("builderPage.pickArchive")}
              </Button>
            </div>

            {hasSource && preview && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                    {t("workspaceDialogs.importDetected")} - {sourceDisplayType} ({preview.fileCount} files, {formatFileSize(preview.sizeBytes)})
                  </p>
                </div>
              </div>
            )}
          </div>
        </G2MPanel>

        {hasSource && preview && (
          <>
            <G2MPanel>
              <div className="p-5 lg:p-6">
                <BuilderSectionHeading
                  icon={PackageCheck}
                  title={t("workspaceDialogs.modMetadata")}
                  description={t("builderPage.pageDescription")}
                />
                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  <BuilderField label={t("workspaceDialogs.modName")}>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                      className="h-10 rounded-lg border-border/70 bg-background shadow-none dark:border-white/10 dark:bg-white/[0.03]"
                    />
                  </BuilderField>
                  <BuilderField label={t("builderPage.modVersion")}>
                    <Input
                      value={form.version}
                      onChange={(e) => setForm((c) => ({ ...c, version: e.target.value }))}
                      placeholder={t("builderPage.modVersionPlaceholder")}
                      className="h-10 rounded-lg border-border/70 bg-background shadow-none dark:border-white/10 dark:bg-white/[0.03]"
                    />
                  </BuilderField>
                  <BuilderField label={t("builderPage.modAuthor")}>
                    <Input
                      value={form.author}
                      onChange={(e) => setForm((c) => ({ ...c, author: e.target.value }))}
                      placeholder={t("builderPage.modAuthorPlaceholder")}
                      className="h-10 rounded-lg border-border/70 bg-background shadow-none dark:border-white/10 dark:bg-white/[0.03]"
                    />
                  </BuilderField>
                </div>

                <div className="mt-6 border-t border-border/50 pt-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <BuilderSectionHeading
                      icon={Puzzle}
                      title={t("builderPage.prerequisitesTitle")}
                      description={t("builderPage.prerequisitesDescription")}
                    />
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg"
                        onClick={() => setIsCustomPrereqSheetOpen(true)}
                      >
                        <Plus className="size-3 mr-1.5" />
                        {t("builderPage.addCustomPrerequisite")}
                      </Button>
                    </div>

                    {isCustomPrereqSheetOpen && (
                      <div className={drawerOverlayClass}>
                        <div className={drawerViewportClass}>
                          <Card className={drawerPanelClass}>
                            <CardContent className={drawerCardContentClass}>
                              <div className={drawerHandleClass}>
                                <div className={drawerHandleBarClass} />
                              </div>

                              <div className={drawerHeaderClass}>
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <Badge variant="secondary" className="rounded-full bg-violet-100 px-3 py-1 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                                      {t("builderPage.customPrerequisitesBadge")}
                                    </Badge>
                                    <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                                      {t("builderPage.addCustomPrerequisite")}
                                    </h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                      {t("builderPage.customPrerequisiteUrlError")}
                                    </p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    className="cursor-pointer rounded-xl border-border/70 bg-background/70 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                                    onClick={() => setIsCustomPrereqSheetOpen(false)}
                                  >
                                    {t("workspaceDialogs.cancel")}
                                  </Button>
                                </div>
                              </div>

                              <div className={drawerBodyClass}>
                                <div className="mt-5 grid gap-4 md:grid-cols-2">
                                  <BuilderField label={t("builderPage.customPrerequisiteName")}>
                                    <Input
                                      value={customPrereqForm.name}
                                      onChange={(e) => setCustomPrereqForm((c) => ({ ...c, name: e.target.value }))}
                                      placeholder={t("builderPage.customPrerequisiteNamePlaceholder")}
                                      className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                                    />
                                  </BuilderField>
                                  <BuilderField label={t("builderPage.customPrerequisiteUrl")}>
                                    <Input
                                      value={customPrereqForm.url}
                                      onChange={(e) => setCustomPrereqForm((c) => ({ ...c, url: e.target.value }))}
                                      placeholder={t("builderPage.customPrerequisiteUrlPlaceholder")}
                                      className="h-11 rounded-2xl border-border/70 bg-background/70 shadow-none backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                                    />
                                  </BuilderField>
                                </div>
                              </div>

                              <div className={drawerFooterClass}>
                                <div className="flex flex-wrap justify-end gap-3">
                                  <Button
                                    variant="outline"
                                    className="cursor-pointer rounded-xl px-4 border-border/70 bg-background/70 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                                    onClick={() => setIsCustomPrereqSheetOpen(false)}
                                  >
                                    {t("workspaceDialogs.cancel")}
                                  </Button>
                                  <Button
                                    className="cursor-pointer rounded-xl px-4 shadow-sm"
                                    onClick={addCustomPrerequisite}
                                  >
                                    <Plus className="size-4 mr-2" />
                                    {t("builderPage.addCustomPrerequisite")}
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-4">
                    {AVAILABLE_PREREQUISITES.map((req) => (
                      <label key={req.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-2 transition-colors hover:bg-muted/50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]">
                        <input
                          type="checkbox"
                          checked={form.prerequisites.includes(req.key)}
                          onChange={(e) => {
                            setForm((c) => ({
                              ...c,
                              prerequisites: e.target.checked
                                ? [...c.prerequisites, req.key]
                                : c.prerequisites.filter((k) => k !== req.key),
                            }))
                          }}
                          className="size-4 rounded border-slate-300 text-violet-600 focus:ring-violet-600 dark:border-slate-700 dark:bg-slate-900 dark:ring-offset-slate-950 dark:checked:bg-violet-600 dark:checked:border-violet-600"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{req.label}</span>
                      </label>
                    ))}
                    {form.customPrerequisites.map((req, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.02]">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{req.name}</span>
                        <button
                          type="button"
                          onClick={() => removeCustomPrerequisite(idx)}
                          className="ml-2 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 border-t border-border/50 pt-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <BuilderSectionHeading
                      icon={Link2}
                      title={t("builderPage.linksTitle")}
                      description={t("builderPage.extraLinksDescription")}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addExtraLink} className="h-8 rounded-lg">
                      <Plus className="size-3 mr-1.5" />
                      {t("builderPage.addLink")}
                    </Button>
                  </div>
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <BuilderField label={t("builderPage.gtamodxUrl")}>
                      <Input
                        value={getSpecialLinkUrl(form.links, "gtamodx")}
                        onChange={(e) => updateSpecialLink("gtamodx", e.target.value)}
                        placeholder={t("builderPage.gtamodxUrlPlaceholder")}
                        className="h-10 rounded-lg border-border/70 bg-background shadow-none dark:border-white/10 dark:bg-white/[0.03]"
                      />
                    </BuilderField>
                    <BuilderField label={t("builderPage.githubUrl")}>
                      <Input
                        value={getSpecialLinkUrl(form.links, "github")}
                        onChange={(e) => updateSpecialLink("github", e.target.value)}
                        placeholder={t("builderPage.githubUrlPlaceholder")}
                        className="h-10 rounded-lg border-border/70 bg-background shadow-none dark:border-white/10 dark:bg-white/[0.03]"
                      />
                    </BuilderField>
                  </div>
                  
                  {getExtraLinks(form.links).length > 0 && (
                    <div className="mt-4 space-y-3">
                      {getExtraLinks(form.links).map((link, index) => (
                        <div key={link.id} className="rounded-xl border border-black/5 bg-muted/30 p-3 dark:border-white/10 dark:bg-white/[0.02]">
                          <div className="grid gap-3 lg:grid-cols-[1fr_2fr_auto]">
                            <BuilderField label={`${t("builderPage.extraLinks")} ${index + 1}`}>
                              <Input
                                value={link.label}
                                onChange={(e) => updateExtraLink(link.id, "label", e.target.value)}
                                placeholder={t("builderPage.linkLabelPlaceholder")}
                                className="h-9 rounded-md bg-background"
                              />
                            </BuilderField>
                            <BuilderField label={t("builderPage.linkUrlPlaceholder")}>
                              <Input
                                value={link.url}
                                onChange={(e) => updateExtraLink(link.id, "url", e.target.value)}
                                placeholder={t("builderPage.linkUrlPlaceholder")}
                                className="h-9 rounded-md bg-background"
                              />
                            </BuilderField>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-9 px-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                                onClick={() => removeExtraLink(link.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 border-t border-border/50 pt-6">
                  <BuilderSectionHeading
                    icon={ShieldCheck}
                    title={t("builderPage.updateFingerprintTitle")}
                    description={t("builderPage.updateFingerprintDescription")}
                  />
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <BuilderField label={t("builderPage.md5Mode")}>
                      <Input
                        value={(() => {
                          switch ((sourceDigest?.md5Mode || "").trim().toLowerCase()) {
                            case "archive":
                              return t("builderPage.md5ModeArchive")
                            case "directory":
                              return t("builderPage.md5ModeDirectory")
                            default:
                              return ""
                          }
                        })()}
                        readOnly
                        placeholder={t("builderPage.md5ModePlaceholder")}
                        className="h-10 rounded-lg border-border/70 bg-background shadow-none dark:border-white/10 dark:bg-white/[0.03]"
                      />
                    </BuilderField>
                    <BuilderField label={t("builderPage.md5Value")}>
                      <Input
                        value={sourceDigest?.md5 ?? ""}
                        readOnly
                        placeholder={t("builderPage.md5ValuePlaceholder")}
                        className="h-10 rounded-lg border-border/70 bg-background font-mono text-xs shadow-none dark:border-white/10 dark:bg-white/[0.03]"
                      />
                    </BuilderField>
                  </div>
                </div>
              </div>
            </G2MPanel>

            <G2MPanel>
              <div className="p-5 lg:p-6">
                <div className="flex items-start justify-between">
                  <BuilderSectionHeading
                    icon={Files}
                    title={t("builderPage.mappingTitle")}
                    description={t("workspaceDialogs.folderMappingHint")}
                  />
                  <div className="flex items-center gap-3">
                    <FileMappingModeSwitch
                      t={t}
                      mode={builderMappingMode}
                      onChange={setBuilderMappingMode}
                    />
                    <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={resetMappings}>
                      <RefreshCcw className="size-3 mr-1.5" />
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
                      files={mappings}
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
                      files={mappings}
                      onDropToFolder={handleDropToFolder}
                    />
                  )}
                </div>
              </div>
            </G2MPanel>

            <G2MPanel>
              <div className="p-5 lg:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <BuilderSectionHeading
                    icon={FileCode2}
                    title={t("builderPage.manifestPreviewTitle")}
                    description={t("builderPage.copyManifest")}
                  />
                  <div className="flex items-center gap-3">
                    <Button onClick={() => void generateManifest()} variant="secondary" className="rounded-xl px-6">
                      <HardDriveDownload className="size-4 mr-2" />
                      {t("builderPage.copyManifest")}
                    </Button>
                    <Button onClick={() => void buildArchive()} className="rounded-xl px-6">
                      <PackageCheck className="size-4 mr-2" />
                      打包构建 ZIP
                    </Button>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-900/10 bg-slate-950 p-2 dark:border-white/10">
                  <Textarea
                    readOnly
                    value={manifestPreview}
                    className="h-[360px] rounded-xl border-0 bg-transparent font-mono text-xs text-slate-100 shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
            </G2MPanel>
          </>
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
      <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      {children}
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
        <div className="flex size-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
          <Icon className="size-4" />
        </div>
        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      </div>
      <p className="pl-10 text-sm text-slate-500 dark:text-slate-400">{description}</p>
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
  prerequisites: string[]
  customPrerequisites: BuilderCustomPrerequisite[]
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
    ...(options.prerequisites.length > 0 ? { prerequisites: options.prerequisites } : {}),
    ...(options.customPrerequisites.length > 0 ? { customPrerequisites: options.customPrerequisites } : {}),
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
      prerequisites: [] as string[],
      customPrerequisites: [] as BuilderCustomPrerequisite[],
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
    prerequisites: existingManifest.prerequisites || [],
    customPrerequisites: existingManifest.customPrerequisites || [],
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

export { ModBuilderPage }
