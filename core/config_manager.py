import os
import json
from core.constants import CONFIG_FILE_PATH, DEFAULT_CONFIG

class ConfigManager:
    def __init__(self, config_path=CONFIG_FILE_PATH):
        self.config_path = config_path
        self.ensure_config_exists()

    def ensure_config_exists(self):
        """确保配置文件存在，如果不存在则创建并初始化"""
        # 确保目录存在
        config_dir = os.path.dirname(self.config_path)
        if config_dir and not os.path.exists(config_dir):
            os.makedirs(config_dir)

        # 如果配置文件不存在，则创建并初始化
        if not os.path.exists(self.config_path):
            # 写入初始配置
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(DEFAULT_CONFIG, f, ensure_ascii=False, indent=2)

    def load_config(self):
        """加载配置文件"""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return DEFAULT_CONFIG.copy()

    def save_config(self, config):
        """保存配置文件"""
        # 确保目录存在
        os.makedirs(os.path.dirname(self.config_path), exist_ok=True)

        with open(self.config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
