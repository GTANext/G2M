import { ref, reactive, computed } from 'vue';
import { useGameApi } from '@/composables/api/useGameApi';
import { useImageHandler } from '@/composables/useImageHandler';
import { useMessage } from '@/composables/ui/useMessage';

export function useGameForm() {
  const gameApi = useGameApi();
  const imageHandler = useImageHandler();
  const { showError, showSuccess, showInfo } = useMessage();

  // 表单数据 - 使用 any 类型
  const formData: any = reactive({
    name: '',
    dir: '',
    exe: '',
    img: '',
    type: undefined
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
  const detectionResult: any = ref(null);

  // 是否自动检测到游戏
  const isAutoDetected = computed(() => {
    return detectionResult.value?.success && detectionResult.value.type;
  });

  // 图片上传相关状态
  const imagePreview = ref<string>('');
  const uploadingImage = ref(false);
  const selectedImageFile = ref<string>('');

  // 重置表单
  const resetForm = () => {
    formData.name = '';
    formData.dir = '';
    formData.exe = '';
    formData.img = '';
    formData.type = undefined;
    detectionResult.value = null;
    imagePreview.value = '';
    selectedImageFile.value = '';
    
    if (formRef.value) {
      formRef.value.resetFields();
    }
  };

  // 选择游戏文件夹
  const selectFolder = async () => {
    try {
      const response: any = await gameApi.selectGameFolder();
      if (response?.success && response?.data) {
        const selectedPath = response.data;
        
        // 先检查是否有重复目录 - 使用 any 类型
        const duplicateCheck: any = await gameApi.checkDuplicateDirectory(selectedPath);
        if (!duplicateCheck?.success) {
          showError('该目录已被其他游戏使用', { detail: duplicateCheck?.error });
          return;
        }
        
        formData.dir = selectedPath;
        await detectGameInFolder(selectedPath);
      } else {
        // 只有当有错误信息时才显示错误
        if (response?.error && response.error.trim() !== '') {
          showError('选择文件夹失败', { detail: response.error });
        }
      }
    } catch (error) {
      showError('选择文件夹失败');
    }
  };

  // 检测文件夹中的游戏
  const detectGameInFolder = async (folderPath: string) => {
    try {
      isDetecting.value = true;
      const result: any = await gameApi.detectGame(folderPath);
      detectionResult.value = result;

      if (result?.success && result?.type && result?.game_name && result?.executable) {
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

  // 验证表单
  const validateForm = async (): Promise<boolean> => {
    if (!formRef.value) return false;
    
    try {
      await formRef.value.validate();
      return true;
    } catch (error) {
      return false;
    }
  };

  // 提交表单
  const submitForm = async (): Promise<boolean> => {
    try {
      const isValid = await validateForm();
      if (!isValid) {
        showError('请完善表单信息');
        return false;
      }

      const payload = {
        ...formData,
        img: typeof formData.img === 'string' && formData.img.trim() !== '' ? formData.img : null
      };

      await gameApi.saveGame(payload);
      showSuccess('游戏添加成功！');
      resetForm();
      return true;
    } catch (error) {
      showError('保存游戏失败');
      return false;
    }
  };

  // 选择图片文件
  const selectImage = async () => {
    try {
      uploadingImage.value = true;
      
      // 使用 base64 图片处理
      const imageResult: any = await imageHandler.selectImageFile();
      
      if (imageResult) {
        // 直接使用完整的 data URL 作为预览和存储
        imagePreview.value = imageResult.dataUrl;
        selectedImageFile.value = imageResult.fileName;
        formData.img = imageResult.dataUrl;  // 直接保存完整的 data URL
        
        showSuccess('图片选择成功');
      }
    } catch (error) {
      showError('选择图片失败');
    } finally {
      uploadingImage.value = false;
    }
  };

  // 清除选中的图片
  const clearImage = () => {
    imagePreview.value = '';
    selectedImageFile.value = '';
    formData.img = '';
    showSuccess('已清除图片');
  };



  // 获取游戏类型显示名称
  const getGameTypeName = (gameType: any): string => {
    if (!gameType) return '未知游戏';
    // @ts-ignore
    const GAME_TYPE_NAMES: any = {
      'gta3': 'GTA III',
      'gtavc': 'GTA Vice City', 
      'gtasa': 'GTA San Andreas'
    };
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
    loadingState: (gameApi as any).loadingState,
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
    clearImage
  };
}