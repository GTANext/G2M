// 游戏信息接口
export interface GameInfo {
  id: number;
  name: string;
  time: string; // ISO 8601 格式的添加时间
  dir: string;  // 游戏目录路径
  exe: string;  // 启动程序文件名
  img?: string; // 游戏图片
  game_type?: 'gta3' | 'gtavc' | 'gtasa'; // 游戏类型
}

// 游戏检测结果接口
export interface GameDetectionResult {
  success: boolean;
  game_type?: 'gta3' | 'gtavc' | 'gtasa';
  executable?: string;
  game_name?: string;
  error?: string;
}

// 游戏类型枚举
export enum GameType {
  GTA3 = 'gta3',
  GTAVC = 'gtavc',
  GTASA = 'gtasa'
}

// 游戏类型映射
export const GAME_TYPE_MAP = {
  [GameType.GTA3]: {
    name: 'Grand Theft Auto III',
    executable: 'gta3.exe'
  },
  [GameType.GTAVC]: {
    name: 'Grand Theft Auto: Vice City',
    executable: 'gta-vc.exe'
  },
  [GameType.GTASA]: {
    name: 'Grand Theft Auto: San Andreas',
    executable: 'gtasa.exe'
  }
} as const;

// 添加游戏表单数据接口
export interface AddGameFormData {
  name: string;
  dir: string;
  exe: string;
  img?: string;
  game_type?: 'gta3' | 'gtavc' | 'gtasa';
}

// 表单验证规则接口
export interface FormValidationRules {
  name: Array<{
    required?: boolean;
    message: string;
    trigger?: string;
  }>;
  dir: Array<{
    required?: boolean;
    message: string;
    trigger?: string;
  }>;
  exe: Array<{
    required?: boolean;
    message: string;
    trigger?: string;
  }>;
}