# -*- coding: utf-8 -*-
# @Author  : 鼠子Tomoriゞ
# @File    : app.py
# @Software: PyCharm/VSCode
# @Discription: GTANext Core 模块

import os
import subprocess
import winreg
from core.game.add import GameManager
from core.game.get_list import GameListManager
from core.game.update import GameUpdater
from core.game.delete import GameDeleter
from core.config import ConfigManager
from core.constants import CONFIG_FILE_PATH, GAME_EXECUTABLES, GAME_STATUS
from core.mod.detector import ModDetector
import webview

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
        return f"Processed: {param}"

    def is_webview2_installed(self):
        """检查WebView2是否已安装"""
        # 检查用户级别的安装
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER,
                                r"Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}") as key:
                version = winreg.QueryValueEx(key, "pv")[0]
                return True
        except WindowsError:
            pass

        # 检查系统级别的安装
        try:
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE,
                                r"SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}") as key:
                version = winreg.QueryValueEx(key, "pv")[0]
                return True
        except WindowsError:
            pass

        # 检查另一种系统级别安装
        try:
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE,
                                r"SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}") as key:
                version = winreg.QueryValueEx(key, "pv")[0]
                return True
        except WindowsError:
            pass

        # 如果以上方法都失败，则认为未安装
        return False

    def check_dotnet_version(self):
        try:
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE,
                                r"SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full") as key:
                release = winreg.QueryValueEx(key, "Release")[0]
                if release >= 528040:
                    return True
                return False
        except WindowsError:
            return False

    def add_game(self, game_data):
        try:
            game_type = game_data['type']
            directory = game_data['directory']
            name = game_data.get('name')
            result = self.game_manager.add_game(game_type, directory, name)
            return result
        except Exception as e:
            return {"success": False, "message": f"添加游戏时出错: {str(e)}"}

    def update_game(self, game_data):
        try:
            index = game_data['index']
            game_type = game_data['type']
            directory = game_data['directory']
            name = game_data.get('name')
            custom_executable = game_data.get('customExecutable')
            status = game_data.get('status')  # 获取状态参数
            result = self.game_updater.update_game(
                index, game_type, directory, name, custom_executable, status)
            return result
        except Exception as e:
            return {"success": False, "message": f"更新游戏信息时出错: {str(e)}"}

    def delete_game(self, index):
        try:
            if isinstance(index, dict):
                if 'index' in index:
                    index = index['index']
                else:
                    return {"success": False, "message": "无效的索引参数"}
            try:
                index = int(index)
            except (ValueError, TypeError):
                return {"success": False, "message": "索引必须是数字"}
            result = self.game_deleter.delete_game(index)
            return result
        except Exception as e:
            return {"success": False, "message": f"删除游戏时出错: {str(e)}"}

    def soft_delete_game(self, game_data):
        """软删除游戏"""
        try:
            # 如果传入的是索引而不是字典，先获取游戏完整信息
            if isinstance(game_data, int) or isinstance(game_data, str):
                # 获取所有游戏
                game_list_config = self.config_manager.load_game_list()
                games = game_list_config.get("games", [])
                index = int(game_data)

                # 检查索引是否有效
                if index < 0 or index >= len(games):
                    return {"success": False, "message": "游戏索引无效"}

                # 获取游戏信息并添加状态
                game_data = games[index].copy()
                game_data["index"] = index

            # 确保包含状态参数
            game_data["status"] = GAME_STATUS['DELETED']

            # 调用 update_game 方法来更新游戏状态为已删除
            result = self.update_game(game_data)
            return result
        except Exception as e:
            return {"success": False, "message": f"删除游戏时出错: {str(e)}"}

    def restore_game(self, game_data):
        """恢复已删除的游戏"""
        try:
            # 如果传入的是索引而不是字典，先获取游戏完整信息
            if isinstance(game_data, int) or isinstance(game_data, str):
                # 获取所有游戏
                game_list_config = self.config_manager.load_game_list()
                games = game_list_config.get("games", [])
                index = int(game_data)

                # 检查索引是否有效
                if index < 0 or index >= len(games):
                    return {"success": False, "message": "游戏索引无效"}

                # 获取游戏信息并添加状态
                game_data = games[index].copy()
                game_data["index"] = index

            # 确保包含状态参数
            game_data["status"] = GAME_STATUS['ACTIVE']

            # 调用 update_game 方法来更新游戏状态为激活
            result = self.update_game(game_data)
            return result
        except Exception as e:
            return {"success": False, "message": f"恢复游戏时出错: {str(e)}"}

    def select_directory(self):
        # 使用 webview 提供的目录选择对话框
        try:
            directories = webview.windows[0].create_file_dialog(
                webview.FileDialog.FOLDER)
            if directories:
                return directories[0]  # 返回选择的目录路径
            return ""
        except Exception as e:
            print(f"选择目录时出错: {e}")
            return ""

    def get_games(self):
        return self.game_list_manager.get_games()

    def get_deleted_games(self):
        return self.game_list_manager.get_deleted_games()

    def get_game_info(self, game_id):
        try:
            # 处理可能传入的字典对象或直接ID
            if isinstance(game_id, dict):
                if 'id' in game_id:
                    game_id = game_id['id']
                else:
                    raise ValueError("字典中缺少'id'键")

            # 强制 game_id 为数字类型
            game_id = int(game_id)
            from core.game.get_info import GameInfoManager
            game_info_manager = GameInfoManager(self.config_path)
            game_info = game_info_manager.get_game_by_id(game_id)
            return game_info
        except Exception as e:
            print(f"获取游戏信息时出错: {str(e)}")
            return None

    def launch_game(self, game_data):
        try:
            game_type = game_data['type']
            game_directory = game_data['directory']
            custom_exe = game_data.get('exe')
            if not custom_exe:
                if 'customExecutable' in game_data and game_data['customExecutable']:
                    executable = game_data['customExecutable']
                else:
                    executable = GAME_EXECUTABLES.get(game_type, '')
                if not executable:
                    return {"success": False, "message": f"未知的游戏类型: {game_type}"}
            else:
                executable = custom_exe
            exe_path = os.path.join(game_directory, executable)
            if not os.path.exists(exe_path):
                return {"success": False, "message": f"游戏可执行文件不存在: {exe_path}"}
            subprocess.Popen([exe_path], cwd=game_directory)
            return {"success": True, "message": "游戏启动成功"}
        except Exception as e:
            return {"success": False, "message": f"启动游戏时出错: {str(e)}"}

    def select_game_executable(self, game_data):
        try:
            file_types = ('Executable files (*.exe)', 'exe')
            files = webview.windows[0].create_file_dialog(
                webview.FileDialog.OPEN,
                directory=game_data.get('directory', ''),
                file_types=(file_types,)
            )
            if files:
                return files[0]  # 返回选择的文件路径
            return None
        except Exception as e:
            print(f"选择游戏可执行文件时出错: {e}")
            return None

    def detect_prerequisite_mods(self, game_data):
        """检测游戏目录中的前置mod文件"""
        try:
            # 处理可能传入的字典对象或直接目录
            if isinstance(game_data, dict):
                if 'directory' in game_data:
                    game_directory = game_data['directory']
                else:
                    return {"success": False, "message": "缺少游戏目录参数"}
            else:
                game_directory = game_data
            
            # 调用ModDetector进行检测
            result = ModDetector.detect_prerequisite_mods(game_directory)
            return {"success": True, "data": result}
            
        except Exception as e:
            return {"success": False, "message": f"检测mod时出错: {str(e)}"}
