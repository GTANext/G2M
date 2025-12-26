/**
 * 游戏数据仓库
 * 负责游戏数据的持久化操作
 */
use crate::game::types::{GameInfo, GameList};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

/// 游戏数据仓库
pub struct GameRepository {
    #[allow(dead_code)]
    config_dir: PathBuf,
    game_list_path: PathBuf,
}

impl GameRepository {
    /// 创建新的游戏仓库实例
    pub fn new(app_handle: &AppHandle) -> Result<Self, String> {
        let config_dir = crate::game::utils::get_config_dir(app_handle)?;
        let game_list_path = config_dir.join("GameList.json");

        // 确保配置目录存在
        fs::create_dir_all(&config_dir).map_err(|e| format!("创建配置目录失败: {}", e))?;

        Ok(Self {
            config_dir,
            game_list_path,
        })
    }

    /// 加载所有游戏
    pub fn load_all(&self) -> Result<Vec<GameInfo>, String> {
        if !self.game_list_path.exists() {
            return Ok(Vec::new());
        }

        let content = fs::read_to_string(&self.game_list_path)
            .map_err(|e| format!("读取游戏列表失败: {}", e))?;

        let game_list: GameList =
            serde_json::from_str(&content).map_err(|e| format!("解析游戏列表失败: {}", e))?;

        Ok(game_list.games)
    }

    /// 根据 ID 查找游戏
    pub fn find_by_id(&self, id: u32) -> Result<Option<GameInfo>, String> {
        let games = self.load_all()?;
        Ok(games.into_iter().find(|g| g.id == id))
    }

    /// 检查目录是否已存在
    pub fn exists_by_dir(&self, dir: &str, exclude_id: Option<u32>) -> Result<bool, String> {
        let games = self.load_all()?;
        Ok(games
            .iter()
            .any(|g| g.dir == dir && exclude_id.map_or(true, |id| g.id != id)))
    }

    /// 保存游戏列表
    pub fn save_all(&self, games: &[GameInfo]) -> Result<(), String> {
        let game_list = GameList {
            games: games.to_vec(),
        };

        let json_content = serde_json::to_string_pretty(&game_list)
            .map_err(|e| format!("序列化游戏列表失败: {}", e))?;

        fs::write(&self.game_list_path, json_content)
            .map_err(|e| format!("保存游戏列表失败: {}", e))?;

        Ok(())
    }

    /// 添加新游戏
    pub fn add(&self, game: GameInfo) -> Result<(), String> {
        let mut games = self.load_all()?;

        // 检查是否已存在相同目录的游戏
        if games.iter().any(|g| g.dir == game.dir) {
            return Err(format!(
                "游戏目录已存在！已有游戏使用了相同的目录路径：{}",
                game.dir
            ));
        }

        games.push(game);
        self.save_all(&games)
    }

    /// 更新游戏
    pub fn update(&self, id: u32, mut game: GameInfo) -> Result<(), String> {
        let mut games = self.load_all()?;

        // 检查目录冲突（排除当前游戏）
        if games.iter().any(|g| g.dir == game.dir && g.id != id) {
            return Err(format!(
                "游戏目录已存在！已有其他游戏使用了相同的目录路径：{}",
                game.dir
            ));
        }

        // 查找并更新游戏
        if let Some(existing_game) = games.iter_mut().find(|g| g.id == id) {
            game.id = id; // 确保 ID 不变
            *existing_game = game;
            self.save_all(&games)
        } else {
            Err("未找到指定的游戏".to_string())
        }
    }

    /// 删除游戏（软删除）
    pub fn delete(&self, id: u32) -> Result<(), String> {
        let mut games = self.load_all()?;

        if let Some(game) = games.iter_mut().find(|g| g.id == id) {
            game.deleted = true;
            self.save_all(&games)
        } else {
            Err("未找到指定的游戏".to_string())
        }
    }

    /// 获取下一个可用的游戏 ID
    pub fn get_next_id(&self) -> Result<u32, String> {
        let games = self.load_all()?;
        Ok(if games.is_empty() {
            1
        } else {
            games.iter().map(|g| g.id).max().unwrap_or(0) + 1
        })
    }
}
