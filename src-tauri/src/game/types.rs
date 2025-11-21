use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GameInfo {
    pub id: u32,
    pub name: String,
    pub time: String,
    pub dir: String,
    pub exe: String,
    pub img: Option<String>,
    #[serde(alias = "game_type")]
    pub r#type: Option<String>,
    #[serde(default)]
    pub deleted: bool, // 软删除标记，默认为false
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GameList {
    pub games: Vec<GameInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GameDetectionResult {
    pub success: bool,
    #[serde(alias = "game_type")]
    pub r#type: Option<String>,
    pub executable: Option<String>,
    pub game_name: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(error: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CopyImageResponse {
    pub image_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModLoaderStatus {
    pub has_dinput8: bool,
    pub has_modloader: bool,
    pub has_cleo: bool,
    pub has_cleo_redux: bool,
    pub missing_loaders: Vec<String>,
    pub found_loaders: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModInstallRequest {
    pub game_dir: String,
    pub game_type: String,
    pub components: Option<Vec<String>>, // 可选的组件列表
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModInstallResult {
    pub installed_files: Vec<String>,
    pub created_directories: Vec<String>,
}