import os

ui_path = 'assets/ui/'
config_path = 'assets/bocchi/'

BASE_CONFIG = {
    "title": "GTANext ModLoader",
    "version": "test_0.0.1",
    "author": "鼠子Tomoriゞ",
    "url": "https://github.com/GTANext/ModLoader",
    "description": "GTANext ModLoader",
    "license": "MIT",
    "webview": {
        "title": "[测试版] GTANext ModLoader丨Powered by 鼠子Tomoriゞ",
        "width": 1280,
        "height": 720,
        "html": ui_path + "index.html",
        "devTitle": "GTANext ModLoader丨DEV MODE",
        "devUrl": "http://localhost:8000"
    }
}

# 配置文件路径
CONFIG_FILE_PATH = config_path + 'config.json'
GAME_LIST_FILE_PATH = config_path + 'gamelist.json'

# 默认配置
DEFAULT_CONFIG = {
    "name": "GTANext ModLoader",
    "author": "鼠子Tomoriゞ"
}

# 默认游戏列表
DEFAULT_GAME_LIST = {
    "games": []
}

# 游戏类型对应的默认名称
GAME_TYPE_NAMES = {
    'GTA3': 'GTA III',
    'GTAVC': 'GTA Vice City',
    'GTASA': 'GTA San Andreas'
}

# 游戏类型对应的默认可执行文件
GAME_EXECUTABLES = {
    'GTA3': 'gta3.exe',
    'GTAVC': 'gta-vc.exe',
    'GTASA': 'gta-sa.exe'
}