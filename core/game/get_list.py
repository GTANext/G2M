from core.config import ConfigManager
from core.constants import GAME_STATUS

class GameListManager:
    def __init__(self, config_path='assets/config.json'):
        self.config_manager = ConfigManager(config_path)

    def get_games(self):
        """获取正常游戏列表"""
        game_list_config = self.config_manager.load_game_list()
        all_games = game_list_config.get("games", [])
        
        # 只返回状态为active的游戏
        active_games = [
            game for game in all_games 
            if game.get('status') != GAME_STATUS['DELETED']
        ]
        
        return active_games

    def get_deleted_games(self):
        """获取已删除游戏列表"""
        game_list_config = self.config_manager.load_game_list()
        all_games = game_list_config.get("games", [])
        
        # 只返回状态为deleted的游戏
        deleted_games = [
            game for game in all_games 
            if game.get('status') == GAME_STATUS['DELETED']
        ]
        return deleted_games

    def get_all_games(self):
        """获取所有游戏列表"""
        game_list_config = self.config_manager.load_game_list()
        return game_list_config.get("games", [])