/**
 * 游戏表单 Composable
 * 提供游戏添加/编辑表单的状态管理和操作
 */

import { useGameApi } from '~/composables/api/useGameApi';
import { useImageHandler } from '~/composables/useImageHandler';
import { useMessage } from '~/composables/ui/useMessage';
import { getResponseDataOrNull, isResponseSuccess, getResponseError } from '~/utils/response';
import { GAME_TYPE_NAMES } from '~/constants/game';
import type { GameType, GameDetectionResult, SaveGameRequest } from '~/types';

/**
 * 游戏表单数据接口
 */
export interface GameFormData {
  name: string;
  dir: string;
  exe: string;
  img: string | null;
  type: GameType | null | undefined;
}

/**
 * 游戏表单 Composable
 */
export function useGameForm() {
  const gameApi = useGameApi();
  const imageHandler = useImageHandler();
  const { showError, showSuccess, showInfo } = useMessage();

  // 表单数据
  const formData = reactive<GameFormData>({
    name: '',
    dir: '',
    exe: '',
    img: null,
    type: undefined,
  });

  // 表单验证规则
  const rules = {
    name: [
      { required: true, message: '请输入游戏名称', trigger: 'blur' }
    ],
    dir: [
      { required: true, message: '请选择游戏目录', trigger: 'blur' }
    ],
    exe: [
      // 移除必填要求，添加游戏时不需要验证启动程序
    ]
  };

  // 表单引用
  const formRef = ref();

  // 是否正在检测游戏
  const isDetecting = ref(false);

  // 检测结果
  const detectionResult = ref<GameDetectionResult | null>(null);

  // 是否自动检测到游戏
  const isAutoDetected = computed(() => {
    return (
      detectionResult.value?.success === true &&
      detectionResult.value.type !== undefined &&
      detectionResult.value.type !== null
    );
  });

  // 图片上传相关状态
  const imagePreview = ref<string>('');
  const uploadingImage = ref(false);
  const selectedImageFile = ref<string>('');

  /**
   * 重置表单
   */
  const resetForm = (): void => {
    formData.name = '';
    formData.dir = '';
    formData.exe = '';
    formData.img = null;
    formData.type = undefined;
    detectionResult.value = null;
    imagePreview.value = '';
    selectedImageFile.value = '';

    // Naive UI 的 NForm 使用 restoreValidation 来清除验证状态
    if (formRef.value && typeof formRef.value.restoreValidation === 'function') {
      formRef.value.restoreValidation();
    }
  };

  /**
   * 选择游戏文件夹
   */
  const selectFolder = async (): Promise<void> => {
    try {
      const response = await gameApi.selectGameFolder();
      const selectedPath = getResponseDataOrNull(response);

      if (!selectedPath) {
        const errorMsg = getResponseError(response, '');
        if (errorMsg.trim() !== '') {
          showError('选择文件夹失败', { detail: errorMsg });
        }
        return;
      }

      // 先检查是否有重复目录
      const duplicateCheck = await gameApi.checkDuplicateDirectory(selectedPath);
      if (!isResponseSuccess(duplicateCheck)) {
        const errorMsg = getResponseError(duplicateCheck, '该目录已被其他游戏使用');
        showError('该目录已被其他游戏使用', { detail: errorMsg });
        return;
      }

      formData.dir = selectedPath;
      await detectGameInFolder(selectedPath);
    } catch (error) {
      showError('选择文件夹失败');
    }
  };

  /**
   * 检测文件夹中的游戏
   */
  const detectGameInFolder = async (folderPath: string): Promise<void> => {
    try {
      isDetecting.value = true;
      const response = await gameApi.detectGame(folderPath);
      const result = getResponseDataOrNull(response);
      detectionResult.value = result;

      if (result?.success && result.type && result.game_name && result.executable) {
        // 自动填充表单
        formData.name = result.game_name;
        formData.exe = result.executable;
        formData.type = result.type;

        showSuccess(`检测到游戏: ${result.game_name}`);
      } else {
        showInfo('未检测到支持的游戏，请手动填写游戏信息');
      }
    } catch (error) {
      showError('检测游戏失败');
    } finally {
      isDetecting.value = false;
    }
  };

  /**
   * 验证表单
   */
  const validateForm = async (): Promise<boolean> => {
    if (!formRef.value) return false;

    try {
      await formRef.value.validate();
      return true;
    } catch {
      return false;
    }
  };

  /**
   * 提交表单
   */
  const submitForm = async (): Promise<boolean> => {
    try {
      const isValid = await validateForm();
      if (!isValid) {
        showError('请完善表单信息');
        return false;
      }

      const payload: SaveGameRequest = {
        name: formData.name,
        dir: formData.dir,
        exe: formData.exe,
        img: formData.img && formData.img.trim() !== '' ? formData.img : null,
        type: formData.type ?? null,
      };

      await gameApi.saveGame(payload);
      // 不在这里显示成功消息，由调用方处理
      resetForm();
      return true;
    } catch (error) {
      // 抛出错误让调用方处理，调用方可以使用 notification 显示详细错误
      throw error;
    }
  };

  /**
   * 选择图片文件
   */
  const selectImage = async (): Promise<void> => {
    try {
      uploadingImage.value = true;

      // 使用 base64 图片处理
      const imageResult = await imageHandler.selectImageFile();

      if (imageResult) {
        // 直接使用完整的 data URL 作为预览和存储
        imagePreview.value = imageResult.dataUrl;
        selectedImageFile.value = imageResult.fileName;
        formData.img = imageResult.dataUrl; // 直接保存完整的 data URL

        showSuccess('图片选择成功');
      }
    } catch (error) {
      showError('选择图片失败');
    } finally {
      uploadingImage.value = false;
    }
  };

  /**
   * 清除选中的图片
   */
  const clearImage = (): void => {
    imagePreview.value = '';
    selectedImageFile.value = '';
    formData.img = null;
    showSuccess('已清除图片');
  };

  /**
   * 获取游戏类型显示名称
   */
  const getGameTypeName = (gameType: GameType | null | undefined): string => {
    if (!gameType) return '未知游戏';
    return GAME_TYPE_NAMES[gameType] || '未知游戏';
  };

  return {
    // 状态
    formData,
    rules,
    formRef,
    isDetecting,
    detectionResult,
    isAutoDetected,
    loadingState: gameApi.loadingState,
    imagePreview,
    uploadingImage,
    selectedImageFile,

    // 方法
    resetForm,
    selectFolder,
    detectGameInFolder,
    validateForm,
    submitForm,
    getGameTypeName,
    selectImage,
    clearImage,
  };
}