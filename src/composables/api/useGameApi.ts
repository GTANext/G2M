import { ref } from 'vue';
import { tauriInvoke } from '@/utils/tauri';
import { useMessage } from '@/composables/ui/useMessage';

export function useGameApi() {
  const { showError } = useMessage();
  // 加载状态 - 使用 any 类型
  const loadingState: any = ref({ loading: false, error: null });
  
  // 游戏列表 - 使用 any 类型
  const games: any = ref([]);

  // 获取游戏列表
  const getGames = async (): Promise<any> => {
    try {
      loadingState.value.loading = true;
      loadingState.value.error = null;
      
      const response: any = await tauriInvoke('get_games');
      
      if (response?.success && response?.data) {
        games.value = response.data;
      } else {
        loadingState.value.error = response?.error || '获取游戏列表失败';
      }
      
      return response;
    } catch (error) {
      showError('获取游戏列表失败');
      loadingState.value.error = '获取游戏列表失败';
      throw error;
    } finally {
      loadingState.value.loading = false;
    }
  };

  // 根据ID获取游戏
  const getGameById = async (id: any): Promise<any> => {
    try {
      const response: any = await tauriInvoke('get_game_by_id', { id });
      return response;
    } catch (error) {
      showError('获取游戏信息失败');
      throw error;
    }
  };

  // 保存游戏
  const saveGame = async (gameData: any): Promise<any> => {
    try {
      const response: any = await tauriInvoke('save_game', gameData);
      return response;
    } catch (error) {
      showError('保存游戏失败');
      throw error;
    }
  };

  // 更新游戏
  const updateGame = async (
    id: any,
    name: any,
    dir: any,
    exe: any,
    img: any,
    type: any,
    deleted: any
  ): Promise<any> => {
    try {
      const response: any = await tauriInvoke('update_game', {
        id,
        name,
        dir,
        exe,
        img,
        type,
        deleted
      });
      return response;
    } catch (error) {
      showError('更新游戏失败');
      throw error;
    }
  };

  // 删除游戏
  const deleteGame = async (id: any): Promise<any> => {
    try {
      const response: any = await tauriInvoke('delete_game', { id });
      return response;
    } catch (error) {
      showError('删除游戏失败');
      throw error;
    }
  };

  // 启动游戏
  const launchGame = async (gameDir: string, executable: string): Promise<any> => {
    try {
      const response: any = await tauriInvoke('launch_game', { 
        gameDir: gameDir, 
        executable: executable 
      });
      return response;
    } catch (error) {
      // 不在 API 层显示错误，让上层处理
      throw error;
    }
  };

  // 打开游戏文件夹
  const openGameFolder = async (dir: any): Promise<any> => {
    try {
      const response: any = await tauriInvoke('open_game_folder', { gameDir: dir });
      return response;
    } catch (error) {
      showError('打开游戏文件夹失败');
      throw error;
    }
  };

  // 选择游戏文件夹
  const selectGameFolder = async (): Promise<any> => {
    try {
      const response: any = await tauriInvoke('select_game_folder');
      return response;
    } catch (error) {
      showError('选择游戏文件夹失败');
      throw error;
    }
  };

  // 检测游戏
  const detectGame = async (folderPath: any): Promise<any> => {
    try {
      const response: any = await tauriInvoke('detect_game', { path: folderPath });
      return response;
    } catch (error) {
      showError('检测游戏失败');
      throw error;
    }
  };

  // 检查重复目录
  const checkDuplicateDirectory = async (dir: any, excludeGameId?: number): Promise<any> => {
    try {
      const response: any = await tauriInvoke('check_duplicate_directory', { 
        dir,
        excludeGameId: excludeGameId || null
      });
      return response;
    } catch (error) {
      showError('检查重复目录失败');
      throw error;
    }
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
    checkDuplicateDirectory
  };
}