/**
 * 游戏服务层
 * 负责游戏相关的业务逻辑
 */

use crate::game::repository::GameRepository;
use crate::game::types::{ApiResponse, GameInfo};
use crate::game::utils::{
    calculate_file_md5, detect_game_type_from_exe, get_game_version_from_md5, write_g2m_json,
};
use chrono::Utc;
use std::path::Path;
use tauri::AppHandle;

/// 游戏服务
pub struct GameService {
    repository: GameRepository,
}

impl GameService {
    /// 创建新的游戏服务实例
    pub fn new(app_handle: &AppHandle) -> Result<Self, String> {
        let repository = GameRepository::new(app_handle)?;
        Ok(Self { repository })
    }

    /// 获取所有游戏
    pub fn get_all(&self) -> ApiResponse<Vec<GameInfo>> {
        match self.repository.load_all() {
            Ok(games) => ApiResponse::success(games),
            Err(e) => ApiResponse::error(e),
        }
    }

    /// 根据 ID 获取游戏
    pub fn get_by_id(&self, id: u32) -> ApiResponse<GameInfo> {
        match self.repository.find_by_id(id) {
            Ok(Some(game)) => ApiResponse::success(game),
            Ok(None) => ApiResponse::error("未找到指定的游戏".to_string()),
            Err(e) => ApiResponse::error(e),
        }
    }

    /// 保存新游戏
    pub fn save(
        &self,
        name: String,
        dir: String,
        exe: String,
        img: Option<String>,
        game_type: Option<String>,
    ) -> ApiResponse<()> {
        // 检查目录是否已存在
        if let Ok(true) = self.repository.exists_by_dir(&dir, None) {
            return ApiResponse::error(format!(
                "游戏目录已存在！已有游戏使用了相同的目录路径：{}",
                dir
            ));
        }

        // 获取下一个 ID
        let id = match self.repository.get_next_id() {
            Ok(id) => id,
            Err(e) => return ApiResponse::error(e),
        };

        // 优先使用传入的type参数，如果没有则根据exe文件名自动识别
        let detected_type = game_type.or_else(|| detect_game_type_from_exe(&exe));

        // 计算MD5值和版本
        let game_path = Path::new(&dir);
        let exe_path = game_path.join(&exe);
        let md5 = if exe_path.exists() {
            calculate_file_md5(&exe_path).ok()
        } else {
            None
        };

        let version = if let (Some(ref gt), Some(ref md5_hash)) = (detected_type.as_ref(), md5.as_ref()) {
            get_game_version_from_md5(gt, md5_hash)
        } else {
            None
        };

        // 创建新游戏信息
        let new_game = GameInfo {
            id,
            name: name.clone(),
            time: Utc::now().timestamp_millis().to_string(),
            dir: dir.clone(),
            exe: exe.clone(),
            img: img.clone(),
            r#type: detected_type.clone(),
            version,
            md5,
            deleted: false,
        };

        // 保存到仓库
        match self.repository.add(new_game.clone()) {
            Ok(_) => {
                // 在游戏根目录生成 .gtamodx/info.json 和 .gtamodx/mods.json 文件
                write_g2m_json(&new_game.dir, &new_game.name, &new_game.exe, &new_game.img, &new_game.r#type);
                ApiResponse::success(())
            }
            Err(e) => ApiResponse::error(e),
        }
    }

    /// 更新游戏
    pub fn update(
        &self,
        id: u32,
        name: String,
        dir: String,
        exe: String,
        img: Option<String>,
        game_type: Option<String>,
        deleted: Option<bool>,
    ) -> ApiResponse<()> {
        // 检查目录冲突（排除当前游戏）
        if let Ok(true) = self.repository.exists_by_dir(&dir, Some(id)) {
            return ApiResponse::error(format!(
                "游戏目录已存在！已有其他游戏使用了相同的目录路径：{}",
                dir
            ));
        }

        // 获取现有游戏
        let existing_game = match self.repository.find_by_id(id) {
            Ok(Some(game)) => game,
            Ok(None) => return ApiResponse::error("未找到指定的游戏".to_string()),
            Err(e) => return ApiResponse::error(e),
        };

        let old_dir = existing_game.dir.clone();

        // 重新计算MD5和版本（如果目录和exe发生变化）
        let game_path = Path::new(&dir);
        let exe_path = game_path.join(&exe);
        let mut md5 = existing_game.md5.clone();
        let mut version = existing_game.version.clone();

        if exe_path.exists() {
            if let Ok(md5_hash) = calculate_file_md5(&exe_path) {
                md5 = Some(md5_hash.clone());
                let detected_type = game_type.clone().or_else(|| detect_game_type_from_exe(&exe));
                if let Some(gt) = detected_type.as_deref() {
                    version = get_game_version_from_md5(gt, &md5_hash);
                }
            }
        }

        // 创建更新后的游戏信息
        let updated_game = GameInfo {
            id,
            name,
            dir: dir.clone(),
            exe,
            img,
            r#type: game_type.or(existing_game.r#type),
            version,
            md5,
            deleted: deleted.unwrap_or(existing_game.deleted),
            time: existing_game.time, // 保持原有时间
        };

        // 保存到仓库
        match self.repository.update(id, updated_game.clone()) {
            Ok(_) => {
                // 如果目录改变了，删除旧目录的 .gtamodx 目录
                if old_dir != dir {
                    let old_game_path = Path::new(&old_dir);
                    let old_g2m_dir = old_game_path.join(".gtamodx");
                    if old_g2m_dir.exists() {
                        let _ = std::fs::remove_dir_all(&old_g2m_dir);
                    }
                    let old_g2m_json_path = old_game_path.join("g2m.json");
                    if old_g2m_json_path.exists() {
                        let _ = std::fs::remove_file(&old_g2m_json_path);
                    }
                }

                // 在新目录写入 .gtamodx/info.json 和 .gtamodx/mods.json
                write_g2m_json(&updated_game.dir, &updated_game.name, &updated_game.exe, &updated_game.img, &updated_game.r#type);
                ApiResponse::success(())
            }
            Err(e) => ApiResponse::error(e),
        }
    }

    /// 删除游戏（软删除）
    pub fn delete(&self, id: u32) -> ApiResponse<()> {
        match self.repository.delete(id) {
            Ok(_) => ApiResponse::success(()),
            Err(e) => ApiResponse::error(e),
        }
    }

    /// 检查目录是否重复
    pub fn check_duplicate_directory(&self, dir: &str, exclude_id: Option<u32>) -> ApiResponse<bool> {
        match self.repository.exists_by_dir(dir, exclude_id) {
            Ok(true) => ApiResponse::error(format!(
                "游戏目录已存在！已有游戏使用了相同的目录路径：{}",
                dir
            )),
            Ok(false) => ApiResponse::success(false),
            Err(e) => ApiResponse::error(e),
        }
    }
}

