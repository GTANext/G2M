/**
 * MOD API Composable
 * 提供 MOD 相关的 API 调用封装
 */

import { callApi } from '~/utils/api';
import { getResponseData, getResponseDataOrNull, isResponseSuccess, getResponseError } from '~/utils/response';
import { useMessage } from '~/composables/ui/useMessage';
import type {
  ApiResponse,
  G2MModInfo,
  UserModInstallRequest,
  UserModInstallResult,
} from '~/types';

/**
 * 加载状态接口
 */
export interface LoadingState {
  loading: boolean;
  error: string | null;
}

/**
 * MOD API Composable
 */
export function useModApi() {
  const { showError, showSuccess } = useMessage();
  const loadingState = reactive<LoadingState>({
    loading: false,
    error: null,
  });

  /**
   * 执行 API 调用并更新加载状态
   */
  async function executeApiCall<T>(
    apiCall: () => Promise<ApiResponse<T>>,
    errorMessage: string,
    detailMessage?: string
  ): Promise<ApiResponse<T>> {
    try {
      loadingState.loading = true;
      loadingState.error = null;
      return await apiCall();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : errorMessage;
      loadingState.error = errorMsg;
      showError(errorMessage, { detail: detailMessage || errorMsg });
      throw error;
    } finally {
      loadingState.loading = false;
    }
  }

  /**
   * 获取游戏目录下的已安装MOD列表
   */
  const getGameMods = async (gameDir: string): Promise<G2MModInfo[]> => {
    return executeApiCall(
      () => callApi<G2MModInfo[]>('get_game_mods', { gameDir }),
      '获取MOD列表失败',
      `游戏目录: ${gameDir}`
    ).then((response) => {
      if (isResponseSuccess(response) && response.data) {
        return response.data;
      }
      return getResponseData(response, []);
    });
  };

  /**
   * 安装用户MOD（自动识别文件进行安装）
   */
  const installUserMod = async (
    request: UserModInstallRequest
  ): Promise<UserModInstallResult | null> => {
    return executeApiCall(
      () => callApi<UserModInstallResult>('install_user_mod', { request }),
      '安装MOD失败',
      `MOD名称: ${request.mod_name}\n游戏目录: ${request.game_dir}`
    ).then((response) => {
      if (isResponseSuccess(response) && response.data) {
        showSuccess(`MOD "${request.mod_name}" 安装成功！`);
        return response.data;
      }
      return null;
    });
  };

  /**
   * 选择MOD文件或文件夹
   */
  const selectModFiles = async (isDirectory = false): Promise<string | null> => {
    try {
      const response = await callApi<string[]>('select_mod_files', {
        defaultDir: null,
        isDirectory,
      });

      if (isResponseSuccess(response) && response.data && response.data.length > 0) {
        // 返回第一个选中的路径
        return response.data[0];
      }

      const errorMsg = getResponseError(response, '未选择文件或文件夹');
      if (errorMsg !== '未选择文件或文件夹') {
        showError('选择MOD文件失败', {
          detail: `类型: ${isDirectory ? '文件夹' : '文件'}\n错误: ${errorMsg}`,
        });
      }
      return null;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      showError('选择MOD文件失败', {
        detail: `类型: ${isDirectory ? '文件夹' : '文件'}\n错误: ${errorMsg}`,
      });
      return null;
    }
  };

  /**
   * 选择游戏目录中的安装目录（返回相对游戏目录的路径）
   */
  const selectGameInstallDirectory = async (gameDir: string): Promise<string | null> => {
    try {
      const response = await callApi<string>('select_game_install_directory', { gameDir });
      const data = getResponseDataOrNull(response);

      if (data) {
        return data;
      }

      const errorMsg = getResponseError(response, '未选择安装目录');
      if (errorMsg !== '未选择安装目录' && errorMsg.trim() !== '') {
        showError('选择安装目录失败', { detail: `游戏目录: ${gameDir}\n错误: ${errorMsg}` });
      }
      return null;
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
      const response = await callApi<unknown>('read_g2m_mod_config', { modDir });
      return isResponseSuccess(response) && response.data !== null && response.data !== undefined;
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

