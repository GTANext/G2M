import { ref, computed, watch, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useMessage } from '@/composables/ui/useMessage';
import type { ApiResponse } from '@/types';

export function useGameDownload(gameType: any) {
  const { showError, showSuccess } = useMessage();

  const isDownloading = ref(false);
  const downloadProgress = ref(0);
  const downloadedBytes = ref(0);
  const totalBytes = ref(0);

  let progressListener: UnlistenFn | null = null;

  // 游戏名称映射
  const gameNames: Record<string, string> = {
    gta3: 'Grand Theft Auto III',
    gtavc: 'Grand Theft Auto Vice City',
    gtasa: 'Grand Theft Auto San Andreas'
  };

  // 格式化文件大小
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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

  // 开始下载
  const startDownload = async () => {
    const actualGameType = getGameTypeValue();
    if (!actualGameType) {
      showError('游戏类型不能为空');
      return;
    }

    try {
      isDownloading.value = true;
      downloadProgress.value = 0;

      // 监听下载进度事件
      if (!progressListener) {
        progressListener = await listen('download-progress', (event: any) => {
          const progress = event.payload;
          downloadProgress.value = progress.percentage || 0;
          downloadedBytes.value = progress.downloaded || 0;
          totalBytes.value = progress.total || 0;
        });
      }

      // 调用下载命令（自动下载到 G2M/Download）
      const response = await invoke<ApiResponse<any>>('download_game', {
        request: {
          game_type: actualGameType
        }
      });

      if (response?.success) {
        showSuccess('游戏下载完成！');
        return { success: true };
      } else {
        // 检查是否是用户取消
        if (response?.error && response.error.includes('取消')) {
          // 用户取消，不显示错误
          return { success: false, cancelled: true };
        }
        throw new Error(response?.error || '下载失败');
      }
    } catch (error: any) {
      console.error('下载失败:', error);
      // 检查是否是取消操作
      if (error.message && error.message.includes('取消')) {
        // 用户取消，不显示错误
        return { success: false, cancelled: true };
      }
      showError('下载失败', { detail: error.message || error });
      return { success: false, error: error.message || error };
    } finally {
      isDownloading.value = false;
      if (progressListener) {
        progressListener();
        progressListener = null;
      }
    }
  };

  // 取消下载
  const cancelDownload = async () => {
    try {
      await invoke('cancel_download');
      isDownloading.value = false;
      downloadProgress.value = 0;
      downloadedBytes.value = 0;
      totalBytes.value = 0;
      if (progressListener) {
        progressListener();
        progressListener = null;
      }
      return { success: true };
    } catch (error: any) {
      console.error('取消下载失败:', error);
      showError('取消下载失败', { detail: error.message || error });
      return { success: false, error: error.message || error };
    }
  };

  // 重置状态
  const reset = () => {
    downloadProgress.value = 0;
    downloadedBytes.value = 0;
    totalBytes.value = 0;
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
    isDownloading,
    downloadProgress,
    downloadedBytes,
    totalBytes,
    gameNames,
    formatBytes,
    startDownload,
    cancelDownload,
    reset
  };
}

