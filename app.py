import os
import json
from core.add_game import GameManager
from core.get_games import GameListManager
from core.open_game import GameLauncher
from core.constants import CONFIG_FILE_PATH
from tkinter import filedialog
import tkinter as tk

class GTANext:
    def __init__(self):
        self.config_path = CONFIG_FILE_PATH
        self.game_manager = GameManager(self.config_path)
        self.game_list_manager = GameListManager(self.config_path)
        self.game_launcher = GameLauncher(self.config_path)
        self.directory = ''

    @staticmethod
    def example_method(param: str) -> str:
        """静态方法 不访问实例属性"""
        return f"Processed: {param}"

    def add_game(self, game_data):
        """添加游戏到配置文件"""
        try:
            game_type = game_data['type']
            directory = game_data['directory']
            name = game_data.get('name')  # 获取自定义名称（可选）

            result = self.game_manager.add_game(game_type, directory, name)
            return result
        except Exception as e:
            return {"success": False, "message": f"添加游戏时出错: {str(e)}"}

    def select_directory(self):
        """选择游戏目录"""
        return self.game_manager.select_directory()

    def get_games(self):
        """获取游戏列表"""
        return self.game_list_manager.get_games()

    def launch_game(self, game_data):
        """启动游戏"""
        try:
            game_type = game_data['type']
            game_directory = game_data['directory']
            custom_exe = game_data.get('exe')  # 获取自定义exe（可选）

            result = self.game_launcher.launch_game(game_type, game_directory, custom_exe)
            return result
        except Exception as e:
            return {"success": False, "message": f"启动游戏时出错: {str(e)}"}

    def select_game_executable(self, game_data):
        """选择游戏可执行文件"""
        try:
            # 创建隐藏的根窗口
            root = tk.Tk()
            root.withdraw()
            root.attributes('-topmost', True)

            # 打开文件选择对话框
            file_path = filedialog.askopenfilename(
                title="选择游戏可执行文件",
                initialdir=game_data.get('directory', ''),
                filetypes=[("Executable files", "*.exe"), ("All files", "*.*")]
            )

            # 销毁根窗口
            root.destroy()

            return file_path if file_path else None
        except Exception as e:
            print(f"选择游戏可执行文件时出错: {e}")
            return None
