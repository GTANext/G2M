import os
from core.config_manager import ConfigManager
from core.constants import GAME_EXECUTABLES

class GameUpdater:
    def __init__(self, config_path='assets/config.json'):
        self.config_manager = ConfigManager(config_path)

    def update_game(self, index, game_type, directory, name=None, custom_executable=None):
        """更新游戏信息"""
        try:
            # 加载配置
            config = self.config_manager.load_config()

            # 检查索引是否有效
            if index < 0 or index >= len(config.get("games", [])):
                return {"success": False, "message": "游戏索引无效"}

            # 根据游戏类型设置默认名称
            game_names = {
                'GTA3': 'GTA III',
                'GTAVC': 'GTA Vice City',
                'GTASA': 'GTA San Andreas'
            }

            game_name = name if name else game_names.get(game_type, game_type)

            # 构建游戏信息
            updated_game = {
                "type": game_type,
                "directory": directory,
                "name": game_name
            }

            # 如果有自定义可执行文件，则添加到配置中
            if custom_executable:
                updated_game["customExecutable"] = custom_executable

            # 更新游戏信息
            config["games"][index] = updated_game

            # 保存配置
            self.config_manager.save_config(config)

            return {"success": True, "message": "游戏信息更新成功"}
        except Exception as e:
            return {"success": False, "message": f"更新游戏信息时出错: {str(e)}"}
