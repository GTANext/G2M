/**
 * 游戏编辑 Composable
 * 提供游戏编辑表单的状态管理和操作
 */

import { useGameApi } from '~/composables/api/useGameApi';
import { useImageHandler } from '~/composables/useImageHandler';
import { useMessage } from '~/composables/ui/useMessage';
import { isResponseSuccess, getResponseError, getResponseDataOrNull } from '~/utils/response';
import { toNumericId } from '~/utils/id';
import type { GameInfo, UpdateGameRequest } from '~/types';

/**
 * 游戏编辑表单数据接口
 */
export interface GameEditFormData {
  name: string;
  dir: string;
  exe: string;
  img: string | null;
}

/**
 * 游戏编辑 Composable
 */
export function useGameEdit(gameInfo: Ref<GameInfo | null> | ComputedRef<GameInfo | null>) {
  const gameApi = useGameApi();
  const { selectImageFile } = useImageHandler();
  const { showError, showSuccess } = useMessage();

  // Form data
  const formData = ref<GameEditFormData>({
    name: '',
    dir: '',
    exe: '',
    img: null,
  });

  // Form ref
  const formRef = ref();

  // Image selection state
  const selectingImage = ref(false);

  // Folder selection state
  const selectingFolder = ref(false);

  // Loading state
  const saving = ref(false);

  // Form validation rules
  const rules = {
    name: [
      { required: true, message: '请输入游戏名称', trigger: 'blur' }
    ],
    dir: [
      { required: true, message: '请选择游戏目录', trigger: 'blur' }
    ],
    exe: [
      { required: true, message: '请输入启动程序', trigger: 'blur' }
    ]
  };

  /**
   * 初始化表单数据
   */
  const initFormData = (): void => {
    if (gameInfo?.value) {
      formData.value = {
        name: gameInfo.value.name || '',
        dir: gameInfo.value.dir || '',
        exe: gameInfo.value.exe || '',
        img: gameInfo.value.img || null,
      };
    }
  };

  // Watch for gameInfo changes to initialize form
  watch(() => gameInfo?.value, (newGameInfo) => {
    if (newGameInfo) {
      initFormData();
    }
  }, { immediate: true });

  /**
   * 保存游戏信息
   */
  const handleSave = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await formRef.value.validate();

      if (!gameInfo.value) {
        throw new Error('游戏信息不存在');
      }

      saving.value = true;

      const updateData: UpdateGameRequest = {
        id: gameInfo.value.id,
        name: formData.value.name,
        dir: formData.value.dir,
        exe: formData.value.exe,
        img: formData.value.img,
        type: gameInfo.value.type ?? null,
        deleted: gameInfo.value.deleted ?? false,
      };

      const result = await gameApi.updateGame(updateData);

      if (isResponseSuccess(result)) {
        showSuccess('游戏信息更新成功');
        return { success: true };
      } else {
        const errorMsg = getResponseError(result, '更新游戏信息失败');
        showError('更新游戏信息失败', { detail: errorMsg });
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      showError('保存游戏信息失败', { detail: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      saving.value = false;
    }
  };

  /**
   * 选择图片文件
   */
  const selectImageFileHandler = async (): Promise<{ success: boolean; dataUrl?: string; error?: string }> => {
    try {
      selectingImage.value = true;

      // 使用 base64 图片处理
      const imageResult = await selectImageFile();

      if (imageResult) {
        // 直接使用完整的 data URL
        formData.value.img = imageResult.dataUrl;
        showSuccess('图片选择成功');
        return { success: true, dataUrl: imageResult.dataUrl };
      }
      return { success: false };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('选择图片失败:', error);
      showError('选择图片失败，请重试', { detail: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      selectingImage.value = false;
    }
  };

  /**
   * 选择文件夹
   */
  const selectFolderHandler = async (): Promise<{ success: boolean; path?: string; error?: string }> => {
    try {
      selectingFolder.value = true;

      if (!gameInfo.value) {
        throw new Error('游戏信息不存在');
      }

      const response = await gameApi.selectGameFolder();
      const selectedPath = getResponseDataOrNull(response);

      if (!selectedPath) {
        const errorMsg = getResponseError(response, '');
        if (errorMsg.trim() !== '') {
          showError('选择文件夹失败', { detail: errorMsg });
        }
        return { success: false, error: errorMsg || undefined };
      }

      // 如果选择的目录与当前游戏的目录相同，直接允许
      if (selectedPath === gameInfo.value.dir) {
        formData.value.dir = selectedPath;
        showSuccess('游戏目录已更新');
        return { success: true, path: selectedPath };
      }

      // 检查是否有重复目录（排除当前游戏）
      const duplicateCheck = await gameApi.checkDuplicateDirectory(selectedPath, gameInfo.value.id);
      if (!isResponseSuccess(duplicateCheck)) {
        const errorMsg = getResponseError(duplicateCheck, '该目录已被其他游戏使用');
        showError('该目录已被其他游戏使用', { detail: errorMsg });
        return { success: false, error: errorMsg };
      }

      formData.value.dir = selectedPath;
      showSuccess('游戏目录已更新');
      return { success: true, path: selectedPath };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('选择文件夹失败:', error);
      showError('选择文件夹失败，请重试', { detail: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      selectingFolder.value = false;
    }
  };

  /**
   * 重置表单数据到原始值
   */
  const resetForm = (): void => {
    initFormData();
  };

  return {
    formData,
    formRef,
    selectingImage,
    selectingFolder,
    saving,
    rules,
    initFormData,
    handleSave,
    selectImageFileHandler,
    selectFolderHandler,
    resetForm
  };
}

