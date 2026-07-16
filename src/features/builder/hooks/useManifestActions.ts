import { save } from "@tauri-apps/plugin-dialog"
import { toast } from "sonner"

import { formatApiErrorMessage, invokeApi } from "@/lib/api"
import type { ModImportPreview } from "@/lib/g2m"
import type { BuilderForm } from "@/features/builder/types"

function useManifestActions({
  form,
  manifestPayload,
  preferences,
  preview,
  t,
}: {
  form: BuilderForm
  manifestPayload: Record<string, unknown>
  preferences: {
    defaultBuilderOutputPath: string
    setDefaultBuilderOutputPath: (value: string) => void
  }
  preview: ModImportPreview | null
  t: (key: string, options?: Record<string, unknown>) => string
}) {
  async function generateManifest() {
    if (!(preview && form.sourcePath.trim())) {
      return
    }

    try {
      let savePath: string | null = null

      if (form.sourceType === "zip") {
        const selectedPath = await save({
          title: t("builderPage.selectManifestSavePath"),
          defaultPath: "modx.json",
          filters: [{ name: "JSON", extensions: ["json"] }],
        })
        if (!selectedPath) {
          return
        }
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
    if (!(preview && form.sourcePath.trim())) {
      return
    }

    try {
      let outputPath = preferences.defaultBuilderOutputPath
      if (!outputPath) {
        const selectedPath = await save({
          filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
          defaultPath: `${form.name.trim() || "mod"}_${form.version.trim() || "1.0.0"}.zip`,
        })
        if (!selectedPath) {
          return
        }
        outputPath = selectedPath
        preferences.setDefaultBuilderOutputPath(outputPath)
      } else {
        const selectedPath = await save({
          filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
          defaultPath: `${outputPath}\\${form.name.trim() || "mod"}_${form.version.trim() || "1.0.0"}.zip`,
        })
        if (!selectedPath) {
          return
        }
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

  return {
    buildArchive,
    generateManifest,
  }
}

export { useManifestActions }
