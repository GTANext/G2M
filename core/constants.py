import os
from datetime import datetime

ui_path = 'assets/ui/'
config_path = 'assets/bocchi/'

BASE_CONFIG = {
    "title": "GTAModx Manager",
    "version": "dev",
    "author": "鼠子Tomoriゞ",
    "url": "https://github.com/GTANext/Manager",
    "description": "可视化安装 III.VC.SA Mod/Cleo",
    "license": "MIT"
}

BASE_CONFIG["webview"] = {
    "title": BASE_CONFIG["title"] + "丨Powered by 鼠子Tomoriゞ",
    "width": 1080,
    "height": 600,
    "html": ui_path + "index.html",
    "devTitle": BASE_CONFIG["title"] + "丨DEV MODE",
    "devUrl": "http://localhost:8000"
}

# 下载配置
DOWNLOAD_CONFIG = {
    'baseUrl': 'https://gtamodx-manager-r2.miomoe.cn/',
}

DOWNLOAD_CONFIG['game'] = {
    'url': DOWNLOAD_CONFIG['baseUrl'] + 'game/',
    'GTA3': 'Grand Theft Auto III.zip',
    'GTAVC': 'Grand Theft Auto Vice City.zip',
    'GTASA': 'Grand Theft Auto San Andreas.zip',
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

# 游戏状态
GAME_STATUS = {
    'ACTIVE': 'active',
    'DELETED': 'deleted'
}