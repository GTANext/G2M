import os
import json
from core.constants import CONFIG_FILE_PATH, GAME_LIST_FILE_PATH, DEFAULT_CONFIG, DEFAULT_GAME_LIST

class ConfigManager:
    def __init__(self, config_path=CONFIG_FILE_PATH):
        self.config_path = config_path
        self.game_list_path = GAME_LIST_FILE_PATH
        self.ensure_config_exists()

    def ensure_config_exists(self):
        """确保配置文件存在，如果不存在则创建并初始化"""
        # 确保主配置文件目录存在
        config_dir = os.path.dirname(self.config_path)
        if config_dir and not os.path.exists(config_dir):
            os.makedirs(config_dir)
            
        # 确保游戏列表文件目录存在
        game_list_dir = os.path.dirname(self.game_list_path)
        if game_list_dir and not os.path.exists(game_list_dir):
            os.makedirs(game_list_dir)

        # 如果主配置文件不存在，则创建并初始化
        if not os.path.exists(self.config_path):
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(DEFAULT_CONFIG, f, ensure_ascii=False, indent=2)
                
        # 如果游戏列表文件不存在，则创建并初始化
        if not os.path.exists(self.game_list_path):
            with open(self.game_list_path, 'w', encoding='utf-8') as f:
                json.dump(DEFAULT_GAME_LIST, f, ensure_ascii=False, indent=2)

    def load_config(self):
        """加载配置文件"""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return DEFAULT_CONFIG.copy()
            
    def load_game_list(self):
        """加载游戏列表文件"""
        try:
            with open(self.game_list_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return DEFAULT_GAME_LIST.copy()

    def save_config(self, config):
        """保存配置文件"""
        # 确保目录存在
        os.makedirs(os.path.dirname(self.config_path), exist_ok=True)

        with open(self.config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
            
    def save_game_list(self, game_list):
        """保存游戏列表文件"""
        # 确保目录存在
        os.makedirs(os.path.dirname(self.game_list_path), exist_ok=True)
        
        with open(self.game_list_path, 'w', encoding='utf-8') as f:
            json.dump(game_list, f, ensure_ascii=False, indent=2)