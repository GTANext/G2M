import os
import json
import subprocess
from core.add_game import GameManager
from core.get_games import GameListManager
from core.update_game import GameUpdater
from core.delete_game import GameDeleter
from core.config_manager import ConfigManager
from core.constants import CONFIG_FILE_PATH, GAME_EXECUTABLES
from tkinter import filedialog
import tkinter as tk


class GTANext:
    def __init__(self):
        self.config_path = CONFIG_FILE_PATH
        self.game_manager = GameManager(self.config_path)
        self.game_list_manager = GameListManager(self.config_path)
        self.game_updater = GameUpdater(self.config_path)
        self.game_deleter = GameDeleter(self.config_path)
        self.config_manager = ConfigManager(self.config_path)
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
            name = game_data.get('name')  # 获取自定义名称

            result = self.game_manager.add_game(game_type, directory, name)
            return result
        except Exception as e:
            return {"success": False, "message": f"添加游戏时出错: {str(e)}"}

    def update_game(self, game_data):
        """更新游戏信息"""
        try:
            index = game_data['index']
            game_type = game_data['type']
            directory = game_data['directory']
            name = game_data.get('name')  # 获取自定义名称（可选）
            custom_executable = game_data.get('customExecutable')  # 获取自定义可执行文件（可选）

            result = self.game_updater.update_game(index, game_type, directory, name, custom_executable)
            return result
        except Exception as e:
            return {"success": False, "message": f"更新游戏信息时出错: {str(e)}"}

    def delete_game(self, index):
        """删除游戏"""
        try:
            # 处理传入的参数可能是字典的情况
            if isinstance(index, dict):
                # 如果index是一个字典，从中提取index值
                if 'index' in index:
                    index = index['index']
                else:
                    return {"success": False, "message": "无效的索引参数"}

            # 确保index是整数类型
            try:
                index = int(index)
            except (ValueError, TypeError):
                return {"success": False, "message": "索引必须是数字"}

            result = self.game_deleter.delete_game(index)
            return result
        except Exception as e:
            return {"success": False, "message": f"删除游戏时出错: {str(e)}"}

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

            # 如果没有指定自定义exe，则检查游戏配置中是否有自定义exe，否则使用默认的
            if not custom_exe:
                # 检查游戏数据中是否有自定义可执行文件
                if 'customExecutable' in game_data and game_data['customExecutable']:
                    executable = game_data['customExecutable']
                else:
                    executable = GAME_EXECUTABLES.get(game_type, '')

                if not executable:
                    return {"success": False, "message": f"未知的游戏类型: {game_type}"}
            else:
                executable = custom_exe

            # 构造完整路径
            exe_path = os.path.join(game_directory, executable)

            # 检查可执行文件是否存在
            if not os.path.exists(exe_path):
                return {"success": False, "message": f"游戏可执行文件不存在: {exe_path}"}

            # 启动游戏
            subprocess.Popen([exe_path], cwd=game_directory)

            return {"success": True, "message": "游戏启动成功"}
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
