import { useState } from "react"
import type { BootstrapPayload, ManagedMod, ModImportFileEntry, ModImportPreview } from "@/lib/g2m"
import {
  type AddGameForm,
  type ConflictDecision,
  createDefaultAddGameForm,
  createDefaultEditGameForm,
  createDefaultImportModForm,
  type EditGameForm,
  type ImportModForm,
  type WorkspaceState,
} from "./types"

export function useWorkspaceState(): WorkspaceState {
  const [activeGameId, setActiveGameId] = useState<string | null>(null)
  const [currentView, setCurrentView] = useState<"home" | "game">("home")
  const [isAddGameDialogOpen, setIsAddGameDialogOpen] = useState(false)
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false)
  const [isDetectingGame, setIsDetectingGame] = useState(false)
  const [isEditGameDialogOpen, setIsEditGameDialogOpen] = useState(false)
  const [isImportModDialogOpen, setIsImportModDialogOpen] = useState(false)
  const [isImportingMod, setIsImportingMod] = useState(false)
  const [isPreviewingMod, setIsPreviewingMod] = useState(false)
  const [deleteTargetGameId, setDeleteTargetGameId] = useState<string | null>(null)
  const [deleteTargetModId, setDeleteTargetModId] = useState<string | null>(null)
  const [addGameForm, setAddGameFormState] = useState<AddGameForm>(createDefaultAddGameForm)
  const [editGameForm, setEditGameFormState] = useState<EditGameForm>(createDefaultEditGameForm)
  const [importModForm, setImportModForm] = useState<ImportModForm>(createDefaultImportModForm)
  const [importModMappings, setImportModMappingsState] = useState<ModImportFileEntry[]>([])
  const [importModPreview, setImportModPreview] = useState<ModImportPreview | null>(null)
  const [allMods, setAllMods] = useState<ManagedMod[]>([])
  const [conflictDecisions, setConflictDecisions] = useState<Record<string, ConflictDecision>>({})
  const [importConflictDecisions, setImportConflictDecisions] = useState<Record<string, ConflictDecision>>({})
  const [modSearchQuery, setModSearchQuery] = useState("")
  const [selectedModId, setSelectedModId] = useState("")
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [savingGameId, setSavingGameId] = useState<string | null>(null)
  const [deletingModId, setDeletingModId] = useState<string | null>(null)
  const [togglingModId, setTogglingModId] = useState<string | null>(null)
  const [installingPrerequisiteKey, setInstallingPrerequisiteKey] = useState<string | null>(null)

  return {
    activeGameId,
    setActiveGameId,
    currentView,
    setCurrentView,
    isAddGameDialogOpen,
    setIsAddGameDialogOpen,
    isConflictDialogOpen,
    setIsConflictDialogOpen,
    isDetectingGame,
    setIsDetectingGame,
    isEditGameDialogOpen,
    setIsEditGameDialogOpen,
    isImportModDialogOpen,
    setIsImportModDialogOpen,
    isImportingMod,
    setIsImportingMod,
    isPreviewingMod,
    setIsPreviewingMod,
    deleteTargetGameId,
    setDeleteTargetGameId,
    deleteTargetModId,
    setDeleteTargetModId,
    addGameForm,
    setAddGameFormState,
    editGameForm,
    setEditGameFormState,
    importModForm,
    setImportModForm,
    importModMappings,
    setImportModMappingsState,
    importModPreview,
    setImportModPreview,
    allMods,
    setAllMods,
    conflictDecisions,
    setConflictDecisions,
    importConflictDecisions,
    setImportConflictDecisions,
    modSearchQuery,
    setModSearchQuery,
    selectedModId,
    setSelectedModId,
    bootstrap,
    setBootstrap,
    bootstrapping,
    setBootstrapping,
    savingGameId,
    setSavingGameId,
    deletingModId,
    setDeletingModId,
    togglingModId,
    setTogglingModId,
    installingPrerequisiteKey,
    setInstallingPrerequisiteKey,
  }
}