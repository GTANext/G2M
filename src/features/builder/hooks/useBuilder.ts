import { useMemo, useState } from "react"

import { useTranslation } from "react-i18next"
import { useAppPreferences } from "@/components/app/preferencesProvider"
import {
  buildMappingTargetNodes,
  type GameTypeTarget,
  type ModImportFileEntry,
  type ModImportPreview,
} from "@/lib/g2m"
import type { BuilderForm } from "@/features/builder/types"
import {
  buildManifestEntries,
  buildManifestPayload,
  createDefaultBuilderLinks,
} from "@/features/builder/utils"
import { useManifestActions } from "@/features/builder/hooks/useManifestActions"
import { useMappingActions } from "@/features/builder/hooks/useMappingActions"
import { useMetadataActions } from "@/features/builder/hooks/useMetadataActions"
import { useSourceActions } from "@/features/builder/hooks/useSourceActions"
import { useAIAssistant } from "@/features/builder/hooks/useAIAssistant"

function useBuilder() {
  const { t } = useTranslation()
  const preferences = useAppPreferences()
  const { builderMappingMode, setBuilderMappingMode } = preferences

  const [form, setForm] = useState<BuilderForm>({
    author: "",
    description: "",
    iconBase64: "",
    links: createDefaultBuilderLinks(),
    name: "",
    prerequisites: [],
    customPrerequisites: [],
    sourcePath: "",
    sourceType: "directory",
    version: "",
    readmePath: "",
  })
  const [preview, setPreview] = useState<ModImportPreview | null>(null)
  const [mappings, setMappings] = useState<ModImportFileEntry[]>([])
  const [gameTargetsByPath, setGameTargetsByPath] = useState<Record<string, GameTypeTarget[]>>({})
  const [isInspecting, setIsInspecting] = useState(false)
  const [isCustomPrereqSheetOpen, setIsCustomPrereqSheetOpen] = useState(false)
  const [customPrereqForm, setCustomPrereqForm] = useState({ name: "", url: "" })

  const hasSource = form.sourcePath.trim().length > 0
  const sourceDisplayType =
    form.sourceType === "zip" ? t("workspaceDialogs.importSourceZip") : t("workspaceDialogs.importSourceDirectory")
  const gameTargetNodes = useMemo(() => buildMappingTargetNodes(mappings), [mappings])
  const manifestEntries = useMemo(
    () => buildManifestEntries(mappings, gameTargetsByPath),
    [gameTargetsByPath, mappings],
  )
  const manifestPayload = useMemo(
    () =>
      buildManifestPayload({
        author: form.author,
        description: form.description,
        iconBase64: form.iconBase64,
        links: form.links,
        modName: form.name,
        modType: preview?.existingManifest?.modType || preview?.modType || "Mixed",
        prerequisites: form.prerequisites,
        customPrerequisites: form.customPrerequisites,
        version: form.version,
        readmePath: form.readmePath,
        files: manifestEntries,
      }),
    [form, manifestEntries, preview],
  )
  const manifestPreview = useMemo(
    () => JSON.stringify(manifestPayload, null, 2),
    [manifestPayload],
  )
  const sourceActions = useSourceActions({
    setForm,
    setPreview,
    setMappings,
    setGameTargetsByPath,
    setIsInspecting,
    t,
  })
  const metadataActions = useMetadataActions({
    customPrereqForm,
    setCustomPrereqForm,
    setForm,
    setIsCustomPrereqSheetOpen,
    t,
  })
  const mappingActions = useMappingActions({
    preview,
    setMappings,
    setGameTargetsByPath,
  })
  const aiAssistantActions = useAIAssistant({
    files: mappings,
    sourceDir: preview?.sourceDir || "",
    setMappings,
    setForm,
  })
  const manifestActions = useManifestActions({
    form,
    manifestPayload,
    preferences,
    preview,
    t,
  })

  return {
    ...manifestActions,
    ...mappingActions,
    ...metadataActions,
    ...sourceActions,
    ...aiAssistantActions,
    builderMappingMode,
    customPrereqForm,
    form,
    gameTargetNodes,
    gameTargetsByPath,
    hasSource,
    isCustomPrereqSheetOpen,
    isInspecting,
    manifestPreview,
    mappings,
    preview,
    setBuilderMappingMode,
    setCustomPrereqForm,
    setForm,
    setIsCustomPrereqSheetOpen,
    sourceDisplayType,
  }
}

export { useBuilder }
