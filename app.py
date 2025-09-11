import os
import configparser

class GTANext:
    def __init__(self):
        self.config = configparser.ConfigParser()
        self.config.read('assets/config.ini')
        self.directory = self.config.get('Settings', 'directory', fallback='')

    @staticmethod
    def example_method(param: str) -> str:
        """静态方法 不访问实例属性"""
        return f"Processed: {param}"

    # 实例方法 需要访问self
    def get_config_value(self, section, key):
        return self.config.get(section, key, fallback=None)