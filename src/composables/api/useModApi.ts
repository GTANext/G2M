import { ref } from 'vue';
import { tauriInvoke } from '@/utils/tauri';
import { useMessage } from '@/composables/ui/useMessage';

export interface G2MModInfo {
  name: string;
  author?: string | null;
  mod_source_path: string;
}

export interface UserModInstallRequest {
  game_dir: string;
  mod_source_path: string;
  mod_name: string;
  overwrite?: boolean;
}

export interface UserModInstallResult {
  installed_files: string[];
  created_directories: string[];
}

export function useModApi() {
  const { showError, showSuccess } = useMessage();
  const loadingState = ref({ loading: false, error: null as string | null });

  /**
   * 获取游戏目录下的已安装MOD列表
   */
  const getGameMods = async (gameDir: string): Promise<G2MModInfo[]> => {
    try {
      loadingState.value.loading = true;
      loadingState.value.error = null;

      const response: any = await tauriInvoke('get_game_mods', { gameDir });

      if (response?.success && response?.data) {
        return response.data;
      } else {
        const errorMsg = response?.error || '获取MOD列表失败';
        const detailMsg = `游戏目录: ${gameDir}\n错误: ${errorMsg}`;
        loadingState.value.error = errorMsg;
        showError('获取MOD列表失败', { detail: detailMsg });
        return [];
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const detailMsg = `游戏目录: ${gameDir}\n错误: ${errorMsg}`;
      loadingState.value.error = errorMsg;
      showError('获取MOD列表失败', { detail: detailMsg });
      return [];
    } finally {
      loadingState.value.loading = false;
    }
  };

  /**
   * 安装用户MOD（自动识别文件进行安装）
   */
  const installUserMod = async (request: UserModInstallRequest): Promise<UserModInstallResult | null> => {
    try {
      loadingState.value.loading = true;
      loadingState.value.error = null;

      const response: any = await tauriInvoke('install_user_mod', { request });

      if (response?.success && response?.data) {
        showSuccess(`MOD "${request.mod_name}" 安装成功！`);
        return response.data;
      } else {
        const errorMsg = response?.error || '安装MOD失败';
        const detailMsg = `MOD名称: ${request.mod_name}\n源路径: ${request.mod_source_path}\n游戏目录: ${request.game_dir}\n错误: ${errorMsg}`;
        loadingState.value.error = errorMsg;
        showError('安装MOD失败', { detail: detailMsg });
        return null;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const detailMsg = `MOD名称: ${request.mod_name}\n源路径: ${request.mod_source_path}\n游戏目录: ${request.game_dir}\n错误: ${errorMsg}`;
      loadingState.value.error = errorMsg;
      showError('安装MOD失败', { detail: detailMsg });
      return null;
    } finally {
      loadingState.value.loading = false;
    }
  };

  /**
   * 选择MOD文件或文件夹
   */
  const selectModFiles = async (isDirectory: boolean = false): Promise<string | null> => {
    try {
      const response: any = await tauriInvoke('select_mod_files', {
        defaultDir: null,
        isDirectory
      });
      if (response?.success && response?.data && Array.isArray(response.data) && response.data.length > 0) {
        // 返回第一个选中的路径
        return response.data[0];
      } else {
        const errorMsg = response?.error || '未选择文件或文件夹';
        if (errorMsg !== '未选择文件或文件夹') {
          showError('选择MOD文件失败', { detail: `类型: ${isDirectory ? '文件夹' : '文件'}\n错误: ${errorMsg}` });
        }
        return null;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      showError('选择MOD文件失败', { detail: `类型: ${isDirectory ? '文件夹' : '文件'}\n错误: ${errorMsg}` });
      return null;
    }
  };

  return {
    loadingState,
    getGameMods,
    installUserMod,
    selectModFiles,
  };
}

