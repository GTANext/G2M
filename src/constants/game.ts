// 游戏类型常量 - 移除所有类型定义
export const GAME_TYPES = {
  GTA3: 'gta3',
  GTAVC: 'gtavc',
  GTASA: 'gtasa',
  UNKNOWN: 'unknown',
  OTHER: 'other'
} as const;

// @ts-ignore - 忽略类型检查
export const GAME_TYPE_NAMES: any = {
  gta3: 'GTA III',
  gtavc: 'GTA Vice City',
  gtasa: 'GTA San Andreas',
  unknown: '未知游戏',
  other: '其他'
};

// @ts-ignore - 忽略类型检查
export const GAME_IMAGES: any = {
  gta3: '/images/gta3.jpg',
  gtavc: '/images/gtavc.jpg',
  gtasa: '/images/gtasa.jpg',
  unknown: '/images/null.svg'
};

// @ts-ignore - 忽略类型检查
export const EXECUTABLE_PATTERNS: any = {
  gta3: ['gta3.exe', 'gta-iii.exe'],
  gtavc: ['gta-vc.exe', 'gtavc.exe', 'vice.exe'],
  gtasa: ['gta_sa.exe', 'gtasa.exe', 'san.exe']
};
export const DEFAULT_GAME_IMAGE = '/images/null.svg'