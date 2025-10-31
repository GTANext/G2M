import {
  GAME_TYPES,
  GAME_TYPE_NAMES,
  GAME_IMAGES,
  EXECUTABLE_PATTERNS
} from '@/constants/game'

// @ts-ignore - 忽略类型检查
export function detectGameTypeFromExecutable(exe: string): any {
  if (!exe) return GAME_TYPES.UNKNOWN;
  
  const exeName = exe.toLowerCase();
  
  for (const [gameType, patterns] of Object.entries(EXECUTABLE_PATTERNS)) {
    if ((patterns as any).some((pattern: any) => exeName.includes(pattern.toLowerCase()))) {
      return gameType as any;
    }
  }
  
  return GAME_TYPES.UNKNOWN;
}

// @ts-ignore - 忽略类型检查
export function getGameTypeName(gameType: any): string {
  return (GAME_TYPE_NAMES as any)[gameType] || (GAME_TYPE_NAMES as any)[GAME_TYPES.UNKNOWN];
}

/**
 * 从游戏对象获取游戏类型
 */
// @ts-ignore - 忽略类型检查
export function getGameTypeFromGame(game: any): any {
  // 如果游戏对象有 type 字段，直接返回
  if (game?.type) {
    return game.type as any;
  }
  
  // 否则从可执行文件名检测
  return detectGameTypeFromExecutable(game.exe);
}

/**
 * 获取游戏图片
 */
// @ts-ignore - 忽略类型检查
export function getGameImage(game: any): string {
  // 自定义图片
  if (game.img && game.img.startsWith('data:image')) {
    return game.img;
  }
  
  // 使用默认图片
  const gameType = getGameTypeFromGame(game);
  return (GAME_IMAGES as any)[gameType] || (GAME_IMAGES as any)[GAME_TYPES.UNKNOWN];
}

/**
 * 验证游戏目录是否有效
 */
export function isValidGameDirectory(dir: string): boolean {
  return !!(dir && dir.trim().length > 0)
}

/**
 * 验证可执行文件是否有效
 */
export function isValidExecutable(exe: string): boolean {
  return !!(exe && exe.trim().length > 0 && exe.toLowerCase().endsWith('.exe'))
}