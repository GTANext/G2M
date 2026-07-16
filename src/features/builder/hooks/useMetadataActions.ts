import type { Dispatch, SetStateAction } from "react"
import { toast } from "sonner"

import type { BuilderForm } from "@/features/builder/types"
import { createBuilderLink } from "@/features/builder/utils"

function useMetadataActions({
  customPrereqForm,
  setCustomPrereqForm,
  setForm,
  setIsCustomPrereqSheetOpen,
  t,
}: {
  customPrereqForm: { name: string; url: string }
  setCustomPrereqForm: Dispatch<SetStateAction<{ name: string; url: string }>>
  setForm: Dispatch<SetStateAction<BuilderForm>>
  setIsCustomPrereqSheetOpen: Dispatch<SetStateAction<boolean>>
  t: (key: string, options?: Record<string, unknown>) => string
}) {
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
      url = `https://${url}`
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

  return {
    addCustomPrerequisite,
    addExtraLink,
    removeCustomPrerequisite,
    removeExtraLink,
    updateExtraLink,
    updateSpecialLink,
  }
}

export { useMetadataActions }
