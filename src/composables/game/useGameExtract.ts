import { ref, watch, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useMessage } from '@/composables/ui/useMessage';
import { useGameApi } from '@/composables/api/useGameApi';
import type { ApiResponse, DownloadRecord } from '@/types';

export function useGameExtract(gameType: any, downloadRecord: any) {
  const { showError, showSuccess } = useMessage();
  const { saveGame } = useGameApi();

  const extractPath = ref('');
  const isExtracting = ref(false);
  const extractProgress = ref(0);
  const currentFile = ref('');
  const totalFiles = ref(0);
  const extractedFiles = ref(0);

  let progressListener: UnlistenFn | null = null;

  // 游戏名称映射
  const gameNames: Record<string, string> = {
    gta3: 'Grand Theft Auto III',
    gtavc: 'Grand Theft Auto Vice City',
    gtasa: 'Grand Theft Auto San Andreas'
  };

  // 获取实际的游戏类型值（处理 computed ref）
  const getGameTypeValue = () => {
    if (!gameType) return null;
    // 如果是 computed ref，获取其值
    if (typeof gameType === 'object' && 'value' in gameType) {
      return gameType.value;
    }
    // 如果是函数（computed），调用它
    if (typeof gameType === 'function') {
      return gameType();
    }
    return gameType;
  };

  // 获取实际的下载记录值（处理 computed ref）
  const getDownloadRecordValue = (): DownloadRecord | null => {
    if (!downloadRecord) return null;
    // 如果是 computed ref，获取其值
    if (typeof downloadRecord === 'object' && 'value' in downloadRecord) {
      return downloadRecord.value;
    }
    // 如果是函数（computed），调用它
    if (typeof downloadRecord === 'function') {
      return downloadRecord();
    }
    return downloadRecord;
  };

  // 选择解压目录
  const selectExtractFolder = async () => {
    try {
      const response = await invoke<ApiResponse<string>>('select_extract_folder');
      if (response?.success && response?.data) {
        extractPath.value = response.data;
        return { success: true, path: response.data };
      } else {
        // 只有当有错误信息时才显示错误（用户取消时 error 为空）
        if (response?.error && response.error.trim() !== '') {
          showError('选择文件夹失败', { detail: response.error });
        }
        return { success: false, error: response?.error };
      }
    } catch (error: any) {
      showError('选择文件夹失败', { detail: error });
      return { success: false, error: error.message || error };
    }
  };

  // 开始解压
  const startExtract = async () => {
    try {
      if (!extractPath.value) {
        showError('请选择解压位置');
        return { success: false, error: '请选择解压位置' };
      }

      const actualDownloadRecord = getDownloadRecordValue();
      if (!actualDownloadRecord || !actualDownloadRecord.zip_path) {
        showError('下载记录不存在');
        return { success: false, error: '下载记录不存在' };
      }

      const actualGameType = getGameTypeValue();
      if (!actualGameType) {
        showError('游戏类型不存在');
        return { success: false, error: '游戏类型不存在' };
      }

      isExtracting.value = true;
      extractProgress.value = 0;
      currentFile.value = '';
      totalFiles.value = 0;
      extractedFiles.value = 0;

      // 监听解压进度事件
      if (!progressListener) {
        progressListener = await listen('extract-progress', (event: any) => {
          const progress = event.payload;
          extractProgress.value = progress.percentage || 0;
          extractedFiles.value = progress.current || 0;
          totalFiles.value = progress.total || 0;
          currentFile.value = progress.current_file || '';
        });
      }

      // 调用解压命令
      const extractResponse = await invoke<ApiResponse<any>>('extract_game', {
        request: {
          zip_path: actualDownloadRecord.zip_path,
          extract_to: extractPath.value,
          game_type: actualGameType
        }
      });

      if (extractResponse?.success) {
        // 获取返回的游戏信息
        const gameInfo = extractResponse.data;

        // 确保 game_type 有值，优先使用返回的 game_type，其次使用实际游戏类型
        const finalGameType = gameInfo?.game_type || actualGameType;

        if (!finalGameType) {
          showError('游戏类型不能为空');
          return { success: false, error: '游戏类型不能为空' };
        }

        // 解压成功后，自动添加游戏到列表
        try {
          const saveResponse = await saveGame({
            name: gameInfo?.game_name || gameNames[finalGameType] || '',
            dir: gameInfo?.game_dir || '',
            exe: gameInfo?.game_exe || '',
            img: '',
            type: finalGameType
          });

          if (saveResponse?.success) {
            return { success: true, gameInfo };
          } else {
            showError('游戏解压成功，但添加到列表失败', { detail: saveResponse?.error });
            return { success: false, error: saveResponse?.error };
          }
        } catch (error: any) {
          showError('游戏解压成功，但添加到列表失败', { detail: error });
          return { success: false, error: error.message || error };
        }
      } else {
        throw new Error(extractResponse?.error || '解压失败');
      }
    } catch (error: any) {
      console.error('解压失败:', error);
      showError('解压失败', { detail: error.message || error });
      return { success: false, error: error.message || error };
    } finally {
      isExtracting.value = false;
      if (progressListener) {
        progressListener();
        progressListener = null;
      }
    }
  };

  // 格式化文件大小
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // 重置状态
  const reset = () => {
    extractPath.value = '';
    extractProgress.value = 0;
    currentFile.value = '';
    totalFiles.value = 0;
    extractedFiles.value = 0;
    if (progressListener) {
      progressListener();
      progressListener = null;
    }
  };

  // 清理
  onUnmounted(() => {
    if (progressListener) {
      progressListener();
    }
  });

  return {
    extractPath,
    isExtracting,
    extractProgress,
    currentFile,
    totalFiles,
    extractedFiles,
    gameNames,
    formatBytes,
    selectExtractFolder,
    startExtract,
    reset
  };
}

