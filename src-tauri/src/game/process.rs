/**
 * 进程管理服务
 * 负责游戏启动和进程管理
 */
use crate::game::types::ApiResponse;
use std::path::Path;
use std::process::Command;

/// 进程服务
pub struct ProcessService;

impl ProcessService {
    /// 创建新的进程服务实例
    pub fn new() -> Self {
        Self
    }

    /// 启动游戏
    pub fn launch_game(
        &self,
        game_dir: &str,
        executable: &str,
        run_as_admin: Option<bool>,
    ) -> ApiResponse<()> {
        let game_path = Path::new(game_dir);
        let exe_path = game_path.join(executable);

        // 检查游戏目录是否存在
        if !game_path.exists() {
            return ApiResponse::error("游戏目录不存在".to_string());
        }

        // 检查可执行文件是否存在
        if !exe_path.exists() {
            return ApiResponse::error(format!("游戏可执行文件不存在: {}", executable));
        }

        // 启动游戏进程
        let result = if cfg!(target_os = "windows") && run_as_admin.unwrap_or(false) {
            self.launch_with_admin_privileges(&exe_path, game_path)
        } else {
            Command::new(&exe_path).current_dir(game_path).spawn()
        };

        match result {
            Ok(_) => ApiResponse::success(()),
            Err(e) => {
                // 检查是否是权限错误 (os error 740)
                if e.raw_os_error() == Some(740) {
                    ApiResponse::error(
                        "启动游戏需要管理员权限。请尝试以管理员身份运行G2M。".to_string(),
                    )
                } else {
                    ApiResponse::error(format!("启动游戏失败: {}", e))
                }
            }
        }
    }

    /// Windows 管理员权限启动
    #[cfg(target_os = "windows")]
    fn launch_with_admin_privileges(
        &self,
        exe_path: &Path,
        working_dir: &Path,
    ) -> std::io::Result<std::process::Child> {
        Command::new("powershell")
            .args(&[
                "-Command",
                &format!(
                    "Start-Process -FilePath '{}' -WorkingDirectory '{}' -Verb RunAs",
                    exe_path.display(),
                    working_dir.display()
                ),
            ])
            .spawn()
    }

    /// 在非 Windows 系统上使用 sudo 或直接启动
    #[cfg(not(target_os = "windows"))]
    fn launch_with_admin_privileges(
        &self,
        exe_path: &Path,
        working_dir: &Path,
    ) -> std::io::Result<std::process::Child> {
        Command::new(exe_path).current_dir(working_dir).spawn()
    }

    /// 打开文件夹
    pub fn open_folder(&self, path: &str) -> ApiResponse<()> {
        let folder_path = Path::new(path);

        if !folder_path.exists() {
            return ApiResponse::error("目录不存在".to_string());
        }

        match tauri_plugin_opener::open_path(folder_path, None::<&str>) {
            Ok(_) => ApiResponse::success(()),
            Err(e) => ApiResponse::error(format!("打开目录失败: {}", e)),
        }
    }
}

impl Default for ProcessService {
    fn default() -> Self {
        Self::new()
    }
}
