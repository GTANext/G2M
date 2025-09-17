import os
from core.config import ConfigManager
from core.constants import GAME_TYPE_NAMES, GAME_STATUS
import time

class GameManager:
    def __init__(self, config_path='assets/config.json'):
        self.config_path = config_path
        self.config_manager = ConfigManager(config_path)
        self.directory = ''

    def select_directory(self):
        """选择游戏目录 - 简化版本，返回空字符串让前端处理"""
        # 不在 Python 端处理目录选择，让前端调用 JavaScript 的目录选择
        return ""

    def add_game(self, game_type, directory, name=None):
        """添加游戏到列表"""
        try:
            # 验证参数
            if not game_type or not directory:
                return {"success": False, "message": "游戏类型和目录不能为空"}

            if not os.path.exists(directory):
                return {"success": False, "message": "指定的游戏目录不存在"}

            # 加载游戏列表
            game_list_config = self.config_manager.load_game_list()
            
            # 确保games字段存在
            if "games" not in game_list_config:
                game_list_config["games"] = []

            # 创建游戏对象
            game_data = {
                "type": game_type,
                "directory": directory,
                "addedTime": int(time.time()),  # 添加时间（Unix时间戳）
                "status": GAME_STATUS['ACTIVE']  # 默认状态为active
            }

            # 如果提供了名称，则添加名称字段
            if name:
                game_data["name"] = name
            else:
                # 使用默认名称
                game_data["name"] = GAME_TYPE_NAMES.get(game_type, game_type)

            # 检查是否已存在相同目录的游戏
            for existing_game in game_list_config["games"]:
                if (existing_game.get("directory") == directory and 
                    existing_game.get("status") != GAME_STATUS['DELETED']):
                    return {"success": False, "message": "该游戏已存在于列表中"}

            # 添加游戏到列表
            game_list_config["games"].append(game_data)

            # 保存游戏列表
            self.config_manager.save_game_list(game_list_config)

            return {"success": True, "message": f"游戏 '{game_data['name']}' 添加成功"}
        except Exception as e:
            return {"success": False, "message": f"添加游戏时出错: {str(e)}"}

    def game_exists(self, directory):
        """检查游戏是否已存在"""
        game_list_config = self.config_manager.load_game_list()
        games = game_list_config.get("games", [])
        
        for game in games:
            if (game.get("directory") == directory and 
                game.get("status") != GAME_STATUS['DELETED']):
                return True
        return False