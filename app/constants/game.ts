// 游戏类型常量
export const GAME_TYPES = {
  GTA3: 'gta3',
  GTAVC: 'gtavc',
  GTASA: 'gtasa',
  UNKNOWN: 'unknown',
  OTHER: 'other'
} as const;

// 游戏类型名称映射
export const GAME_TYPE_NAMES: any = {
  gta3: 'GTA III',
  gtavc: 'GTA Vice City',
  gtasa: 'GTA San Andreas',
  unknown: '未知游戏',
  other: '其他'
};

// 游戏图片映射
export const GAME_IMAGES: any = {
  gta3: '/images/gta3.jpg',
  gtavc: '/images/gtavc.jpg',
  gtasa: '/images/gtasa.jpg',
  unknown: '/images/null.svg'
};

// 可执行文件模式
export const EXECUTABLE_PATTERNS: any = {
  gta3: ['gta3.exe', 'gta-iii.exe'],
  gtavc: ['gta-vc.exe', 'gtavc.exe', 'vice.exe'],
  gtasa: ['gta_sa.exe', 'gtasa.exe', 'san.exe']
};

// 默认游戏图片
export const DEFAULT_GAME_IMAGE = '/images/null.svg'

