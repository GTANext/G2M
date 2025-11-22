import { ref, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { isTauriEnvironment } from '@/utils/tauri';
import type { ApiResponse, DownloadRecord } from '@/types';

export function useDownloadRecords() {
  const downloadRecords = ref<DownloadRecord[]>([]);
  const loading = ref(false);

  // 加载下载记录
  const loadDownloadRecords = async () => {
    if (!isTauriEnvironment()) return;

    try {
      loading.value = true;
      const response = await invoke<ApiResponse<DownloadRecord[]>>('get_download_records');
      if (response?.success) {
        downloadRecords.value = response.data || [];
      }
    } catch (error) {
      console.error('加载下载记录失败:', error);
    } finally {
      loading.value = false;
    }
  };

  // 获取游戏下载状态
  const getGameDownloadStatus = (gameType: string) => {
    const record = downloadRecords.value.find(r => r.game_type === gameType);
    if (!record) return 'not_downloaded'; // 未下载
    return 'downloaded'; // 已下载（可以多次解压）
  };

  // 获取游戏下载记录
  const getDownloadRecord = (gameType: string) => {
    return downloadRecords.value.find(r => r.game_type === gameType);
  };

  // 自动加载
  onMounted(() => {
    if (isTauriEnvironment()) {
      loadDownloadRecords();
    }
  });

  return {
    downloadRecords,
    loading,
    loadDownloadRecords,
    getGameDownloadStatus,
    getDownloadRecord
  };
}

