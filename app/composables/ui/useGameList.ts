/**
 * 游戏列表 Composable
 * 提供游戏列表相关的状态管理和操作
 */

import { useGameApi } from '~/composables/api/useGameApi';
import { useMessage } from '~/composables/ui/useMessage';
import { isTauriEnvironment } from '~/utils/tauri';
import { isResponseSuccess, getResponseError } from '~/utils/response';
import type { GameInfo } from '~/types';

/**
 * 游戏列表 Composable
 */
export function useGameList() {
  const gameApi = useGameApi();
  const { showError } = useMessage();

  // 游戏列表
  const games = computed(() => gameApi.games.value);

  // 加载状态
  const isLoading = computed(() => gameApi.loadingState.loading);
  const error = computed(() => gameApi.loadingState.error);

  /**
   * 获取游戏列表
   */
  const fetchGames = async (): Promise<void> => {
    try {
      await gameApi.getGames();
    } catch (error) {
      console.error('获取游戏列表失败:', error);
      // 错误已在 gameApi 中处理
    }
  };

  /**
   * 刷新游戏列表
   */
  const refreshGames = async (): Promise<void> => {
    await fetchGames();
  };

  /**
   * 启动游戏
   */
  const launchGame = async (game: GameInfo): Promise<void> => {
    try {
      const response = await gameApi.launchGame(game.dir, game.exe);
      if (!isResponseSuccess(response)) {
        const errorMsg = getResponseError(response, '启动游戏失败');
        showError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('启动游戏失败:', error);
      throw error;
    }
  };

  /**
   * 打开游戏文件夹
   */
  const openGameFolder = async (game: GameInfo): Promise<void> => {
    try {
      const response = await gameApi.openGameFolder(game.dir);
      if (!isResponseSuccess(response)) {
        const errorMsg = getResponseError(response, '打开游戏文件夹失败');
        showError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('打开游戏文件夹失败:', error);
      throw error;
    }
  };

  // 组件挂载时获取游戏列表
  onMounted(() => {
    if (isTauriEnvironment()) {
      fetchGames();
    }
  });

  return {
    games,
    isLoading,
    error,
    fetchGames,
    refreshGames,
    launchGame,
    openGameFolder,
  };
}