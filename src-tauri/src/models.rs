use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BootstrapPayload {
    pub(crate) data_dir: String,
    pub(crate) database_path: String,
    pub(crate) is_elevated: bool,
    pub(crate) games: Vec<GameDirectory>,
    pub(crate) mods: Vec<StoredMod>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AppInfoPayload {
    pub(crate) product_name: String,
    pub(crate) version: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GameDirectory {
    pub(crate) id: String,
    pub(crate) game_type: String,
    pub(crate) name: String,
    pub(crate) path: String,
    pub(crate) exe_name: String,
    pub(crate) version: String,
    pub(crate) image_path: String,
    pub(crate) created_at: i64,
    pub(crate) updated_at: i64,
    pub(crate) configured: bool,
    pub(crate) sort_order: i64,
    pub(crate) prerequisites: Vec<GamePrerequisitePayload>,
    pub(crate) link_health: GameLinkHealthPayload,
}

#[derive(Debug, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GameLinkHealthPayload {
    pub(crate) has_issues: bool,
    pub(crate) issue_count: i64,
    pub(crate) missing_source_count: i64,
    pub(crate) missing_target_count: i64,
    pub(crate) repairable_mod_count: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GamePrerequisitePayload {
    pub(crate) key: String,
    pub(crate) label: String,
    pub(crate) detected: bool,
    pub(crate) can_install: bool,
    pub(crate) can_uninstall: bool,
    pub(crate) required: bool,
    pub(crate) scan_scope: String,
    pub(crate) detected_path: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DetectedGamePayload {
    pub(crate) game_type: String,
    pub(crate) name: String,
    pub(crate) path: String,
    pub(crate) exe_name: String,
    pub(crate) version: String,
    pub(crate) cover_base64: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StoredMod {
    pub(crate) id: String,
    pub(crate) game_id: String,
    pub(crate) name: String,
    pub(crate) icon_base64: String,
    pub(crate) version: String,
    pub(crate) mod_type: String,
    pub(crate) author: String,
    pub(crate) enabled: bool,
    pub(crate) file_count: i64,
    pub(crate) conflicts: i64,
    pub(crate) size_bytes: i64,
    pub(crate) installed_at: i64,
    pub(crate) description: String,
    pub(crate) source_dir: String,
    pub(crate) target_folders: Vec<String>,
    pub(crate) preview_files: Vec<String>,
    pub(crate) conflict_files: Vec<StoredConflictFile>,
    pub(crate) conflict_with: Vec<String>,
    pub(crate) links: Vec<ExistingBuilderManifestLinkPayload>,
    pub(crate) modx_slug: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StoredConflictFile {
    pub(crate) id: String,
    pub(crate) file_name: String,
    pub(crate) target_path: String,
    pub(crate) source_path: String,
    pub(crate) target_folder: String,
    pub(crate) other_mod_name: String,
    pub(crate) other_source_path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ModImportFileEntryPayload {
    pub(crate) relative_path: String,
    pub(crate) target_path: String,
    pub(crate) target_folder: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExistingBuilderManifestLinkPayload {
    pub(crate) kind: String,
    pub(crate) label: String,
    pub(crate) url: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExistingBuilderManifestUpdatePayload {
    pub(crate) md5: String,
    pub(crate) md5_mode: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExistingBuilderManifestFilePayload {
    pub(crate) path: String,
    pub(crate) install_to: String,
    pub(crate) games: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExistingBuilderManifestCustomPrerequisitePayload {
    pub(crate) name: String,
    pub(crate) url: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExistingBuilderManifestPayload {
    pub(crate) name: String,
    pub(crate) version: String,
    pub(crate) author: String,
    pub(crate) description: String,
    pub(crate) icon_base64: String,
    pub(crate) mod_type: String,
    pub(crate) links: Vec<ExistingBuilderManifestLinkPayload>,
    pub(crate) prerequisites: Vec<String>,
    pub(crate) custom_prerequisites: Vec<ExistingBuilderManifestCustomPrerequisitePayload>,
    pub(crate) update: Option<ExistingBuilderManifestUpdatePayload>,
    pub(crate) files: Vec<ExistingBuilderManifestFilePayload>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ManifestSourceDigestPayload {
    pub(crate) md5: String,
    pub(crate) md5_mode: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ModImportFileEntryInput {
    pub(crate) relative_path: String,
    pub(crate) target_path: String,
    pub(crate) skip_install: Option<bool>,
    pub(crate) overwrite_existing: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ModImportPreviewPayload {
    pub(crate) name: String,
    pub(crate) mod_type: String,
    pub(crate) file_count: i64,
    pub(crate) size_bytes: i64,
    pub(crate) source_dir: String,
    pub(crate) has_g2m_manifest: bool,
    pub(crate) g2m_manifest_path: Option<String>,
    pub(crate) target_folders: Vec<String>,
    pub(crate) preview_files: Vec<String>,
    pub(crate) files: Vec<ModImportFileEntryPayload>,
    pub(crate) existing_manifest: Option<ExistingBuilderManifestPayload>,
    pub(crate) conflict_files: Vec<StoredConflictFile>,
    pub(crate) conflict_with: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StoredGameEntry {
    pub(crate) id: String,
    pub(crate) game_type: String,
    pub(crate) name: String,
    pub(crate) path: String,
    pub(crate) exe_name: String,
    pub(crate) version: String,
    pub(crate) image_path: String,
    pub(crate) created_at: i64,
    pub(crate) updated_at: i64,
    pub(crate) sort_order: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LegacyStoredGamePath {
    pub(crate) id: String,
    pub(crate) path: String,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LegacySettingsFile {
    pub(crate) games: Vec<LegacyStoredGamePath>,
}

pub(crate) struct ModInstallFileRecord {
    pub(crate) source_path: String,
    pub(crate) target_path: String,
}

pub(crate) struct ModInstallPlan {
    pub(crate) mod_id: String,
    pub(crate) game_path: String,
    pub(crate) source_dir: String,
    pub(crate) files: Vec<ModInstallFileRecord>,
}
