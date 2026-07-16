import { open } from "@tauri-apps/plugin-dialog"
import type { Dispatch, SetStateAction } from "react"
import { toast } from "sonner"

import { i18n } from "@/i18n"
import { formatApiErrorMessage, invokeApi } from "@/lib/api"
import type { GameTypeTarget, ModImportFileEntry, ModImportPreview } from "@/lib/g2m"
import type { BuilderForm } from "@/features/builder/types"
import { buildInitialState } from "@/features/builder/utils"

function useSourceActions({
  setForm,
  setPreview,
  setMappings,
  setGameTargetsByPath,
  setIsInspecting,
  t,
}: {
  setForm: Dispatch<SetStateAction<BuilderForm>>
  setPreview: Dispatch<SetStateAction<ModImportPreview | null>>
  setMappings: Dispatch<SetStateAction<ModImportFileEntry[]>>
  setGameTargetsByPath: Dispatch<SetStateAction<Record<string, GameTypeTarget[]>>>
  setIsInspecting: Dispatch<SetStateAction<boolean>>
  t: (key: string, options?: Record<string, unknown>) => string
}) {
  async function pickSourceDir() {
    const result = await open({
      directory: true,
      multiple: false,
      title: t("builderPage.pickDirectory"),
    })
    if (!result || Array.isArray(result)) {
      return
    }
    await inspectSource(result, "directory")
  }

  async function pickSourceZip() {
    const result = await open({
      multiple: false,
      title: t("builderPage.pickArchive"),
      filters: [{ name: t("builderPage.zipFiles"), extensions: ["zip"] }],
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
      const initialState = buildInitialState(result, sourceName)

      setForm((current) => ({
        ...current,
        author: initialState.author,
        description: initialState.description,
        iconBase64: initialState.iconBase64,
        links: initialState.links,
        name: initialState.name || current.name || sourceName,
        prerequisites: initialState.prerequisites,
        customPrerequisites: initialState.customPrerequisites,
        sourcePath: path,
        sourceType: type,
        version: initialState.version,
      }))
      setPreview(initialState.preview)
      setMappings(initialState.mappings)
      setGameTargetsByPath(initialState.gameTargetsByPath)
      toast.success(t("builderPage.inspectSuccess"))
    } catch (error) {
      toast.error(t("builderPage.inspectFailed"), {
        description: formatApiErrorMessage(error),
      })
    } finally {
      setIsInspecting(false)
    }
  }

  async function pickModIcon() {
    const selected = await open({
      multiple: false,
      title: t("builderPage.pickModIcon"),
      filters: [{ name: t("builderPage.imageFiles"), extensions: ["png", "jpg", "jpeg", "webp"] }],
    })

    if (!selected || Array.isArray(selected)) {
      return
    }

    try {
      const base64Image = await invokeApi<string>("read_image_base64", {
        path: selected,
      })
      await warnIfIconNotSquare(base64Image)
      setForm((current) => ({ ...current, iconBase64: base64Image }))
      toast.success(t("builderPage.modIconSelected"))
    } catch (error) {
      toast.error(t("builderPage.modIconReadFailed"), {
        description: formatApiErrorMessage(error),
      })
    }
  }

  return {
    pickModIcon,
    pickSourceDir,
    pickSourceZip,
  }
}

async function warnIfIconNotSquare(base64Image: string) {
  const image = await loadImageDimensions(base64Image)
  if (!image) {
    return
  }

  if (image.width !== image.height) {
    toast.warning(i18n.t("builderPage.modIconSquareRecommendation"))
  }
}

function loadImageDimensions(source: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const image = new window.Image()
    image.onload = () => resolve({ width: image.width, height: image.height })
    image.onerror = () => resolve(null)
    image.src = source
  })
}

export { useSourceActions }
