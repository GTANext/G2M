import type {
  BootstrapPayload,
  Game,
  ManagedMod,
  ModImportFileEntry,
  ModImportPreview,
  WorkspaceStats,
} from "@/lib/g2m"

export type AddGameForm = {
  dir: string
  type: "sa" | "vc" | "iii" | ""
  name: string
  version: string
  exeName: string
  isExeAutoDetected: boolean
  imagePath: string
  customImageSourcePath: string
  useDefaultImage: boolean
}

export type EditGameForm = AddGameForm & {
  id: string
}

export type ImportModForm = {
  dir: string
  name: string
  sourceType: "directory" | "zip"
}

export type ConflictDecision = "overwrite" | "skip"

export const createDefaultAddGameForm = (): AddGameForm => ({
  dir: "",
  type: "",
  name: "",
  version: "",
  exeName: "",
  isExeAutoDetected: false,
  imagePath: "",
  customImageSourcePath: "",
  useDefaultImage: true,
})

export const createDefaultEditGameForm = (): EditGameForm => ({
  id: "",
  ...createDefaultAddGameForm(),
})

export const createDefaultImportModForm = (
  sourceType: ImportModForm["sourceType"] = "directory",
): ImportModForm => ({
  dir: "",
  name: "",
  sourceType,
})

export type WorkspaceState = {
  activeGameId: string | null
  setActiveGameId: (val: string | null | ((curr: string | null) => string | null)) => void
  currentView: "home" | "game"
  setCurrentView: (val: "home" | "game") => void
  isAddGameDialogOpen: boolean
  setIsAddGameDialogOpen: (val: boolean) => void
  isConflictDialogOpen: boolean
  setIsConflictDialogOpen: (val: boolean) => void
  isDetectingGame: boolean
  setIsDetectingGame: (val: boolean) => void
  isEditGameDialogOpen: boolean
  setIsEditGameDialogOpen: (val: boolean) => void
  isImportModDialogOpen: boolean
  setIsImportModDialogOpen: (val: boolean) => void
  isImportingMod: boolean
  setIsImportingMod: (val: boolean) => void
  isPreviewingMod: boolean
  setIsPreviewingMod: (val: boolean) => void
  deleteTargetGameId: string | null
  setDeleteTargetGameId: (val: string | null) => void
  deleteTargetModId: string | null
  setDeleteTargetModId: (val: string | null) => void
  addGameForm: AddGameForm
  setAddGameFormState: (val: AddGameForm | ((curr: AddGameForm) => AddGameForm)) => void
  editGameForm: EditGameForm
  setEditGameFormState: (val: EditGameForm | ((curr: EditGameForm) => EditGameForm)) => void
  importModForm: ImportModForm
  setImportModForm: (val: ImportModForm | ((curr: ImportModForm) => ImportModForm)) => void
  importModMappings: ModImportFileEntry[]
  setImportModMappingsState: (val: ModImportFileEntry[] | ((curr: ModImportFileEntry[]) => ModImportFileEntry[])) => void
  importModPreview: ModImportPreview | null
  setImportModPreview: (val: ModImportPreview | null) => void
  allMods: ManagedMod[]
  setAllMods: (val: ManagedMod[]) => void
  conflictDecisions: Record<string, ConflictDecision>
  setConflictDecisions: (val: Record<string, ConflictDecision> | ((curr: Record<string, ConflictDecision>) => Record<string, ConflictDecision>)) => void
  importConflictDecisions: Record<string, ConflictDecision>
  setImportConflictDecisions: (val: Record<string, ConflictDecision> | ((curr: Record<string, ConflictDecision>) => Record<string, ConflictDecision>)) => void
  modSearchQuery: string
  setModSearchQuery: (val: string) => void
  selectedModId: string
  setSelectedModId: (val: string | ((curr: string) => string)) => void
  bootstrap: BootstrapPayload | null
  setBootstrap: (val: BootstrapPayload | null) => void
  bootstrapping: boolean
  setBootstrapping: (val: boolean) => void
  savingGameId: string | null
  setSavingGameId: (val: string | null) => void
  deletingModId: string | null
  setDeletingModId: (val: string | null) => void
  renamingModId: string | null
  setRenamingModId: (val: string | null) => void
  togglingModId: string | null
  setTogglingModId: (val: string | null) => void
  installingPrerequisiteKey: string | null
  setInstallingPrerequisiteKey: (val: string | null) => void
  repairingGameLinksId: string | null
  setRepairingGameLinksId: (val: string | null) => void
}

