/**
 * 游戏相关的工具函数
 * 包括游戏类型名称、颜色、图标等
 */

// 游戏类型名称映射
const GAME_TYPE_NAMES: Record<string, string> = {
  'gta3': 'GTA III',
  'GTA3': 'GTA III',
  'gtavc': 'GTA Vice City',
  'GTAVC': 'GTA Vice City',
  'gtasa': 'GTA San Andreas',
  'GTASA': 'GTA San Andreas',
  'other': '其他'
};

// 游戏类型颜色映射
const GAME_TYPE_COLORS: Record<string, string> = {
  'gta3': '#108ee9',
  'GTA3': '#108ee9',
  'gtavc': '#ff6b9d',
  'GTAVC': '#ff6b9d',
  'gtasa': '#52c41a',
  'GTASA': '#52c41a',
  'other': '#999999'
};

// 游戏图标映射
const GAME_ICONS: Record<string, string> = {
  'gta3': '/images/gta3.jpg',
  'GTA3': '/images/gta3.jpg',
  'gtavc': '/images/gtavc.jpg',
  'GTAVC': '/images/gtavc.jpg',
  'gtasa': '/images/gtasa.jpg',
  'GTASA': '/images/gtasa.jpg'
};

/**
 * 获取游戏类型名称
 */
export function getGameTypeName(gameType: string | null | undefined): string {
  if (!gameType) return '未知游戏';
  return GAME_TYPE_NAMES[gameType] || GAME_TYPE_NAMES[gameType.toLowerCase()] || '未知游戏';
}

/**
 * 获取游戏类型颜色
 */
export function getGameTypeColor(gameType: string | null | undefined): string {
  if (!gameType) return '#999999';
  return GAME_TYPE_COLORS[gameType] || GAME_TYPE_COLORS[gameType.toLowerCase()] || '#999999';
}

/**
 * 获取游戏图标
 */
export function getGameIcon(game: { type?: string; img?: string } | null | undefined): string {
  if (!game) return '/images/null.svg';
  
  // 优先使用自定义图片
  if (game.img) {
    return game.img;
  }
  
  // 根据游戏类型返回默认图标
  const gameType = game.type;
  if (gameType) {
    return GAME_ICONS[gameType] || GAME_ICONS[gameType.toLowerCase()] || '/images/null.svg';
  }
  
  return '/images/null.svg';
}

/**
 * 处理图片加载错误
 */
export function handleImageError(event: Event): void {
  const target = event.target as HTMLImageElement;
  if (target) {
    target.src = '/images/null.svg';
  }
}

/**
 * 游戏工具函数 composable
 */
export function useGameUtils() {
  return {
    getGameTypeName,
    getGameTypeColor,
    getGameIcon,
    handleImageError
  };
}

