import type {
  BuilderCustomPrerequisite,
  GameTypeTarget,
} from "@/lib/g2m"

type BuilderLinkInput = {
  id: string
  kind: "external" | "github" | "gtamodx"
  label: string
  url: string
}

type BuilderForm = {
  author: string
  description: string
  iconBase64: string
  links: BuilderLinkInput[]
  name: string
  prerequisites: string[]
  customPrerequisites: BuilderCustomPrerequisite[]
  sourcePath: string
  sourceType: "directory" | "zip"
  version: string
}

type BuilderManifestFileEntry = {
  games?: GameTypeTarget[]
  path: string
  installTo: string
}

const GAME_TYPE_TARGETS = ["iii", "vc", "sa"] as const

const AVAILABLE_PREREQUISITES = [
  { key: "asiloader", label: "ASILoader" },
  { key: "modloader", label: "ModLoader" },
  { key: "cleo", label: "CLEO" },
  { key: "cleo_redux", label: "CLEO Redux" },
  { key: "silentpatch", label: "SilentPatch" },
  { key: "d3d8to9", label: "D3D8to9" },
] as const

export {
  AVAILABLE_PREREQUISITES,
  GAME_TYPE_TARGETS,
}
export type {
  BuilderForm,
  BuilderLinkInput,
  BuilderManifestFileEntry,
}
