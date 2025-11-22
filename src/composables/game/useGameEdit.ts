import { ref, watch } from 'vue';
import { useGameApi } from '@/composables/api/useGameApi';
import { useImageHandler } from '@/composables/useImageHandler';
import { useMessage } from '@/composables/ui/useMessage';
import type { GameInfo } from '@/types';

export function useGameEdit(gameInfo: any) {
  const gameApi = useGameApi();
  const { selectImageFile } = useImageHandler();
  const { showError, showSuccess } = useMessage();

  // Form data
  const formData = ref({
    name: '',
    dir: '',
    exe: '',
    img: ''
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

  // Initialize form data
  const initFormData = () => {
    if (gameInfo?.value) {
      formData.value = {
        name: gameInfo.value.name || '',
        dir: gameInfo.value.dir || '',
        exe: gameInfo.value.exe || '',
        img: gameInfo.value.img || ''
      };
    }
  };

  // Watch for gameInfo changes to initialize form
  watch(() => gameInfo?.value, (newGameInfo) => {
    if (newGameInfo) {
      initFormData();
    }
  }, { immediate: true });

  // Handle save
  const handleSave = async () => {
    try {
      await formRef.value.validate();

      saving.value = true;

      const result = await gameApi.updateGame(
        gameInfo.value.id,
        formData.value.name,
        formData.value.dir,
        formData.value.exe,
        formData.value.img,
        gameInfo.value.type,
        gameInfo.value.deleted
      );

      if (result.success) {
        showSuccess('游戏信息更新成功');
        return { success: true };
      } else {
        showError('更新游戏信息失败', { detail: result.error });
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      showError('保存游戏信息失败', { detail: error });
      return { success: false, error: error.message || error };
    } finally {
      saving.value = false;
    }
  };

  // Handle image file selection
  const selectImageFileHandler = async () => {
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
    } catch (error: any) {
      console.error('选择图片失败:', error);
      showError('选择图片失败，请重试', { detail: error });
      return { success: false, error: error.message || error };
    } finally {
      selectingImage.value = false;
    }
  };

  // Handle folder selection
  const selectFolderHandler = async () => {
    try {
      selectingFolder.value = true;

      const response = await gameApi.selectGameFolder();
      
      if (response?.success && response?.data) {
        const selectedPath = response.data;
        
        // 如果选择的目录与当前游戏的目录相同，直接允许
        if (selectedPath === gameInfo.value?.dir) {
          formData.value.dir = selectedPath;
          showSuccess('游戏目录已更新');
          return { success: true, path: selectedPath };
        }
        
        // 检查是否有重复目录（排除当前游戏）
        const duplicateCheck = await gameApi.checkDuplicateDirectory(selectedPath, gameInfo.value?.id);
        if (!duplicateCheck?.success) {
          showError('该目录已被其他游戏使用', { detail: duplicateCheck?.error });
          return { success: false, error: duplicateCheck?.error };
        }
        
        formData.value.dir = selectedPath;
        showSuccess('游戏目录已更新');
        return { success: true, path: selectedPath };
      } else {
        // 只有当有错误信息时才显示错误（用户取消时 error 为空）
        if (response?.error && response.error.trim() !== '') {
          showError('选择文件夹失败', { detail: response.error });
        }
        return { success: false, error: response?.error };
      }
    } catch (error: any) {
      console.error('选择文件夹失败:', error);
      showError('选择文件夹失败，请重试', { detail: error });
      return { success: false, error: error.message || error };
    } finally {
      selectingFolder.value = false;
    }
  };

  // Reset form data to original values
  const resetForm = () => {
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

