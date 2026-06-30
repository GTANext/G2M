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
    copyManifest: string
    generateManifestFailed: string
    generateManifestSuccess: string
    copied: string
    copiedToClipboard: string
    chooseFolder: string
    chooseZip: string
    generatedJsonTitle: string
    gameTargets: string
    githubUrl: string
    githubUrlPlaceholder: string
    gtamodxUrl: string
    gtamodxUrlPlaceholder: string
    heroDescription: string
    heroTitle: string
    hideDetailedMappings: string
    hideMappingDetails: string
    extraLinks: string
    extraLinksDescription: string
    addLink: string
    inspectFailed: string
    inspectSource: string
    inspectSuccess: string
    linkLabelPlaceholder: string
    linkUrlPlaceholder: string
    manifestPreviewTitle: string
    mappingTitle: string
    prerequisitesTitle: string
    prerequisitesDescription: string
    customPrerequisitesBadge: string
    addCustomPrerequisite: string
    customPrerequisiteName: string
    customPrerequisiteNamePlaceholder: string
    customPrerequisiteUrl: string
    customPrerequisiteUrlPlaceholder: string
    customPrerequisiteUrlError: string
    customPrerequisiteMissingFields: string
    customPrerequisiteInvalidUrl: string
    md5Mode: string
    md5ModeArchive: string
    md5ModeDirectory: string
    md5ModePlaceholder: string
    md5Value: string
    md5ValuePlaceholder: string
    metadataTitle: string
    modAuthor: string
    modAuthorPlaceholder: string
    modVersion: string
    modVersionPlaceholder: string
    pageDescription: string
    pickArchive: string
    pickDirectory: string
    selectManifestSavePath: string
    pickSourceDescription: string
    pickSourceTitle: string
    resetMappings: string
    showDetailedMappings: string
    showMappingDetails: string
    sourcePath: string
    sourcePlaceholder: string
    sourceReady: string
    sourceTitle: string
    sourceTreeTitle: string
    sourceType: string
    sourceWaiting: string
    summaryFolder: string
    summaryFile: string
    targetTreeTitle: string
    linksTitle: string
    updateFingerprintDescription: string
    updateFingerprintTitle: string
    zipFiles: string
    explorerTitle: string
    explorerDescription: string
    explorerPreset: string
    explorerCustom: string
    explorerGoUp: string
    explorerEmpty: string
    hideSourceTree: string
    showSourceTree: string
    builderModeList: string
    builderModeTree: string
    builderModeExplorer: string
    dragToIgnore: string
    dragToRoot: string
    emptyMapping: string
    sourceTreeEmpty: string
    explorerRootLabel: string
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
    builderModeTitle: string
    builderModeDescription: string
    builderModeList: string
    builderModeListDescription: string
    builderModeTree: string
    builderModeTreeDescription: string
    builderModeExplorer: string
    builderModeExplorerDescription: string
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
    deleteCurrentMod: string
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
    installSelectedPrerequisites: string
    loadedFromDb: string
    missingPrerequisiteDrawerDescription: string
    missingPrerequisitesAlertDescription: (items: string) => string
    missingPrerequisitesAlertTitle: string
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
    openMissingPrerequisitesDrawer: string
    installPrerequisite: string
    prerequisiteBuiltinMissing: string
    prerequisiteDetected: string
    prerequisiteMissing: string
    prerequisiteRequiredBy: (mods: string) => string
    prerequisiteRoot: string
    prerequisiteScriptsPlugins: string
    prerequisitesDescription: string
    prerequisitesTitle: string
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
    customTargetFolder: string
    customTargetFolderPlaceholder: string
    customImage: string
    defaultCover: string
    deleteBadge: string
    deleteDescription: string
    deleteModBadge: string
    deleteModDescription: string
    deleteModTitle: (modName: string) => string
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
    folderMappingHint: string
    gameCover: string
    gameDirectory: string
    gameDirectoryPlaceholder: string
    importing: string
    importBadge: string
    importDescription: string
    importDetected: string
    importConflictBackupNotice: string
    importConflictHelp: string
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
    prerequisiteWarningsDescription: (modType: string, items: string) => string
    prerequisiteWarningsTitle: string
    importWaitingSelection: string
    installPath: string
    installToRoot: string
    doNotInstall: string
    addTargetFolder: string
    modMetadata: string
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
    adminRequired: string
    adminRequiredDescription: string
    emptyTargetPathsHandled: (count: number) => string
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
    deleteModFailed: string
    deletingMod: string
    installPrerequisiteFailed: string
    installingPrerequisite: string
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
    modDeleted: string
    modEnabled: string
    modImported: string
    prerequisiteInstalled: string
    resolveImportConflictsFirst: (count: number) => string
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
        copyManifest: t("builderPage.copyManifest"),
        generateManifestFailed: t("builderPage.generateManifestFailed"),
        generateManifestSuccess: t("builderPage.generateManifestSuccess"),
        copied: t("builderPage.copied"),
        copiedToClipboard: t("builderPage.copiedToClipboard"),
        chooseFolder: t("builderPage.chooseFolder"),
        chooseZip: t("builderPage.chooseZip"),
        generatedJsonTitle: t("builderPage.generatedJsonTitle"),
        gameTargets: t("builderPage.gameTargets"),
        githubUrl: t("builderPage.githubUrl"),
        githubUrlPlaceholder: t("builderPage.githubUrlPlaceholder"),
        gtamodxUrl: t("builderPage.gtamodxUrl"),
        gtamodxUrlPlaceholder: t("builderPage.gtamodxUrlPlaceholder"),
        heroDescription: t("builderPage.heroDescription"),
        heroTitle: t("builderPage.heroTitle"),
        hideDetailedMappings: t("builderPage.hideDetailedMappings"),
        hideMappingDetails: t("builderPage.hideMappingDetails"),
        extraLinks: t("builderPage.extraLinks"),
        extraLinksDescription: t("builderPage.extraLinksDescription"),
        addLink: t("builderPage.addLink"),
        inspectFailed: t("builderPage.inspectFailed"),
        inspectSource: t("builderPage.inspectSource"),
        inspectSuccess: t("builderPage.inspectSuccess"),
        linkLabelPlaceholder: t("builderPage.linkLabelPlaceholder"),
        linkUrlPlaceholder: t("builderPage.linkUrlPlaceholder"),
        manifestPreviewTitle: t("builderPage.manifestPreviewTitle"),
        mappingTitle: t("builderPage.mappingTitle"),
        prerequisitesTitle: t("builderPage.prerequisitesTitle"),
        prerequisitesDescription: t("builderPage.prerequisitesDescription"),
        customPrerequisitesBadge: t("builderPage.customPrerequisitesBadge"),
        addCustomPrerequisite: t("builderPage.addCustomPrerequisite"),
        customPrerequisiteName: t("builderPage.customPrerequisiteName"),
        customPrerequisiteNamePlaceholder: t("builderPage.customPrerequisiteNamePlaceholder"),
        customPrerequisiteUrl: t("builderPage.customPrerequisiteUrl"),
        customPrerequisiteUrlPlaceholder: t("builderPage.customPrerequisiteUrlPlaceholder"),
        customPrerequisiteUrlError: t("builderPage.customPrerequisiteUrlError"),
        customPrerequisiteMissingFields: t("builderPage.customPrerequisiteMissingFields"),
        customPrerequisiteInvalidUrl: t("builderPage.customPrerequisiteInvalidUrl"),
        md5Mode: t("builderPage.md5Mode"),
        md5ModeArchive: t("builderPage.md5ModeArchive"),
        md5ModeDirectory: t("builderPage.md5ModeDirectory"),
        md5ModePlaceholder: t("builderPage.md5ModePlaceholder"),
        md5Value: t("builderPage.md5Value"),
        md5ValuePlaceholder: t("builderPage.md5ValuePlaceholder"),
        metadataTitle: t("builderPage.metadataTitle"),
        modAuthor: t("builderPage.modAuthor"),
        modAuthorPlaceholder: t("builderPage.modAuthorPlaceholder"),
        modVersion: t("builderPage.modVersion"),
        modVersionPlaceholder: t("builderPage.modVersionPlaceholder"),
        pageDescription: t("builderPage.pageDescription"),
        pickArchive: t("builderPage.pickArchive"),
        pickDirectory: t("builderPage.pickDirectory"),
        selectManifestSavePath: t("builderPage.selectManifestSavePath"),
        pickSourceDescription: t("builderPage.pickSourceDescription"),
        pickSourceTitle: t("builderPage.pickSourceTitle"),
        resetMappings: t("builderPage.resetMappings"),
        showDetailedMappings: t("builderPage.showDetailedMappings"),
        showMappingDetails: t("builderPage.showMappingDetails"),
        sourcePath: t("builderPage.sourcePath"),
        sourcePlaceholder: t("builderPage.sourcePlaceholder"),
        sourceReady: t("builderPage.sourceReady"),
        sourceTitle: t("builderPage.sourceTitle"),
        sourceTreeTitle: t("builderPage.sourceTreeTitle"),
        sourceType: t("builderPage.sourceType"),
        sourceWaiting: t("builderPage.sourceWaiting"),
        summaryFolder: t("builderPage.summaryFolder"),
        summaryFile: t("builderPage.summaryFile"),
        targetTreeTitle: t("builderPage.targetTreeTitle"),
        linksTitle: t("builderPage.linksTitle"),
        updateFingerprintDescription: t("builderPage.updateFingerprintDescription"),
        updateFingerprintTitle: t("builderPage.updateFingerprintTitle"),
        zipFiles: t("builderPage.zipFiles"),
        explorerTitle: t("builderPage.explorerTitle"),
        explorerDescription: t("builderPage.explorerDescription"),
        explorerPreset: t("builderPage.explorerPreset"),
        explorerCustom: t("builderPage.explorerCustom"),
        explorerGoUp: t("builderPage.explorerGoUp"),
        explorerEmpty: t("builderPage.explorerEmpty"),
        hideSourceTree: t("builderPage.hideSourceTree"),
        showSourceTree: t("builderPage.showSourceTree"),
        builderModeList: t("builderPage.builderModeList"),
        builderModeTree: t("builderPage.builderModeTree"),
        builderModeExplorer: t("builderPage.builderModeExplorer"),
        dragToIgnore: t("builderPage.dragToIgnore"),
        dragToRoot: t("builderPage.dragToRoot"),
        emptyMapping: t("builderPage.emptyMapping"),
        sourceTreeEmpty: t("builderPage.sourceTreeEmpty"),
        explorerRootLabel: t("builderPage.explorerRootLabel"),
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
        builderModeTitle: t("settings.builderModeTitle"),
        builderModeDescription: t("settings.builderModeDescription"),
        builderModeList: t("settings.builderModeList"),
        builderModeListDescription: t("settings.builderModeListDescription"),
        builderModeTree: t("settings.builderModeTree"),
        builderModeTreeDescription: t("settings.builderModeTreeDescription"),
        builderModeExplorer: t("settings.builderModeExplorer"),
        builderModeExplorerDescription: t("settings.builderModeExplorerDescription"),
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
        deleteCurrentMod: t("workspacePage.deleteCurrentMod"),
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
        installSelectedPrerequisites: t("workspacePage.installSelectedPrerequisites"),
        loadedFromDb: t("workspacePage.loadedFromDb"),
        missingPrerequisiteDrawerDescription: t("workspacePage.missingPrerequisiteDrawerDescription"),
        missingPrerequisitesAlertDescription: (items) =>
          t("workspacePage.missingPrerequisitesAlertDescription", { items }),
        missingPrerequisitesAlertTitle: t("workspacePage.missingPrerequisitesAlertTitle"),
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
        installPrerequisite: t("workspacePage.installPrerequisite"),
        openGameDirectory: t("workspacePage.openGameDirectory"),
        openMissingPrerequisitesDrawer: t("workspacePage.openMissingPrerequisitesDrawer"),
        prerequisiteBuiltinMissing: t("workspacePage.prerequisiteBuiltinMissing"),
        prerequisiteDetected: t("workspacePage.prerequisiteDetected"),
        prerequisiteMissing: t("workspacePage.prerequisiteMissing"),
        prerequisiteRequiredBy: (mods) =>
          t("workspacePage.prerequisiteRequiredBy", { mods }),
        prerequisiteRoot: t("workspacePage.prerequisiteRoot"),
        prerequisiteScriptsPlugins: t("workspacePage.prerequisiteScriptsPlugins"),
        prerequisitesDescription: t("workspacePage.prerequisitesDescription"),
        prerequisitesTitle: t("workspacePage.prerequisitesTitle"),
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
        customTargetFolder: t("workspaceDialogs.customTargetFolder"),
        customTargetFolderPlaceholder: t("workspaceDialogs.customTargetFolderPlaceholder"),
        customImage: t("workspaceDialogs.customImage"),
        defaultCover: t("workspaceDialogs.defaultCover"),
        deleteBadge: t("workspaceDialogs.deleteBadge"),
        deleteDescription: t("workspaceDialogs.deleteDescription"),
        deleteModBadge: t("workspaceDialogs.deleteModBadge"),
        deleteModDescription: t("workspaceDialogs.deleteModDescription"),
        deleteModTitle: (modName) => t("workspaceDialogs.deleteModTitle", { modName }),
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
        folderMappingHint: t("workspaceDialogs.folderMappingHint"),
        gameCover: t("workspaceDialogs.gameCover"),
        gameDirectory: t("workspaceDialogs.gameDirectory"),
        gameDirectoryPlaceholder: t("workspaceDialogs.gameDirectoryPlaceholder"),
        importing: t("workspaceDialogs.importing"),
        importBadge: t("workspaceDialogs.importBadge"),
        importDescription: t("workspaceDialogs.importDescription"),
        importDetected: t("workspaceDialogs.importDetected"),
        importConflictBackupNotice: t("workspaceDialogs.importConflictBackupNotice"),
        importConflictHelp: t("workspaceDialogs.importConflictHelp"),
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
        prerequisiteWarningsDescription: (modType, items) =>
          t("workspaceDialogs.prerequisiteWarningsDescription", { items, modType }),
        prerequisiteWarningsTitle: t("workspaceDialogs.prerequisiteWarningsTitle"),
        importWaitingSelection: t("workspaceDialogs.importWaitingSelection"),
        installPath: t("workspaceDialogs.installPath"),
        installToRoot: t("workspaceDialogs.installToRoot"),
        doNotInstall: t("workspaceDialogs.doNotInstall"),
        addTargetFolder: t("workspaceDialogs.addTargetFolder"),
        modMetadata: t("workspaceDialogs.modMetadata"),
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
        adminRequired: t("workspaceActions.adminRequired"),
        adminRequiredDescription: t("workspaceActions.adminRequiredDescription"),
        emptyTargetPathsHandled: (count) =>
          t("workspaceActions.emptyTargetPathsHandled", { count }),
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
        deleteModFailed: t("workspaceActions.deleteModFailed"),
        deletingMod: t("workspaceActions.deletingMod"),
        installPrerequisiteFailed: t("workspaceActions.installPrerequisiteFailed"),
        installingPrerequisite: t("workspaceActions.installingPrerequisite"),
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
        modDeleted: t("workspaceActions.modDeleted"),
        modEnabled: t("workspaceActions.modEnabled"),
        modImported: t("workspaceActions.modImported"),
        prerequisiteInstalled: t("workspaceActions.prerequisiteInstalled"),
        resolveImportConflictsFirst: (count) =>
          t("workspaceActions.resolveImportConflictsFirst", { count }),
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