export type UseG2mWorkspaceResult = {
  activeGame: Game | null
  activeGameId: string | null
  activeGameMods: ManagedMod[]
  addGameForm: AddGameForm
  closeAddGameDialog: () => void
  closeConflictDialog: () => void
  closeEditGameDialog: () => void
  bootstrap: BootstrapPayload | null
  bootstrapping: boolean
  confirmDeleteGame: (gameId: string, removeOnly?: boolean) => Promise<void>
  confirmDeleteMod: (modId: string) => Promise<void>
  confirmEditGame: () => Promise<void>
  configuredGames: Game[]
  currentView: "home" | "game"
  deleteTargetGameId: string | null
  deleteTargetModId: string | null
  editGameForm: EditGameForm
  allModsCount: number
  allMods: ManagedMod[]
  games: Game[]
  getConflictDecision: (modId: string, conflictId: string) => ConflictDecision | null
  getImportConflictDecision: (targetPath: string) => ConflictDecision | null
  goHome: () => void
  hasConfiguredGames: boolean
  isAddGameDialogOpen: boolean
  isConflictDialogOpen: boolean
  isDetectingGame: boolean
  isEditGameDialogOpen: boolean
  isImportModDialogOpen: boolean
  isImportingMod: boolean
  isPreviewingMod: boolean
  importModForm: ImportModForm
  importModMappings: ModImportFileEntry[]
  importModPreview: ModImportPreview | null
  installGamePrerequisite: (prerequisiteKey: string) => Promise<void>
  uninstallGamePrerequisite: (prerequisiteKey: string) => Promise<void>
  installAllGamePrerequisites: () => Promise<void>
  repairGameSymlinks: () => Promise<void>
  resolvePrerequisiteConflict: (prerequisiteKey: string) => Promise<void>
  installingPrerequisiteKey: string | null
  repairingGameLinksId: string | null
  mods: ManagedMod[]
  closeImportModDialog: () => void
  openConflictDialog: () => void
  openDeleteGameDialog: (gameId: string) => void
  openDeleteModDialog: (modId: string) => void
  openEditGameDialog: (gameId: string) => void
  openImportModDialog: () => void
  openGameDirectory: (gameId?: string) => Promise<void>
  launchGame: (gameId?: string) => Promise<void>
  confirmImportMod: () => Promise<void>
  pickImportModSource: (sourceType?: ImportModForm["sourceType"]) => Promise<void>
  pickAddGameExecutable: () => Promise<void>
  pickAddGameImage: () => Promise<void>
  pickEditGameExecutable: () => Promise<void>
  pickEditGameImage: () => Promise<void>
  pickGameDirectory: () => Promise<void>
  resetAddGameImage: () => void
  resetEditGameImage: () => void
  openGamesDownloadPage: () => Promise<void>
  openGame: (gameId: string) => void
  modSearchQuery: string
  savingGameId: string | null
  deletingModId: string | null
  renamingModId: string | null
  selectedMod: ManagedMod | null
  selectedModId: string
  setModSearchQuery: (value: string) => void
  confirmAddGame: () => Promise<void>
  setAddGameForm: (patch: Partial<AddGameForm>) => void
  setDeleteTargetGameId: (gameId: string | null) => void
  setDeleteTargetModId: (modId: string | null) => void
  setEditGameForm: (patch: Partial<EditGameForm>) => void
  setImportModName: (value: string) => void
  setImportModMappings: (files: ModImportFileEntry[]) => void
  setImportModSourceType: (value: ImportModForm["sourceType"]) => void
  updateImportModMappingTarget: (relativePath: string, targetPath: string) => void
  updateModName: (modId: string, name: string) => Promise<void>
  setActiveGameId: (gameId: string) => void
  setSelectedModId: (modId: string) => void
  stats: WorkspaceStats
  toggleMod: (modId: string) => Promise<void>
  togglingModId: string | null
  refreshWorkspace: () => Promise<void>
  resolveConflict: (modId: string, conflictId: string, decision: ConflictDecision) => void
  resolveImportConflict: (targetPath: string, decision: ConflictDecision) => void
  resolveImportConflicts: (targetPaths: string[], decision: ConflictDecision) => void
  startAddGame: () => void
  updateGamesSortOrder: (orders: { id: string; sortOrder: number }[]) => Promise<void>
}
