import os
from tkinter import filedialog
import tkinter as tk
from core.config_manager import ConfigManager
from core.constants import CONFIG_FILE_PATH, GAME_TYPE_NAMES
import time

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
            config = self.config_manager.load_config()
            for game in config.get("games", []):
                if game.get("type") == game_type and game.get("directory") == directory:
                    return {"success": False, "message": "该游戏已存在"}

            # 添加新游戏
            new_game = {
                "type": game_type,
                "directory": directory,
                "name": game_name,
                "addedTime": int(time.time())  # 添加时间戳
            }

            if "games" not in config:
                config["games"] = []

            config["games"].append(new_game)
            self.config_manager.save_config(config)

            return {"success": True, "message": "游戏添加成功"}
        except Exception as e:
            return {"success": False, "message": f"添加游戏时出错: {str(e)}"}

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
