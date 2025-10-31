import { ref, computed, onMounted } from 'vue';
import { useGameApi } from '@/composables/api/useGameApi';
import { isTauriEnvironment } from '@/utils/tauri';

export function useGameList() {
  const gameApi = useGameApi();
  
  // 游戏列表
  const games = ref([]);
  
  // 加载状态
  const isLoading = computed(() => gameApi.loadingState.loading);
  const error = computed(() => gameApi.loadingState.error);
  
  // 获取游戏列表
  const fetchGames = async () => {
    try {
      const gameList = await gameApi.getGames();
      games.value = gameList || [];
    } catch (error) {
      console.error('获取游戏列表失败:', error);
    }
  };
  
  // 刷新游戏列表
  const refreshGames = async () => {
    await fetchGames();
  };
  
  // 启动游戏
  const launchGame = async (game: any) => {
    try {
      const response = await gameApi.launchGame(game.dir, game.exe);
      if (!response.success) {
        throw new Error(response.error || '启动游戏失败');
      }
    } catch (error) {
      console.error('启动游戏失败:', error);
      throw error;
    }
  };
  
  // 打开游戏文件夹
  const openGameFolder = async (game: any) => {
    try {
      const response = await gameApi.openGameFolder(game.dir);
      if (!response.success) {
        throw new Error(response.error || '打开游戏文件夹失败');
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
    openGameFolder
  };
}