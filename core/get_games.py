from core.config_manager import ConfigManager

class GameListManager:
    def __init__(self, config_path='assets/config.json'):
        self.config_manager = ConfigManager(config_path)

    def get_games(self):
        """获取游戏列表"""
        config = self.config_manager.load_config()
        return config.get("games", [])
