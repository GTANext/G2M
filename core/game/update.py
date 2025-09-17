from core.config import ConfigManager
from core.constants import GAME_TYPE_NAMES, GAME_STATUS
import time

class GameUpdater:
    def __init__(self, config_path='assets/config.json'):
        self.config_manager = ConfigManager(config_path)

    def update_game(self, index, game_type, directory, name=None, custom_executable=None, status=None):
        """更新游戏信息"""
        try:
            # 处理传入的参数可能是字典的情况
            if isinstance(index, dict):
                params = index
                index = params['index']
                game_type = params['type']
                directory = params['directory']
                name = params.get('name')
                custom_executable = params.get('customExecutable')
                status = params.get('status')  # 获取状态参数

            # 确保index是整数类型
            index = int(index)

            # 加载游戏列表
            game_list_config = self.config_manager.load_game_list()

            # 检查索引是否有效
            games = game_list_config.get("games", [])
            if not isinstance(games, list):
                return {"success": False, "message": "游戏列表格式错误"}

            if index < 0 or index >= len(games):
                return {"success": False, "message": "游戏索引无效"}

            # 获取要更新的游戏
            game_to_update = games[index]
            
            # 保留原有的添加时间和状态字段（除非显式更新状态）
            added_time = game_to_update.get('addedTime', int(time.time()))
            
            # 更新游戏信息
            game_to_update.update({
                "type": game_type,
                "directory": directory,
                "addedTime": added_time  # 保留原有的添加时间
            })
            
            # 如果提供了状态，则更新状态
            if status is not None:
                game_to_update["status"] = status
                # 如果状态是删除，则添加删除时间
                if status == GAME_STATUS['DELETED']:
                    game_to_update["deletedTime"] = int(time.time())
                # 如果状态是激活，则移除删除时间
                elif status == GAME_STATUS['ACTIVE']:
                    game_to_update.pop("deletedTime", None)

            # 如果提供了名称，则更新名称字段
            if name:
                game_to_update["name"] = name
            else:
                # 使用默认名称
                game_to_update["name"] = GAME_TYPE_NAMES.get(game_type, game_type)

            # 如果提供了自定义可执行文件，则更新该字段
            if custom_executable is not None:
                if custom_executable:  # 如果有值则设置
                    game_to_update["customExecutable"] = custom_executable
                else:  # 如果为空则删除该字段
                    game_to_update.pop("customExecutable", None)

            # 保存游戏列表
            self.config_manager.save_game_list(game_list_config)

            return {"success": True, "message": f"游戏 '{game_to_update['name']}' 更新成功"}
        except Exception as e:
            return {"success": False, "message": f"更新游戏时出错: {str(e)}"}