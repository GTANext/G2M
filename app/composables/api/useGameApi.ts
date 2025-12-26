/**
 * 游戏 API Composable
 * 提供游戏相关的 API 调用封装
 */

import { callApi } from '~/utils/api';
import { toNumericId } from '~/utils/id';
import { getResponseData } from '~/utils/response';
import { useMessage } from '~/composables/ui/useMessage';
import type {
  ApiResponse,
  GameInfo,
  GameDetectionResult,
  SaveGameRequest,
  UpdateGameRequest,
} from '~/types';

/**
 * 加载状态接口
 */
export interface LoadingState {
  loading: boolean;
  error: string | null;
}

/**
 * 游戏 API Composable
 */
export function useGameApi() {
  const { showError } = useMessage();

  // 加载状态
  const loadingState = reactive<LoadingState>({
    loading: false,
    error: null,
  });

  // 游戏列表
  const games = ref<GameInfo[]>([]);

  /**
   * 执行 API 调用并更新加载状态
   */
  async function executeApiCall<T>(
    apiCall: () => Promise<ApiResponse<T>>,
    errorMessage: string
  ): Promise<ApiResponse<T>> {
    try {
      loadingState.loading = true;
      loadingState.error = null;
      return await apiCall();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : errorMessage;
      loadingState.error = errorMsg;
      showError(errorMessage);
      throw error;
    } finally {
      loadingState.loading = false;
    }
  }

  /**
   * 获取游戏列表
   */
  const getGames = async (): Promise<ApiResponse<GameInfo[]>> => {
    return executeApiCall(async () => {
      const response = await callApi<GameInfo[]>('get_games');
      if (response.success && response.data) {
        games.value = response.data;
      } else {
        loadingState.error = response.error || '获取游戏列表失败';
      }
      return response;
    }, '获取游戏列表失败');
  };

  /**
   * 根据 ID 获取游戏
   */
  const getGameById = async (id: unknown): Promise<ApiResponse<GameInfo>> => {
    try {
      const numericId = toNumericId(id);
      return await callApi<GameInfo>('get_game_by_id', { id: numericId });
    } catch (error) {
      showError('获取游戏信息失败');
      throw error;
    }
  };

  /**
   * 保存游戏
   */
  const saveGame = async (gameData: SaveGameRequest): Promise<ApiResponse<void>> => {
    return executeApiCall(
      () => callApi<void>('save_game', gameData),
      '保存游戏失败'
    );
  };

  /**
   * 更新游戏
   */
  const updateGame = async (gameData: UpdateGameRequest): Promise<ApiResponse<void>> => {
    try {
      const numericId = toNumericId(gameData.id);
      const payload = { ...gameData, id: numericId };
      return await executeApiCall(
        () => callApi<void>('update_game', payload),
        '更新游戏失败'
      );
    } catch (error) {
      showError('更新游戏失败');
      throw error;
    }
  };

  /**
   * 删除游戏
   */
  const deleteGame = async (id: unknown): Promise<ApiResponse<void>> => {
    try {
      const numericId = toNumericId(id);
      return await executeApiCall(
        () => callApi<void>('delete_game', { id: numericId }),
        '删除游戏失败'
      );
    } catch (error) {
      showError('删除游戏失败');
      throw error;
    }
  };

  /**
   * 启动游戏
   */
  const launchGame = async (
    gameDir: string,
    executable: string
  ): Promise<ApiResponse<void>> => {
    // 不在 API 层显示错误，让上层处理
    return await callApi<void>('launch_game', { gameDir, executable }, { silent: true });
  };

  /**
   * 打开游戏文件夹
   */
  const openGameFolder = async (gameDir: string): Promise<ApiResponse<void>> => {
    return executeApiCall(
      () => callApi<void>('open_game_folder', { gameDir }),
      '打开游戏文件夹失败'
    );
  };

  /**
   * 选择游戏文件夹
   */
  const selectGameFolder = async (): Promise<ApiResponse<string>> => {
    return executeApiCall(
      () => callApi<string>('select_game_folder'),
      '选择游戏文件夹失败'
    );
  };

  /**
   * 检测游戏
   */
  const detectGame = async (folderPath: string): Promise<ApiResponse<GameDetectionResult>> => {
    return executeApiCall(
      () => callApi<GameDetectionResult>('detect_game', { path: folderPath }),
      '检测游戏失败'
    );
  };

  /**
   * 检查重复目录
   */
  const checkDuplicateDirectory = async (
    dir: string,
    excludeGameId?: number
  ): Promise<ApiResponse<boolean>> => {
    return executeApiCall(
      () =>
        callApi<boolean>('check_duplicate_directory', {
          dir,
          excludeGameId: excludeGameId ?? null,
        }),
      '检查重复目录失败'
    );
  };

  return {
    // 状态
    loadingState,
    games,

    // 方法
    getGames,
    getGameById,
    saveGame,
    updateGame,
    deleteGame,
    launchGame,
    openGameFolder,
    selectGameFolder,
    detectGame,
    checkDuplicateDirectory,
  };
}
