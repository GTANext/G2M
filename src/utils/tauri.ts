import type {
  GameInfo,
  GameDetectionResult,
  ApiResponse,
  ModLoaderStatus,
  ModInstallRequest,
  ModInstallResult
} from '@/types';

// 定义 invoke 函数的类型接口
type InvokeFunction = <T = any>(command: string, params?: any) => Promise<T>;

// 动态导入 Tauri API
let invoke: InvokeFunction | null = null;
let isTauriEnvironmentCache: boolean | null = null;

// 检查是否在 Tauri 环境中
export function isTauriEnvironment(): boolean {
  if (isTauriEnvironmentCache !== null) {
    return isTauriEnvironmentCache;
  }

  try {
    // 多重检查 Tauri 环境
    const hasWindow = typeof window !== 'undefined';
    const hasTauri = hasWindow && (
      // 检查 __TAURI__ 全局对象
      (window as any).__TAURI__ ||
      // 检查 __TAURI_INTERNALS__ 
      (window as any).__TAURI_INTERNALS__ ||
      // 检查 Tauri 特有的用户代理
      (navigator && navigator.userAgent && navigator.userAgent.includes('Tauri'))
    );

    isTauriEnvironmentCache = Boolean(hasTauri);
    console.log('Tauri 环境检测结果:', {
      hasWindow,
      hasTauri: Boolean((window as any).__TAURI__),
      hasTauriInternals: Boolean((window as any).__TAURI_INTERNALS__),
      userAgent: navigator?.userAgent,
      isTauriEnvironment: isTauriEnvironmentCache
    });

    return isTauriEnvironmentCache;
  } catch (error) {
    console.error('检测 Tauri 环境时出错:', error);
    isTauriEnvironmentCache = false;
    return false;
  }
}

// Mock 数据用于开发环境
const mockGames: GameInfo[] = [
  {
    id: 1,
    name: "Grand Theft Auto III",
    dir: "C:\\Games\\GTA3",
    exe: "gta3.exe",
    img: "/images/gta3.jpg",
    time: "2024-01-15T10:30:00.000Z",
    type: "gta3"
  },
  {
    id: 2,
    name: "Grand Theft Auto: Vice City",
    dir: "C:\\Games\\GTAVC",
    exe: "gta-vc.exe",
    img: "/images/gtavc.jpg",
    time: "2024-01-16T14:20:00.000Z",
    type: "gtavc"
  },
  {
    id: 3,
    name: "Grand Theft Auto: San Andreas",
    dir: "C:\\Games\\GTASA",
    exe: "gta_sa.exe",
    img: "/images/gtasa.jpg",
    time: "2024-01-17T09:15:00.000Z",
    type: "gtasa"
  }
];

