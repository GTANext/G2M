from core.config_manager import ConfigManager
from core.constants import CONFIG_FILE_PATH

class GameInfoManager:
    def __init__(self, config_path=CONFIG_FILE_PATH):
        self.config_manager = ConfigManager(config_path)

    def get_game_by_id(self, game_id):
        """通过ID获取详细信息"""
        try:
            # 处理可能传入的字典对象或直接ID
            if isinstance(game_id, dict):
                if 'id' in game_id:
                    game_id = game_id['id']
                else:
                    raise ValueError("字典中缺少'id'键")
            
            # 加载游戏列表配置
            game_list_config = self.config_manager.load_game_list()
            games = game_list_config.get("games", [])
            
            # 确保传入的game_id是整数类型
            target_id = int(game_id)
            
            # 查找匹配ID的游戏
            for game in games:
                # 确保游戏ID也是整数类型进行比较
                if int(game.get("id", 0)) == target_id:
                    return game
                    
            # 如果未找到匹配的游戏，返回None
            return None
        except Exception as e:
            print(f"获取游戏信息时出错: {e}")
            return None