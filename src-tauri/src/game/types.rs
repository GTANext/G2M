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
    pub version: Option<String>, // 游戏版本：1.0, 1.1, steam, diy等
    pub md5: Option<String>, // 主程序文件的MD5值
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
    pub version: Option<String>, // 游戏版本：1.0, 1.1, steam, diy等
    pub md5: Option<String>, // 主程序文件的MD5值
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
    pub manual_bindings: Vec<String>, // 手动绑定的加载器类型列表，如 ["cleo", "dinput8"]
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

// 自定义前置信息
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CustomPrerequisiteInfo {
    pub name: String,                    // 自定义前置名称
    pub files: Vec<CustomPrerequisiteFile>, // 文件列表
    pub target_dir: String,              // 目标目录类型：root, plugins, scripts
}

// 自定义前置文件信息
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CustomPrerequisiteFile {
    pub file_name: String,      // 文件名或文件夹名
    pub source_path: String,    // 源路径
    pub target_path: String,    // 目标路径（相对游戏目录）
    pub is_directory: bool,     // 是否为目录
}

// 自定义前置安装请求
#[derive(Debug, Serialize, Deserialize)]
pub struct CustomPrerequisiteInstallRequest {
    pub game_dir: String,
    pub name: String,           // 自定义前置名称
    pub source_paths: Vec<String>, // 源路径列表（文件或文件夹）
    pub target_dir: String,     // 目标目录：root, plugins, scripts
}

// 手动绑定的标准前置插件
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ManualLoaderBinding {
    pub loader_type: String,    // "cleo", "cleo_redux", "modloader", "dinput8"
    pub file_path: String,      // 相对游戏目录的路径
    pub file_name: String,      // 文件名
}