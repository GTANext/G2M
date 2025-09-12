import os
from core.config_manager import ConfigManager

class GameDeleter:
    def __init__(self, config_path='assets/config.json'):
        self.config_manager = ConfigManager(config_path)

    def delete_game(self, index):
        """删除指定索引的游戏"""
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

            # 加载配置
            config = self.config_manager.load_config()

            # 检查索引是否有效
            games = config.get("games", [])
            if not isinstance(games, list):
                return {"success": False, "message": "游戏列表格式错误"}

            if index < 0 or index >= len(games):
                return {"success": False, "message": "游戏索引无效"}

            # 删除游戏
            deleted_game = games.pop(index)

            # 保存配置
            self.config_manager.save_config(config)

            return {"success": True, "message": f"游戏 '{deleted_game.get('name', deleted_game.get('type', '未知游戏'))}' 已删除"}
        except Exception as e:
            return {"success": False, "message": f"删除游戏时出错: {str(e)}"}
