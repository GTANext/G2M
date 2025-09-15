import os
from tkinter import filedialog
import tkinter as tk
from core.config_manager import ConfigManager
from core.constants import CONFIG_FILE_PATH, GAME_TYPE_NAMES
import time
import uuid

class GameManager:
    def __init__(self, config_path=CONFIG_FILE_PATH):
        self.config_manager = ConfigManager(config_path)

    def add_game(self, game_type, directory, name=None):
        """添加游戏到配置文件"""
        try:
            # 如果没有提供自定义名称，则使用默认名称
            if not name:
                game_name = GAME_TYPE_NAMES.get(game_type, game_type)
            else:
                game_name = name

            # 检查目录是否存在
            if not os.path.exists(directory):
                return {"success": False, "message": "游戏目录不存在"}

            # 检查是否已存在相同类型和目录的游戏
            game_list_config = self.config_manager.load_game_list()
            for game in game_list_config.get("games", []):
                if game.get("type") == game_type and game.get("directory") == directory:
                    return {"success": False, "message": "该游戏已存在"}

            # 生成唯一ID
            game_id = self._generate_game_id(game_list_config)

            # 添加新游戏
            new_game = {
                "id": game_id,
                "type": game_type,
                "directory": directory,
                "name": game_name,
                "addedTime": int(time.time())  # 添加时间戳
            }

            if "games" not in game_list_config:
                game_list_config["games"] = []

            game_list_config["games"].append(new_game)
            self.config_manager.save_game_list(game_list_config)

            return {"success": True, "message": "游戏添加成功"}
        except Exception as e:
            return {"success": False, "message": f"添加游戏时出错: {str(e)}"}

    def _generate_game_id(self, game_list_config):
        """生成唯一的游戏ID"""
        games = game_list_config.get("games", [])
        if not games:
            return 1
        
        # 获取现有最大的ID数字
        max_id = 0
        for game in games:
            game_id = game.get("id", 0)
            try:
                id_num = int(game_id)
                max_id = max(max_id, id_num)
            except (ValueError, TypeError):
                continue
        
        return max_id + 1

    def select_directory(self):
        """选择游戏目录"""
        try:
            # 创建隐藏的根窗口
            root = tk.Tk()
            root.withdraw()
            root.attributes('-topmost', True)

            # 打开目录选择对话框
            directory = filedialog.askdirectory(title="选择游戏安装目录")

            # 销毁根窗口
            root.destroy()

            return directory if directory else None
        except Exception as e:
            print(f"选择目录时出错: {e}")
            return None