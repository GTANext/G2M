import os
import subprocess
from core.config_manager import ConfigManager
from core.constants import GAME_EXECUTABLES

class GameLauncher:
    def __init__(self, config_path='assets/config.json'):
        self.config_manager = ConfigManager(config_path)

    @staticmethod
    def get_default_executable(game_type):
        """根据游戏类型获取默认的可执行文件名"""
        return GAME_EXECUTABLES.get(game_type, '')

    def launch_game(self, game_type, game_directory, custom_exe=None):
        """启动游戏"""
        try:
            # 如果没有指定自定义exe，则使用默认的
            if not custom_exe:
                executable = self.get_default_executable(game_type)
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

    def can_launch_directly(self, game_type, game_directory):
        """检查是否可以直接启动游戏（无需用户选择）"""
        try:
            # 获取默认的可执行文件名
            executable = self.get_default_executable(game_type)
            if not executable:
                return False

            # 构造完整路径
            exe_path = os.path.join(game_directory, executable)

            # 检查可执行文件是否存在
            return os.path.exists(exe_path)
        except:
            return False
