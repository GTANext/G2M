import { ref, reactive } from 'vue';
import type {
  GameInfo,
  GameDetectionResult,
  ApiResponse,
  AddGameFormData,
  LoadingState
} from '@/types';

// 定义 invoke 函数的类型接口
type InvokeFunction = <T = any>(command: string, params?: any) => Promise<T>;

// 动态导入 Tauri API
let invoke: InvokeFunction | null = null;
let isTauriEnvironment: boolean | null = null;

// 检查是否在 Tauri 环境中
function checkTauriEnvironment(): boolean {
  if (isTauriEnvironment !== null) {
    return isTauriEnvironment;
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

    isTauriEnvironment = Boolean(hasTauri);
    console.log('Tauri 环境检测结果:', {
      hasWindow,
      hasTauri: Boolean((window as any).__TAURI__),
      hasTauriInternals: Boolean((window as any).__TAURI_INTERNALS__),
      userAgent: navigator?.userAgent,
      isTauriEnvironment
    });

    return isTauriEnvironment;
  } catch (error) {
    console.error('检测 Tauri 环境时出错:', error);
    isTauriEnvironment = false;
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
    game_type: "gta3"
  },
  {
    id: 2,
    name: "Grand Theft Auto: Vice City",
    dir: "C:\\Games\\GTAVC",
    exe: "gta-vc.exe",
    img: "/images/gtavc.jpg",
    time: "2024-01-16T14:20:00.000Z",
    game_type: "gtavc"
  },
  {
    id: 3,
    name: "Grand Theft Auto: San Andreas",
    dir: "C:\\Games\\GTASA",
    exe: "gta_sa.exe",
    img: "/images/gtasa.jpg",
    time: "2024-01-17T09:15:00.000Z",
    game_type: "gtasa"
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
        executable: 'gtasa.exe',
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
      game_type: params.game_type
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
  }
};

async function getInvoke(): Promise<InvokeFunction> {
  if (!invoke) {
    try {
      // 检查是否在 Tauri 环境中
      if (!checkTauriEnvironment()) {
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

export function useGameApi() {
  // 加载状态管理
  const loadingState = reactive<LoadingState>({
    loading: false,
    error: null
  });

  // 游戏列表
  const games = ref<GameInfo[]>([]);

  // 设置加载状态
  const setLoading = (loading: boolean, error: any = null) => {
    loadingState.loading = loading;
    loadingState.error = error;
  };

  // 选择游戏文件夹
  const selectGameFolder = async (): Promise<string | null> => {
    try {
      setLoading(true);
      const invokeFunc = await getInvoke();
      const response = await invokeFunc<ApiResponse<string>>('select_game_folder');

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || '选择文件夹失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '选择文件夹时发生未知错误';
      setLoading(false, { message: errorMessage });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 检测游戏
  const detectGame = async (path: string): Promise<GameDetectionResult> => {
    try {
      setLoading(true);
      const invokeFunc = await getInvoke();
      const result = await invokeFunc<GameDetectionResult>('detect_game', { path });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '检测游戏时发生未知错误';
      setLoading(false, { message: errorMessage });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 保存游戏
  const saveGame = async (gameData: AddGameFormData): Promise<void> => {
    try {
      setLoading(true);
      const invokeFunc = await getInvoke();
      const response = await invokeFunc<ApiResponse<void>>('save_game', {
        name: gameData.name,
        dir: gameData.dir,
        exe: gameData.exe,
        img: gameData.img || null,
        game_type: gameData.game_type || null
      });

      if (!response.success) {
        throw new Error(response.error || '保存游戏失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存游戏时发生未知错误';
      setLoading(false, { message: errorMessage });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 获取游戏列表
  const getGames = async (): Promise<GameInfo[]> => {
    try {
      setLoading(true);
      const invokeFunc = await getInvoke();
      const response = await invokeFunc<ApiResponse<GameInfo[]>>('get_games');

      if (response.success && response.data) {
        games.value = response.data;
        return response.data;
      } else {
        throw new Error(response.error || '获取游戏列表失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取游戏列表时发生未知错误';
      setLoading(false, { message: errorMessage });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 刷新游戏列表
  const refreshGames = async (): Promise<void> => {
    await getGames();
  };

  // 根据ID获取游戏信息
  const getGameById = async (id: number): Promise<ApiResponse<GameInfo>> => {
    try {
      setLoading(true);
      const invokeFunc = await getInvoke();
      const response = await invokeFunc<ApiResponse<GameInfo>>('get_game_by_id', { id });
      return response;
    } catch (error) {
      console.error('获取游戏信息失败:', error);
      setLoading(false, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取游戏信息失败'
      };
    } finally {
      setLoading(false);
    }
  };

  // 更新游戏信息
  const updateGame = async (id: number, gameData: AddGameFormData): Promise<ApiResponse<void>> => {
    try {
      setLoading(true);
      const invokeFunc = await getInvoke();
      const response = await invokeFunc<ApiResponse<void>>('update_game', {
        id,
        name: gameData.name,
        dir: gameData.dir,
        exe: gameData.exe,
        img: gameData.img || null,
        game_type: gameData.game_type || null
      });
      return response;
    } catch (error) {
      console.error('更新游戏失败:', error);
      setLoading(false, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新游戏失败'
      };
    } finally {
      setLoading(false);
    }
  };

  // 检查重复目录
  const checkDuplicateDirectory = async (dir: string): Promise<ApiResponse<boolean>> => {
    try {
      setLoading(true);
      const invokeFunc = await getInvoke();
      const response = await invokeFunc<ApiResponse<boolean>>('check_duplicate_directory', { dir });
      return response;
    } catch (error) {
      console.error('检查重复目录失败:', error);
      setLoading(false, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '检查重复目录失败'
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    // 状态
    loadingState,
    games,

    // 方法
    selectGameFolder,
    detectGame,
    saveGame,
    getGames,
    refreshGames,
    getGameById,
    updateGame,
    checkDuplicateDirectory,
    setLoading
  };
}