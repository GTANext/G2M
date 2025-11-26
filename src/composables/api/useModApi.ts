import { reactive } from 'vue';
import { tauriInvoke } from '@/utils/tauri';
import { useMessage } from '@/composables/ui/useMessage';

export interface G2MModInfo {
  id: number; // MOD唯一ID
  name: string;
  author?: string | null;
  type?: string | null; // 安装类型
  install_path?: string | null;
}

export interface UserModInstallRequest {
  game_dir: string;
  mod_source_path: string;
  mod_name: string;
  overwrite?: boolean;
  target_directory?: string; // 目标安装目录
}

export interface UserModInstallResult {
  installed_files: string[];
  created_directories: string[];
}

export function useModApi() {
  const { showError, showSuccess } = useMessage();
  const loadingState = reactive({
    loading: false,
    error: null as string | null
  });

  /**
   * 获取游戏目录下的已安装MOD列表
   */
  const getGameMods = async (gameDir: string): Promise<G2MModInfo[]> => {
    try {
      loadingState.loading = true;
      loadingState.error = null;

      const response: any = await tauriInvoke('get_game_mods', { gameDir });

      if (response?.success && response?.data) {
        return response.data;
      } else {
        const errorMsg = response?.error || '获取MOD列表失败';
        const detailMsg = `游戏目录: ${gameDir}\n错误: ${errorMsg}`;
        loadingState.error = errorMsg;
        showError('获取MOD列表失败', { detail: detailMsg });
        return [];
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const detailMsg = `游戏目录: ${gameDir}\n错误: ${errorMsg}`;
      loadingState.error = errorMsg;
      showError('获取MOD列表失败', { detail: detailMsg });
      return [];
    } finally {
      loadingState.loading = false;
    }
  };

  /**
   * 安装用户MOD（自动识别文件进行安装）
   */
  const installUserMod = async (request: UserModInstallRequest): Promise<UserModInstallResult | null> => {
    try {
      loadingState.loading = true;
      loadingState.error = null;

      const response: any = await tauriInvoke('install_user_mod', { request });

      if (response?.success && response?.data) {
        showSuccess(`MOD "${request.mod_name}" 安装成功！`);
        return response.data;
      } else {
        const errorMsg = response?.error || '安装MOD失败';
        const detailMsg = `MOD名称: ${request.mod_name}\n游戏目录: ${request.game_dir}\n错误: ${errorMsg}`;
        loadingState.error = errorMsg;
        showError('安装MOD失败', { detail: detailMsg });
        return null;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const detailMsg = `MOD名称: ${request.mod_name}\n游戏目录: ${request.game_dir}\n错误: ${errorMsg}`;
      loadingState.error = errorMsg;
      showError('安装MOD失败', { detail: detailMsg });
      return null;
    } finally {
      loadingState.loading = false;
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

  /**
   * 选择游戏目录中的安装目录（返回相对游戏目录的路径）
   */
  const selectGameInstallDirectory = async (gameDir: string): Promise<string | null> => {
    try {
      const response: any = await tauriInvoke('select_game_install_directory', { gameDir });
      if (response?.success && response?.data) {
        return response.data;
      } else {
        const errorMsg = response?.error || '未选择安装目录';
        if (errorMsg !== '未选择安装目录' && errorMsg !== '') {
          showError('选择安装目录失败', { detail: `游戏目录: ${gameDir}\n错误: ${errorMsg}` });
        }
        return null;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      showError('选择安装目录失败', { detail: `游戏目录: ${gameDir}\n错误: ${errorMsg}` });
      return null;
    }
  };

  /**
   * 检查MOD是否有g2m.json配置文件
   */
  const checkModConfig = async (modDir: string): Promise<boolean> => {
    try {
      const response: any = await tauriInvoke('read_g2m_mod_config', { modDir });
      return response?.success && response?.data !== null && response?.data !== undefined;
    } catch {
      return false;
    }
  };

  return {
    loadingState,
    getGameMods,
    installUserMod,
    selectModFiles,
    selectGameInstallDirectory,
    checkModConfig,
  };
}

