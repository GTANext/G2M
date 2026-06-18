import { type ReactNode, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { i18n, STORAGE_KEY } from "@/i18n"

type AppLocale = "zh-CN" | "en-US" | "ja-JP" | "ru-RU"
type ResolvedThemeMode = "dark" | "light" | undefined

type AppCopy = {
  common: {
    appName: string
    back: string
    close: string
    clickToSwitch: string
    current: string
    language: string
    localStorage: string
    notProvided: string
    settings: string
  }
  home: {
    addGame: string
    cardView: string
    configuredCount: (count: number) => string
    configuredDescription: string
    configuredTitle: string
    detectionRules: string
    downloadGame: string
    emptyDescription: string
    emptyTitle: string
    heroDescription: string
    heroEyebrow: string
    heroTitle: string
    listModeHint: string
    listView: string
  }
  gameCard: {
    createdAt: string
    installPath: string
    modCount: (count: number) => string
    openWorkspace: string
    openWorkspaceDescription: string
    updatedAt: string
    versionFallback: string
  }
  navbar: {
    builder: string
    closeWindow: string
    lightLabel: string
    lightTitle: string
    maximizeWindow: string
    minimizeWindow: string
    openHome: string
    openBuilder: string
    openSettings: string
    restoreWindow: string
    settings: string
    home: string
    systemLabel: (mode: ResolvedThemeMode) => string
    systemTitle: (mode: ResolvedThemeMode) => string
    darkLabel: string
    darkTitle: string
  }
  routes: {
    builderSubtitle: string
    homeSubtitle: string
    settingsSubtitle: string
    workspaceSubtitle: (gameName?: string) => string
  }
  builderPage: {
    badge: string
    copyJson: string
    copied: string
    chooseFolder: string
    chooseZip: string
    generatedJsonTitle: string
    heroDescription: string
    heroTitle: string
    inspectFailed: string
    inspectSource: string
    hideMappingDetails: string
    mappingTitle: string
    metadataTitle: string
    modAuthor: string
    modAuthorPlaceholder: string
    modVersion: string
    modVersionPlaceholder: string
    resetMappings: string
    sourcePath: string
    sourcePlaceholder: string
    sourceReady: string
    sourceTreeTitle: string
    sourceType: string
    sourceWaiting: string
    showMappingDetails: string
    targetTreeTitle: string
  }
  settings: {
    appearanceDescription: string
    appearanceTitle: string
    cardMode: string
    cardModeDescription: string
    buttonPosition: string
    currentLanguage: string
    currentHomeDetails: string
    currentHomeView: string
    currentState: string
    currentTheme: string
    currentTitleBar: string
    dataStorageDescription: string
    dataStorageTitle: string
    databaseDescription: string
    databaseTitle: string
    defaultMode: string
    followSystem: string
    followSystemDescription: (mode: ResolvedThemeMode) => string
    groupsTitle: string
    heroDescription: string
    heroTitle: string
    homeDisplayDescription: string
    homeDisplayTitle: string
    languageDescription: string
    languageSectionDescription: string
    languageSectionTitle: string
    left: string
    light: string
    lightDescription: string
    localPersistence: string
    moreInfoDescription: string
    moreInfoLabel: string
    macDescription: string
    macStyle: string
    moreCentered: string
    off: string
    on: string
    persistence: string
    right: string
    storageCoversDescription: string
    storageCoversTitle: string
    theme: string
    themeDescription: string
    titleAlignment: string
    titleBar: string
    titleBarDescription: string
    viewModeDescription: string
    viewModeLabel: string
    windowsDescription: string
    windowsStyle: string
  }
  workspace: {
    breadcrumbHome: string
    breadcrumbWorkspace: string
    editGame: string
    fileTotal: string
    heroDescription: string
    heroEyebrow: string
    modTotal: string
    importMod: string
    openGameDirectory: string
    unknownVersion: string
    conflictCaption: (count: number) => string
    conflictStatus: string
    conflictHealthy: string
    configuredPending: string
    configuredReady: string
    currentGame: string
    filesCaption: string
    modsCaption: (count: number) => string
  }
  workspacePage: {
    actions: string
    addedAt: string
    allTypes: string
    author: string
    close: string
    conflictFiles: string
    conflictFree: string
    conflictSummary: string
    conflictTitle: string
    conflictView: string
    conflictWarning: string
    conflictWarningDescription: (modName: string, count: number) => string
    currentFocus: string
    currentFocusLabel: (name: string) => string
    currentLoadedMods: string
    currentSelection: string
    deleteCurrentGame: string
    detailHint: string
    directory: string
    disabled: string
    disabledCount: (count: number) => string
    editGameProfile: string
    enabled: string
    enabledMods: string
    enabledState: string
    fileCount: string
    filePreview: string
    fileScale: string
    filesDetected: string
    focusBadge: string
    gameInfo: string
    gameStatusPending: string
    gameStatusReady: string
    gameSwitch: string
    importMod: string
    importedAt: string
    loadedFromDb: string
    modList: string
    modWarehouse: string
    mods: string
    nameOrAuthorOrFolder: string
    noConflictFiles: string
    noModsDescription: string
    noModsHint: string
    noModsTitle: string
    noSearchResultsDescription: string
    noSearchResultsTitle: string
    openGameDirectory: string
    previewDrawerDescription: string
    quickActionsDescription: string
    refresh: string
    refreshWorkspace: string
    resolveConflict: string
    searchPlaceholder: string
    selectedModDescription: string
    sidebarDescription: string
    size: string
    softLinkMode: string
    statusStable: string
    targetFolders: string
    totalMods: string
    updatedAt: string
    usingDatabase: string
    viewDetails: string
  }
  workspaceDialogs: {
    actionTipsTitle: string
    addBadge: string
    addDescription: string
    addTitle: string
    adding: string
    cancel: string
    chooseType: string
    confirmAddGame: string
    confirmDelete: string
    confirmImportMod: string
    conflictBadge: string
    conflictDescription: string
    conflictTitle: (modName: string) => string
    coverDescription: string
    coverStatus: string
    currentCover: string
    currentModSource: string
    currentStatusTitle: string
    customImage: string
    defaultCover: string
    deleteBadge: string
    deleteDescription: string
    deleteTitle: (gameName: string) => string
    deleting: string
    detectedExe: string
    detectedSummary: (gameName: string, gameType: string, exeName: string) => string
    detectionRulesTitle: string
    detecting: string
    directoryDetected: string
    directorySelected: string
    directoryStatus: string
    directoryWaitingDetection: string
    editBadge: string
    editTip1: string
    editTip2: string
    editTipTitle: string
    editTitle: string
    finish: string
    gameCover: string
    gameDirectory: string
    gameDirectoryPlaceholder: string
    importing: string
    importBadge: string
    importDescription: string
    importDetected: string
    importDirectoryPlaceholder: string
    importSource: string
    importSourceBrowse: string
    importSourceDirectory: string
    importSourceZip: string
    importStep1: string
    importStep2: string
    importStep3: string
    importTitle: string
    importTipTitle: string
    importWaitingSelection: string
    manifestDetected: string
    manifestMissing: string
    manifestStatus: string
    gameName: string
    gameNamePlaceholder: string
    gameType: string
    gameTypeIii: string
    gameTypeSa: string
    gameTypeVc: string
    later: string
    noPendingConflictsDescription: string
    noPendingConflictsTitle: string
    notDetected: string
    notDetectedYet: string
    notSelected: string
    optional: string
    otherModSource: string
    overwrite: string
    pending: string
    reselectImage: string
    restoreDefaultCover: string
    sameTargetFile: (otherModName: string) => string
    saveChanges: string
    saving: string
    selectedGame: string
    selectArchive: string
    selectDirectory: string
    selectLocalImage: string
    selected: string
    skip: string
    step1: string
    step2: string
    step3: string
    modDirectory: string
    modName: string
    targetPath: string
    typeStatus: string
    useDefaultCover: string
    usingDefaultCover: string
    version: string
    versionPlaceholder: string
    willOverwrite: string
    willSkip: string
  }
  workspaceActions: {
    addFailed: string
    checkingDirectory: string
    chooseGameCoverTitle: string
    chooseGameDirectoryTitle: string
    chooseModArchiveTitle: string
    chooseModDirectoryTitle: string
    confirmGameTypeFirst: string
    conflictSetOverwrite: string
    conflictSetSkip: string
    conflictUpdated: string
    coverReset: string
    coverSelected: string
    coverSelectionUpdated: string
    currentGame: string
    deleteFailed: string
    deletingGameConfig: string
    directoryCheckFailed: string
    downloadPageOpened: string
    editFailed: string
    gameAdded: string
    gameConfigSaved: string
    gameDeleted: string
    gameDetected: string
    gameDirectoryOpened: string
    gameUpdated: string
    initFailed: string
    importPreviewFailed: string
    importingMod: string
    modPreviewReady: string
    modDisabled: string
    modEnabled: string
    modImported: string
    updateModFailed: string
    updatingModState: string
    noOpenDirectory: string
    openDownloadPageFailed: string
    openGameDirectoryFailed: string
    importModFailed: string
    previewingMod: string
    scanModFirst: string
    selectModDirectoryFirst: string
    savingGameConfig: string
    savingGameInfo: (gameName: string) => string
    selectGameDirectoryFirst: string
  }
  demo: {
    fromDatabase: string
    importPending: string
    pendingScan: string
    previewPending: string
    syncedDescription: string
    targetPending: string
    unknownTime: string
  }
}

const localeOptions: Array<{ code: string; label: string; value: AppLocale }> = [
  { code: "ZH", label: "简体中文", value: "zh-CN" },
  { code: "EN", label: "English", value: "en-US" },
  { code: "JA", label: "日本語", value: "ja-JP" },
  { code: "RU", label: "Русский", value: "ru-RU" },
]

function themeModeLabel(mode: ResolvedThemeMode, words: { dark: string; light: string }) {
  return mode === "dark" ? words.dark : words.light
}

function AppI18nProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

function useI18n() {
  const { t } = useTranslation()
  const locale = i18n.language as AppLocale

  const setLocale = useCallback((value: AppLocale) => {
    window.localStorage.setItem(STORAGE_KEY, value)
    void i18n.changeLanguage(value)
  }, [])

  const copy = useMemo<AppCopy>(
    () => ({
      common: {
        appName: t("common.appName"),
        back: t("common.back"),
        close: t("common.close"),
        clickToSwitch: t("common.clickToSwitch"),
        current: t("common.current"),
        language: t("common.language"),
        localStorage: t("common.localStorage"),
        notProvided: t("common.notProvided"),
        settings: t("common.settings"),
      },
      home: {
        addGame: t("home.addGame"),
        cardView: t("home.cardView"),
        configuredCount: (count) => t("home.configuredCount", { count }),
        configuredDescription: t("home.configuredDescription"),
        configuredTitle: t("home.configuredTitle"),
        detectionRules: t("home.detectionRules"),
        downloadGame: t("home.downloadGame"),
        emptyDescription: t("home.emptyDescription"),
        emptyTitle: t("home.emptyTitle"),
        heroDescription: t("home.heroDescription"),
        heroEyebrow: t("home.heroEyebrow"),
        heroTitle: t("home.heroTitle"),
        listModeHint: t("home.listModeHint"),
        listView: t("home.listView"),
      },
      gameCard: {
        createdAt: t("gameCard.createdAt"),
        installPath: t("gameCard.installPath"),
        modCount: (count) => t("gameCard.modCount", { count }),
        openWorkspace: t("gameCard.openWorkspace"),
        openWorkspaceDescription: t("gameCard.openWorkspaceDescription"),
        updatedAt: t("gameCard.updatedAt"),
        versionFallback: t("gameCard.versionFallback"),
      },
      navbar: {
        builder: t("navbar.builder"),
        closeWindow: t("navbar.closeWindow"),
        darkLabel: t("navbar.darkLabel"),
        darkTitle: t("navbar.darkTitle"),
        home: t("navbar.home"),
        lightLabel: t("navbar.lightLabel"),
        lightTitle: t("navbar.lightTitle"),
        maximizeWindow: t("navbar.maximizeWindow"),
        minimizeWindow: t("navbar.minimizeWindow"),
        openHome: t("navbar.openHome"),
        openBuilder: t("navbar.openBuilder"),
        openSettings: t("navbar.openSettings"),
        restoreWindow: t("navbar.restoreWindow"),
        settings: t("navbar.settings"),
        systemLabel: (mode) =>
          t("navbar.systemLabel", {
            mode: themeModeLabel(mode, {
              dark: t("navbar.darkLabel"),
              light: t("settings.light"),
            }),
          }),
        systemTitle: (mode) =>
          t("navbar.systemTitle", {
            mode: themeModeLabel(mode, {
              dark: t("navbar.darkLabel"),
              light: t("settings.light"),
            }),
          }),
      },
      routes: {
        builderSubtitle: t("routes.builderSubtitle"),
        homeSubtitle: t("routes.homeSubtitle"),
        settingsSubtitle: t("routes.settingsSubtitle"),
        workspaceSubtitle: (gameName) =>
          gameName
            ? t("routes.workspaceSubtitle", { gameName })
            : t("routes.workspaceSubtitleFallback"),
      },
      builderPage: {
        badge: t("builderPage.badge"),
        copyJson: t("builderPage.copyJson"),
        copied: t("builderPage.copied"),
        chooseFolder: t("builderPage.chooseFolder"),
        chooseZip: t("builderPage.chooseZip"),
        generatedJsonTitle: t("builderPage.generatedJsonTitle"),
        heroDescription: t("builderPage.heroDescription"),
        heroTitle: t("builderPage.heroTitle"),
        inspectFailed: t("builderPage.inspectFailed"),
        inspectSource: t("builderPage.inspectSource"),
        hideMappingDetails: t("builderPage.hideMappingDetails"),
        mappingTitle: t("builderPage.mappingTitle"),
        metadataTitle: t("builderPage.metadataTitle"),
        modAuthor: t("builderPage.modAuthor"),
        modAuthorPlaceholder: t("builderPage.modAuthorPlaceholder"),
        modVersion: t("builderPage.modVersion"),
        modVersionPlaceholder: t("builderPage.modVersionPlaceholder"),
        resetMappings: t("builderPage.resetMappings"),
        sourcePath: t("builderPage.sourcePath"),
        sourcePlaceholder: t("builderPage.sourcePlaceholder"),
        sourceReady: t("builderPage.sourceReady"),
        sourceTreeTitle: t("builderPage.sourceTreeTitle"),
        sourceType: t("builderPage.sourceType"),
        sourceWaiting: t("builderPage.sourceWaiting"),
        showMappingDetails: t("builderPage.showMappingDetails"),
        targetTreeTitle: t("builderPage.targetTreeTitle"),
      },
      settings: {
        appearanceDescription: t("settings.appearanceDescription"),
        appearanceTitle: t("settings.appearanceTitle"),
        cardMode: t("settings.cardMode"),
        cardModeDescription: t("settings.cardModeDescription"),
        buttonPosition: t("settings.buttonPosition"),
        currentLanguage: t("settings.currentLanguage"),
        currentHomeDetails: t("settings.currentHomeDetails"),
        currentHomeView: t("settings.currentHomeView"),
        currentState: t("settings.currentState"),
        currentTheme: t("settings.currentTheme"),
        currentTitleBar: t("settings.currentTitleBar"),
        dataStorageDescription: t("settings.dataStorageDescription"),
        dataStorageTitle: t("settings.dataStorageTitle"),
        databaseDescription: t("settings.databaseDescription"),
        databaseTitle: t("settings.databaseTitle"),
        defaultMode: t("settings.defaultMode"),
        followSystem: t("settings.followSystem"),
        followSystemDescription: (mode) =>
          t("settings.followSystemDescription", {
            mode: themeModeLabel(mode, {
              dark: t("navbar.darkLabel"),
              light: t("settings.light"),
            }),
          }),
        groupsTitle: t("settings.groupsTitle"),
        heroDescription: t("settings.heroDescription"),
        heroTitle: t("settings.heroTitle"),
        homeDisplayDescription: t("settings.homeDisplayDescription"),
        homeDisplayTitle: t("settings.homeDisplayTitle"),
        languageDescription: t("settings.languageDescription"),
        languageSectionDescription: t("settings.languageSectionDescription"),
        languageSectionTitle: t("settings.languageSectionTitle"),
        left: t("settings.left"),
        light: t("settings.light"),
        lightDescription: t("settings.lightDescription"),
        localPersistence: t("settings.localPersistence"),
        moreInfoDescription: t("settings.moreInfoDescription"),
        moreInfoLabel: t("settings.moreInfoLabel"),
        macDescription: t("settings.macDescription"),
        macStyle: t("settings.macStyle"),
        moreCentered: t("settings.moreCentered"),
        off: t("settings.off"),
        on: t("settings.on"),
        persistence: t("settings.persistence"),
        right: t("settings.right"),
        storageCoversDescription: t("settings.storageCoversDescription"),
        storageCoversTitle: t("settings.storageCoversTitle"),
        theme: t("settings.theme"),
        themeDescription: t("settings.themeDescription"),
        titleAlignment: t("settings.titleAlignment"),
        titleBar: t("settings.titleBar"),
        titleBarDescription: t("settings.titleBarDescription"),
        viewModeDescription: t("settings.viewModeDescription"),
        viewModeLabel: t("settings.viewModeLabel"),
        windowsDescription: t("settings.windowsDescription"),
        windowsStyle: t("settings.windowsStyle"),
      },
      workspace: {
        breadcrumbHome: t("workspace.breadcrumbHome"),
        breadcrumbWorkspace: t("workspace.breadcrumbWorkspace"),
        conflictCaption: (count) => t("workspace.conflictCaption", { count }),
        conflictHealthy: t("workspace.conflictHealthy"),
        conflictStatus: t("workspace.conflictStatus"),
        configuredPending: t("workspace.configuredPending"),
        configuredReady: t("workspace.configuredReady"),
        currentGame: t("workspace.currentGame"),
        editGame: t("workspace.editGame"),
        fileTotal: t("workspace.fileTotal"),
        filesCaption: t("workspace.filesCaption"),
        heroDescription: t("workspace.heroDescription"),
        heroEyebrow: t("workspace.heroEyebrow"),
        importMod: t("workspace.importMod"),
        modTotal: t("workspace.modTotal"),
        modsCaption: (count) => t("workspace.modsCaption", { count }),
        openGameDirectory: t("workspace.openGameDirectory"),
        unknownVersion: t("workspace.unknownVersion"),
      },
      workspacePage: {
        actions: t("workspacePage.actions"),
        addedAt: t("workspacePage.addedAt"),
        allTypes: t("workspacePage.allTypes"),
        author: t("workspacePage.author"),
        close: t("workspacePage.close"),
        conflictFiles: t("workspacePage.conflictFiles"),
        conflictFree: t("workspacePage.conflictFree"),
        conflictSummary: t("workspacePage.conflictSummary"),
        conflictTitle: t("workspacePage.conflictTitle"),
        conflictView: t("workspacePage.conflictView"),
        conflictWarning: t("workspacePage.conflictWarning"),
        conflictWarningDescription: (modName, count) =>
          t("workspacePage.conflictWarningDescription", { count, modName }),
        currentFocus: t("workspacePage.currentFocus"),
        currentFocusLabel: (name) => t("workspacePage.currentFocusLabel", { name }),
        currentLoadedMods: t("workspacePage.currentLoadedMods"),
        currentSelection: t("workspacePage.currentSelection"),
        deleteCurrentGame: t("workspacePage.deleteCurrentGame"),
        detailHint: t("workspacePage.detailHint"),
        directory: t("workspacePage.directory"),
        disabled: t("workspacePage.disabled"),
        disabledCount: (count) => t("workspacePage.disabledCount", { count }),
        editGameProfile: t("workspacePage.editGameProfile"),
        enabled: t("workspacePage.enabled"),
        enabledMods: t("workspacePage.enabledMods"),
        enabledState: t("workspacePage.enabledState"),
        fileCount: t("workspacePage.fileCount"),
        filePreview: t("workspacePage.filePreview"),
        fileScale: t("workspacePage.fileScale"),
        filesDetected: t("workspacePage.filesDetected"),
        focusBadge: t("workspacePage.focusBadge"),
        gameInfo: t("workspacePage.gameInfo"),
        gameStatusPending: t("workspacePage.gameStatusPending"),
        gameStatusReady: t("workspacePage.gameStatusReady"),
        gameSwitch: t("workspacePage.gameSwitch"),
        importMod: t("workspacePage.importMod"),
        importedAt: t("workspacePage.importedAt"),
        loadedFromDb: t("workspacePage.loadedFromDb"),
        modList: t("workspacePage.modList"),
        modWarehouse: t("workspacePage.modWarehouse"),
        mods: t("workspacePage.mods"),
        nameOrAuthorOrFolder: t("workspacePage.nameOrAuthorOrFolder"),
        noConflictFiles: t("workspacePage.noConflictFiles"),
        noModsDescription: t("workspacePage.noModsDescription"),
        noModsHint: t("workspacePage.noModsHint"),
        noModsTitle: t("workspacePage.noModsTitle"),
        noSearchResultsDescription: t("workspacePage.noSearchResultsDescription"),
        noSearchResultsTitle: t("workspacePage.noSearchResultsTitle"),
        openGameDirectory: t("workspacePage.openGameDirectory"),
        previewDrawerDescription: t("workspacePage.previewDrawerDescription"),
        quickActionsDescription: t("workspacePage.quickActionsDescription"),
        refresh: t("workspacePage.refresh"),
        refreshWorkspace: t("workspacePage.refreshWorkspace"),
        resolveConflict: t("workspacePage.resolveConflict"),
        searchPlaceholder: t("workspacePage.searchPlaceholder"),
        selectedModDescription: t("workspacePage.selectedModDescription"),
        sidebarDescription: t("workspacePage.sidebarDescription"),
        size: t("workspacePage.size"),
        softLinkMode: t("workspacePage.softLinkMode"),
        statusStable: t("workspacePage.statusStable"),
        targetFolders: t("workspacePage.targetFolders"),
        totalMods: t("workspacePage.totalMods"),
        updatedAt: t("workspacePage.updatedAt"),
        usingDatabase: t("workspacePage.usingDatabase"),
        viewDetails: t("workspacePage.viewDetails"),
      },
      workspaceDialogs: {
        actionTipsTitle: t("workspaceDialogs.actionTipsTitle"),
        addBadge: t("workspaceDialogs.addBadge"),
        addDescription: t("workspaceDialogs.addDescription"),
        addTitle: t("workspaceDialogs.addTitle"),
        adding: t("workspaceDialogs.adding"),
        cancel: t("workspaceDialogs.cancel"),
        chooseType: t("workspaceDialogs.chooseType"),
        confirmAddGame: t("workspaceDialogs.confirmAddGame"),
        confirmDelete: t("workspaceDialogs.confirmDelete"),
        confirmImportMod: t("workspaceDialogs.confirmImportMod"),
        conflictBadge: t("workspaceDialogs.conflictBadge"),
        conflictDescription: t("workspaceDialogs.conflictDescription"),
        conflictTitle: (modName) => t("workspaceDialogs.conflictTitle", { modName }),
        coverDescription: t("workspaceDialogs.coverDescription"),
        coverStatus: t("workspaceDialogs.coverStatus"),
        currentCover: t("workspaceDialogs.currentCover"),
        currentModSource: t("workspaceDialogs.currentModSource"),
        currentStatusTitle: t("workspaceDialogs.currentStatusTitle"),
        customImage: t("workspaceDialogs.customImage"),
        defaultCover: t("workspaceDialogs.defaultCover"),
        deleteBadge: t("workspaceDialogs.deleteBadge"),
        deleteDescription: t("workspaceDialogs.deleteDescription"),
        deleteTitle: (gameName) => t("workspaceDialogs.deleteTitle", { gameName }),
        deleting: t("workspaceDialogs.deleting"),
        detectedExe: t("workspaceDialogs.detectedExe"),
        detectedSummary: (gameName, gameType, exeName) =>
          t("workspaceDialogs.detectedSummary", { exeName, gameName, gameType }),
        detectionRulesTitle: t("workspaceDialogs.detectionRulesTitle"),
        detecting: t("workspaceDialogs.detecting"),
        directoryDetected: t("workspaceDialogs.directoryDetected"),
        directorySelected: t("workspaceDialogs.directorySelected"),
        directoryStatus: t("workspaceDialogs.directoryStatus"),
        directoryWaitingDetection: t("workspaceDialogs.directoryWaitingDetection"),
        editBadge: t("workspaceDialogs.editBadge"),
        editTip1: t("workspaceDialogs.editTip1"),
        editTip2: t("workspaceDialogs.editTip2"),
        editTipTitle: t("workspaceDialogs.editTipTitle"),
        editTitle: t("workspaceDialogs.editTitle"),
        finish: t("workspaceDialogs.finish"),
        gameCover: t("workspaceDialogs.gameCover"),
        gameDirectory: t("workspaceDialogs.gameDirectory"),
        gameDirectoryPlaceholder: t("workspaceDialogs.gameDirectoryPlaceholder"),
        importing: t("workspaceDialogs.importing"),
        importBadge: t("workspaceDialogs.importBadge"),
        importDescription: t("workspaceDialogs.importDescription"),
        importDetected: t("workspaceDialogs.importDetected"),
        importDirectoryPlaceholder: t("workspaceDialogs.importDirectoryPlaceholder"),
        importSource: t("workspaceDialogs.importSource"),
        importSourceBrowse: t("workspaceDialogs.importSourceBrowse"),
        importSourceDirectory: t("workspaceDialogs.importSourceDirectory"),
        importSourceZip: t("workspaceDialogs.importSourceZip"),
        importStep1: t("workspaceDialogs.importStep1"),
        importStep2: t("workspaceDialogs.importStep2"),
        importStep3: t("workspaceDialogs.importStep3"),
        importTitle: t("workspaceDialogs.importTitle"),
        importTipTitle: t("workspaceDialogs.importTipTitle"),
        importWaitingSelection: t("workspaceDialogs.importWaitingSelection"),
        manifestDetected: t("workspaceDialogs.manifestDetected"),
        manifestMissing: t("workspaceDialogs.manifestMissing"),
        manifestStatus: t("workspaceDialogs.manifestStatus"),
        gameName: t("workspaceDialogs.gameName"),
        gameNamePlaceholder: t("workspaceDialogs.gameNamePlaceholder"),
        gameType: t("workspaceDialogs.gameType"),
        gameTypeIii: t("workspaceDialogs.gameTypeIii"),
        gameTypeSa: t("workspaceDialogs.gameTypeSa"),
        gameTypeVc: t("workspaceDialogs.gameTypeVc"),
        later: t("workspaceDialogs.later"),
        noPendingConflictsDescription: t("workspaceDialogs.noPendingConflictsDescription"),
        noPendingConflictsTitle: t("workspaceDialogs.noPendingConflictsTitle"),
        notDetected: t("workspaceDialogs.notDetected"),
        notDetectedYet: t("workspaceDialogs.notDetectedYet"),
        notSelected: t("workspaceDialogs.notSelected"),
        optional: t("workspaceDialogs.optional"),
        otherModSource: t("workspaceDialogs.otherModSource"),
        overwrite: t("workspaceDialogs.overwrite"),
        pending: t("workspaceDialogs.pending"),
        reselectImage: t("workspaceDialogs.reselectImage"),
        restoreDefaultCover: t("workspaceDialogs.restoreDefaultCover"),
        sameTargetFile: (otherModName) => t("workspaceDialogs.sameTargetFile", { otherModName }),
        saveChanges: t("workspaceDialogs.saveChanges"),
        saving: t("workspaceDialogs.saving"),
        selectedGame: t("workspaceDialogs.selectedGame"),
        selectArchive: t("workspaceDialogs.selectArchive"),
        selectDirectory: t("workspaceDialogs.selectDirectory"),
        selectLocalImage: t("workspaceDialogs.selectLocalImage"),
        selected: t("workspaceDialogs.selected"),
        skip: t("workspaceDialogs.skip"),
        step1: t("workspaceDialogs.step1"),
        step2: t("workspaceDialogs.step2"),
        step3: t("workspaceDialogs.step3"),
        modDirectory: t("workspaceDialogs.modDirectory"),
        modName: t("workspaceDialogs.modName"),
        targetPath: t("workspaceDialogs.targetPath"),
        typeStatus: t("workspaceDialogs.typeStatus"),
        useDefaultCover: t("workspaceDialogs.useDefaultCover"),
        usingDefaultCover: t("workspaceDialogs.usingDefaultCover"),
        version: t("workspaceDialogs.version"),
        versionPlaceholder: t("workspaceDialogs.versionPlaceholder"),
        willOverwrite: t("workspaceDialogs.willOverwrite"),
        willSkip: t("workspaceDialogs.willSkip"),
      },
      workspaceActions: {
        addFailed: t("workspaceActions.addFailed"),
        checkingDirectory: t("workspaceActions.checkingDirectory"),
        chooseGameCoverTitle: t("workspaceActions.chooseGameCoverTitle"),
        chooseGameDirectoryTitle: t("workspaceActions.chooseGameDirectoryTitle"),
        chooseModArchiveTitle: t("workspaceActions.chooseModArchiveTitle"),
        chooseModDirectoryTitle: t("workspaceActions.chooseModDirectoryTitle"),
        confirmGameTypeFirst: t("workspaceActions.confirmGameTypeFirst"),
        conflictSetOverwrite: t("workspaceActions.conflictSetOverwrite"),
        conflictSetSkip: t("workspaceActions.conflictSetSkip"),
        conflictUpdated: t("workspaceActions.conflictUpdated"),
        coverReset: t("workspaceActions.coverReset"),
        coverSelected: t("workspaceActions.coverSelected"),
        coverSelectionUpdated: t("workspaceActions.coverSelectionUpdated"),
        currentGame: t("workspaceActions.currentGame"),
        deleteFailed: t("workspaceActions.deleteFailed"),
        deletingGameConfig: t("workspaceActions.deletingGameConfig"),
        directoryCheckFailed: t("workspaceActions.directoryCheckFailed"),
        downloadPageOpened: t("workspaceActions.downloadPageOpened"),
        editFailed: t("workspaceActions.editFailed"),
        gameAdded: t("workspaceActions.gameAdded"),
        gameConfigSaved: t("workspaceActions.gameConfigSaved"),
        gameDeleted: t("workspaceActions.gameDeleted"),
        gameDetected: t("workspaceActions.gameDetected"),
        gameDirectoryOpened: t("workspaceActions.gameDirectoryOpened"),
        gameUpdated: t("workspaceActions.gameUpdated"),
        initFailed: t("workspaceActions.initFailed"),
        importPreviewFailed: t("workspaceActions.importPreviewFailed"),
        importingMod: t("workspaceActions.importingMod"),
        modPreviewReady: t("workspaceActions.modPreviewReady"),
        modDisabled: t("workspaceActions.modDisabled"),
        modEnabled: t("workspaceActions.modEnabled"),
        modImported: t("workspaceActions.modImported"),
        updateModFailed: t("workspaceActions.updateModFailed"),
        updatingModState: t("workspaceActions.updatingModState"),
        noOpenDirectory: t("workspaceActions.noOpenDirectory"),
        openDownloadPageFailed: t("workspaceActions.openDownloadPageFailed"),
        openGameDirectoryFailed: t("workspaceActions.openGameDirectoryFailed"),
        importModFailed: t("workspaceActions.importModFailed"),
        previewingMod: t("workspaceActions.previewingMod"),
        scanModFirst: t("workspaceActions.scanModFirst"),
        selectModDirectoryFirst: t("workspaceActions.selectModDirectoryFirst"),
        savingGameConfig: t("workspaceActions.savingGameConfig"),
        savingGameInfo: (gameName) => t("workspaceActions.savingGameInfo", { gameName }),
        selectGameDirectoryFirst: t("workspaceActions.selectGameDirectoryFirst"),
      },
      demo: {
        fromDatabase: t("demo.fromDatabase"),
        importPending: t("demo.importPending"),
        pendingScan: t("demo.pendingScan"),
        previewPending: t("demo.previewPending"),
        syncedDescription: t("demo.syncedDescription"),
        targetPending: t("demo.targetPending"),
        unknownTime: t("demo.unknownTime"),
      },
    }),
    [t],
  )

  return useMemo(
    () => ({
      copy,
      locale,
      localeOptions,
      setLocale,
    }),
    [copy, locale, setLocale],
  )
}

export { AppI18nProvider, type AppCopy, type AppLocale, useI18n }