// Mock API 函数
const mockApi = {
  select_game_folder: async (): Promise<ApiResponse<string>> => {
    await new Promise(resolve => setTimeout(resolve, 500)); // 模拟延迟
    return { success: true, data: "C:\\Games\\NewGame" };
  },

  detect_game: async (params: { path: string }): Promise<GameDetectionResult> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 模拟游戏检测逻辑
    const pathLower = params.path.toLowerCase();
    if (pathLower.includes('gta3')) {
      return {
        success: true,
        game_type: 'gta3',
        executable: 'gta3.exe',
        game_name: 'Grand Theft Auto III'
      };
    } else if (pathLower.includes('vice') || pathLower.includes('vc')) {
      return {
        success: true,
        game_type: 'gtavc',
        executable: 'gta-vc.exe',
        game_name: 'Grand Theft Auto: Vice City'
      };
    } else if (pathLower.includes('san') || pathLower.includes('sa')) {
      return {
        success: true,
        game_type: 'gtasa',
        executable: 'gta_sa.exe',
        game_name: 'Grand Theft Auto: San Andreas'
      };
    } else {
      return {
        success: false,
        error: '未检测到支持的游戏类型'
      };
    }
  },

  save_game: async (params: any): Promise<ApiResponse<void>> => {
    await new Promise(resolve => setTimeout(resolve, 300));

    // 检查是否已存在相同目录的游戏
    const isDuplicate = mockGames.some(game => game.dir === params.dir);
    if (isDuplicate) {
      const existingGame = mockGames.find(game => game.dir === params.dir);
      return {
        success: false,
        error: `游戏目录已存在！已有游戏 "${existingGame?.name}" 使用了相同的目录路径：${params.dir}`
      };
    }

    const newGame: GameInfo = {
      id: mockGames.length + 1,
      name: params.name,
      dir: params.dir,
      exe: params.exe,
      img: params.img,
      time: new Date().toISOString(),
      type: params.type
    };
    mockGames.push(newGame);
    return { success: true };
  },

  get_games: async (): Promise<ApiResponse<GameInfo[]>> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { success: true, data: [...mockGames] };
  },

  get_game_by_id: async (params: { id: number }): Promise<ApiResponse<GameInfo>> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const game = mockGames.find(g => g.id === params.id);
    if (game) {
      return { success: true, data: game };
    } else {
      return { success: false, error: "游戏未找到" };
    }
  },

  update_game: async (params: any): Promise<ApiResponse<void>> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockGames.findIndex(g => g.id === params.id);
    if (index !== -1) {
      mockGames[index] = { ...mockGames[index], ...params };
      return { success: true };
    } else {
      return { success: false, error: "游戏未找到" };
    }
  },

  check_duplicate_directory: async (params: { dir: string }): Promise<ApiResponse<boolean>> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const isDuplicate = mockGames.some(game => game.dir === params.dir);
    if (isDuplicate) {
      const existingGame = mockGames.find(game => game.dir === params.dir);
      return {
        success: false,
        error: `游戏目录已存在！已有游戏 "${existingGame?.name}" 使用了相同的目录路径：${params.dir}`
      };
    }
    return { success: true, data: false };
  },

  open_game_folder: async (params: { gameDir: string }): Promise<ApiResponse<void>> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log(`模拟打开游戏文件夹: ${params.gameDir}`);
    return { success: true };
  },

  launch_game: async (params: { gameDir: string, executable: string }): Promise<ApiResponse<void>> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`模拟启动游戏: ${params.gameDir}\\${params.executable}`);
    return { success: true };
  },

  delete_game: async (params: { id: number }): Promise<ApiResponse<void>> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockGames.findIndex(g => g.id === params.id);
    if (index !== -1) {
      mockGames.splice(index, 1);
      console.log(`模拟删除游戏: ID ${params.id}`);
      return { success: true };
    } else {
      return { success: false, error: "游戏未找到" };
    }
  },

  check_mod_loaders: async (params: { gameDir: string; gameType?: string | null }): Promise<ApiResponse<ModLoaderStatus>> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log(`模拟检查 MOD 加载器: ${params.gameDir}, 游戏类型: ${params.gameType}`);
    
    // 模拟不同的检查结果
    const mockStatus: ModLoaderStatus = {
      has_dinput8: Math.random() > 0.5,
      has_modloader: Math.random() > 0.5,
      has_cleo: Math.random() > 0.5,
      has_cleo_redux: Math.random() > 0.7,
      missing_loaders: [],
      found_loaders: []
    };

    // 根据检查结果填充数组
    if (mockStatus.has_dinput8) {
      mockStatus.found_loaders.push('dinput8.dll (游戏根目录)');
    } else {
      mockStatus.missing_loaders.push('dinput8.dll');
    }

    if (mockStatus.has_modloader) {
      mockStatus.found_loaders.push('ModLoader (plugins目录)');
    } else {
      mockStatus.missing_loaders.push('ModLoader');
    }

    if (mockStatus.has_cleo) {
      const cleoFile = params.gameType === 'gta3' ? 'III.CLEO.asi' : 
                      params.gameType === 'gtavc' ? 'VC.CLEO.asi' : 
                      'CLEO.asi';
      mockStatus.found_loaders.push(`CLEO (plugins目录/${cleoFile})`);
    } else {
      mockStatus.missing_loaders.push('CLEO');
    }

    if (mockStatus.has_cleo_redux) {
      mockStatus.found_loaders.push('CLEO Redux (plugins目录)');
    } else {
      mockStatus.missing_loaders.push('CLEO Redux');
    }

    return { success: true, data: mockStatus };
  },

  install_mod_prerequisites: async (params: { request: ModInstallRequest }): Promise<ApiResponse<ModInstallResult>> => {
    const request = params.request;
    console.log('Mock: Installing MOD prerequisites for', request);
    
    // 模拟安装过程
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockResult: ModInstallResult = {
      installed_files: [
        'dinput8.dll',
        'plugins/cleo.asi',
        'plugins/modloader.asi',
        'plugins/cleo_redux.asi',
        'CLEO/CLEO_SDK.dll',
        'scripts/example.cs'
      ],
      created_directories: [
        'plugins',
        'CLEO',
        'scripts',
        'modloader'
      ]
    };
    
    return { success: true, data: mockResult };
  }
};

// 获取 invoke 函数
async function getInvoke(): Promise<InvokeFunction> {
  if (!invoke) {
    try {
      // 检查是否在 Tauri 环境中
      if (!isTauriEnvironment()) {
        console.warn('不在 Tauri 环境中，使用 Mock API 进行开发');
        // 在非 Tauri 环境中，返回 mock API
        invoke = async <T = any>(command: string, params?: any): Promise<T> => {
          console.log(`Mock API 调用: ${command}`, params);
          if (mockApi[command as keyof typeof mockApi]) {
            return await (mockApi[command as keyof typeof mockApi] as any)(params);
          } else {
            throw new Error(`未知的 API 命令: ${command}`);
          }
        };
        return invoke;
      }

      const tauriCore = await import('@tauri-apps/api/core');
      invoke = tauriCore.invoke as InvokeFunction;

      if (!invoke) {
        throw new Error('invoke 函数未定义');
      }

      console.log('Tauri API 导入成功');
    } catch (error) {
      console.error('Failed to import Tauri API:', error);
      // 如果 Tauri API 导入失败，也使用 mock API
      console.warn('Tauri API 导入失败，使用 Mock API');
      invoke = async <T = any>(command: string, params?: any): Promise<T> => {
        console.log(`Mock API 调用 (fallback): ${command}`, params);
        if (mockApi[command as keyof typeof mockApi]) {
          return await (mockApi[command as keyof typeof mockApi] as any)(params);
        } else {
          throw new Error(`未知的 API 命令: ${command}`);
        }
      };
    }
  }
  return invoke;
}

// 统一的 Tauri 调用接口
export async function tauriInvoke<T>(command: string, params?: any): Promise<T> {
  const invokeFunc = await getInvoke();
  return invokeFunc<T>(command, params);
}

// MOD 前置安装函数
export async function installModPrerequisites(request: ModInstallRequest): Promise<ApiResponse<ModInstallResult>> {
  return await tauriInvoke<ApiResponse<ModInstallResult>>('install_mod_prerequisites', { request });
}