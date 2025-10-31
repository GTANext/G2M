import { ref } from 'vue';
import { useGameApi } from '@/composables/api/useGameApi';
import { useMessage } from '@/composables/ui/useMessage';

export function useGameActions() {
  const gameApi = useGameApi();
  const { showError, showSuccess } = useMessage();
  
  // 加载状态 - 使用 any 类型
  const loading: any = ref({
    launch: false,
    openFolder: false,
    saveEdit: false
  });

  // 错误信息 - 使用 any 类型
  const error: any = ref(null);

  // 启动游戏
  const launchGame = async (gameInfo: any) => {
    if (!gameInfo) {
      showError('游戏信息不能为空');
      return;
    }

    loading.value.launch = true;
    error.value = null;

    try {
      const response: any = await gameApi.launchGame(gameInfo.dir || '', gameInfo.exe || '');

      if (response?.success) {
        showSuccess('游戏启动成功！');
      } else {
        const errorMsg = response?.error || '启动游戏失败';
        showError('启动游戏失败', { detail: response?.error });
        error.value = errorMsg;
      }
    } catch (err) {
      const errorMsg = '启动游戏失败';
      showError(errorMsg, { detail: err });
      error.value = errorMsg;
    } finally {
      loading.value.launch = false;
    }
  };

  // 打开游戏文件夹
  const openGameFolder = async (gameInfo: any) => {
    if (!gameInfo) {
      showError('游戏信息不能为空');
      return;
    }

    loading.value.openFolder = true;
    error.value = null;

    try {
      // @ts-ignore - 忽略类型检查
      const response: any = await gameApi.openGameFolder(gameInfo.dir || '');

      if (response?.success) {
        showSuccess('文件夹打开成功！');
      } else {
        const errorMsg = response?.error || '打开文件夹失败';
        showError('打开文件夹失败', { detail: response?.error });
        error.value = errorMsg;
      }
    } catch (err) {
      showError('打开文件夹失败');
    } finally {
      loading.value.openFolder = false;
    }
  };

  // 保存编辑
  const saveEdit = async (gameId: any, editForm: any, gameInfo: any) => {
    if (!gameId || !editForm) {
      showError('参数不能为空');
      return false;
    }

    loading.value.saveEdit = true;
    error.value = null;

    try {
      // @ts-ignore - 忽略类型检查
      const response: any = await gameApi.updateGame(
        gameId,
        editForm.name || '',
        editForm.dir || '',
        editForm.exe || '',
        editForm.img || '',
        gameInfo?.type || '',
        editForm.deleted || false
      );

      if (response?.success) {
        showSuccess('保存成功！');
        
        // 更新本地游戏数据 - 使用 any 类型
        if (gameInfo && response.data) {
          (gameInfo as any).name = editForm.name;
          (gameInfo as any).dir = editForm.dir;
          (gameInfo as any).exe = editForm.exe;
          (gameInfo as any).img = editForm.img;
        }
        
        return true;
      } else {
        const errorMsg = response?.error || '保存失败';
        showError('保存失败', { detail: response?.error });
        error.value = errorMsg;
        return false;
      }
    } catch (err) {
      showError('保存失败');
    } finally {
      loading.value.saveEdit = false;
    }
  };

  return {
    // 状态
    loading,
    error,

    // 方法
    launchGame,
    openGameFolder,
    saveEdit
  };
}