import { useCallback, useEffect, useMemo, useState } from "react"

import type { Game, GamePrerequisite, ManagedMod, ModType } from "@/lib/g2m"

export type MissingLoadedModPrerequisite = GamePrerequisite & {
  requiredBy: string[]
}

function getDuplicateAsiPrerequisites(
  prerequisites: GamePrerequisite[] | undefined,
): GamePrerequisite[] {
  return (prerequisites ?? []).filter(
    (item) => item.key.endsWith("_duplicate_asi") && item.detected,
  )
}

function getEnabledMods(mods: ManagedMod[]): ManagedMod[] {
  return mods.filter((mod) => mod.enabled)
}

function getInstallableMissingPrerequisites(
  items: MissingLoadedModPrerequisite[],
): MissingLoadedModPrerequisite[] {
  return items.filter((item) => item.canInstall)
}

function getMissingPrerequisiteSummary(items: MissingLoadedModPrerequisite[]): string {
  return items.map((item) => item.label).join("、")
}

function getSelectedInstallablePrerequisiteKeys(
  items: MissingLoadedModPrerequisite[],
): string[] {
  return items.map((item) => item.key)
}

function getRequiredPrerequisiteKeysByModType(modType: ModType): string[] {
  const baseKeys = ["asiloader", "modloader"]
  const prerequisiteKeysByModType: Record<ModType, string[]> = {
    ModLoader: [],
    CLEO: ["cleo"],
    "CLEO Redux": ["cleo_redux"],
    ASI: [],
    Mixed: [],
  }

  const specificKeys = prerequisiteKeysByModType[modType] ?? []
  return Array.from(new Set([...baseKeys, ...specificKeys]))
}

function getMissingLoadedModPrerequisites(
  mods: ManagedMod[],
  prerequisites: GamePrerequisite[],
): MissingLoadedModPrerequisite[] {
  const availablePrerequisites = new Map(
    prerequisites.map((item) => [item.key.trim().toLowerCase(), item]),
  )
  const missingPrerequisites = new Map<string, MissingLoadedModPrerequisite>()

  for (const mod of mods) {
    for (const key of getRequiredPrerequisiteKeysByModType(mod.type)) {
      const prerequisite = availablePrerequisites.get(key)
      if (!prerequisite || prerequisite.detected) {
        continue
      }

      const existing = missingPrerequisites.get(prerequisite.key)
      if (existing) {
        if (!existing.requiredBy.includes(mod.name)) {
          existing.requiredBy.push(mod.name)
        }
        continue
      }

      missingPrerequisites.set(prerequisite.key, {
        ...prerequisite,
        requiredBy: [mod.name],
      })
    }
  }

  return Array.from(missingPrerequisites.values())
}

function toggleSelectedPrerequisiteKey(
  currentKeys: string[],
  key: string,
  checked: boolean,
): string[] {
  if (checked) {
    return Array.from(new Set([...currentKeys, key]))
  }

  return currentKeys.filter((item) => item !== key)
}

export function useWorkspacePrerequisiteState({
  activeGame,
  activeGameMods,
  installingPrerequisiteKey,
  installGamePrerequisite,
}: {
  activeGame: Game | null
  activeGameMods: ManagedMod[]
  installingPrerequisiteKey: string | null
  installGamePrerequisite: (prerequisiteKey: string) => Promise<void>
}) {
  const [isPrerequisiteDrawerOpen, setIsPrerequisiteDrawerOpen] = useState(false)
  const [localSelectedPrerequisiteKeys, setLocalSelectedPrerequisiteKeys] = useState<string[]>([])

  const enabledActiveGameMods = useMemo(() => getEnabledMods(activeGameMods), [activeGameMods])
  const missingLoadedModPrerequisites = useMemo(
    () =>
      activeGame
        ? getMissingLoadedModPrerequisites(enabledActiveGameMods, activeGame.prerequisites)
        : [],
    [activeGame, enabledActiveGameMods],
  )
  const installableMissingPrerequisites = useMemo(
    () => getInstallableMissingPrerequisites(missingLoadedModPrerequisites),
    [missingLoadedModPrerequisites],
  )
  const missingPrerequisiteSummary = useMemo(
    () => getMissingPrerequisiteSummary(missingLoadedModPrerequisites),
    [missingLoadedModPrerequisites],
  )
  const duplicateAsiPrerequisites = useMemo(
    () => getDuplicateAsiPrerequisites(activeGame?.prerequisites),
    [activeGame?.prerequisites],
  )
  const isInstallingMissingPrerequisites = installingPrerequisiteKey !== null

  useEffect(() => {
    setLocalSelectedPrerequisiteKeys(getSelectedInstallablePrerequisiteKeys(installableMissingPrerequisites))
  }, [installableMissingPrerequisites])

  useEffect(() => {
    if (missingLoadedModPrerequisites.length === 0) {
      setIsPrerequisiteDrawerOpen(false)
    }
  }, [missingLoadedModPrerequisites.length])

  const onTogglePrerequisiteKey = useCallback((key: string, checked: boolean) => {
    setLocalSelectedPrerequisiteKeys((current) =>
      toggleSelectedPrerequisiteKey(current, key, checked),
    )
  }, [])

  const handleInstallSelectedPrerequisites = useCallback(async () => {
    const keysToInstall = installableMissingPrerequisites
      .map((item) => item.key)
      .filter((key) => localSelectedPrerequisiteKeys.includes(key))

    for (const key of keysToInstall) {
      await installGamePrerequisite(key)
    }

    setIsPrerequisiteDrawerOpen(false)
  }, [installGamePrerequisite, installableMissingPrerequisites, localSelectedPrerequisiteKeys])

  return {
    isInstallingMissingPrerequisites,
    isPrerequisiteDrawerOpen,
    setIsPrerequisiteDrawerOpen,
    missingLoadedModPrerequisites,
    installableMissingPrerequisites,
    missingPrerequisiteSummary,
    duplicateAsiPrerequisites,
    localSelectedPrerequisiteKeys,
    onTogglePrerequisiteKey,
    handleInstallSelectedPrerequisites,
  }
}
