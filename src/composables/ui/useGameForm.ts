import { ref, reactive, computed } from 'vue';
import { message } from 'ant-design-vue';
import type { 
  AddGameFormData, 
  FormValidationRules, 
  GameDetectionResult,
  GAME_TYPE_MAP 
} from '@/types';
import { useGameApi } from '@/composables/api/useGameApi';

export function useGameForm() {
  const gameApi = useGameApi();

  // 表单数据
  const formData = reactive<AddGameFormData>({
    name: '',
    dir: '',
    exe: '',
    img: '',
    game_type: undefined
  });

  // 表单验证规则
  const rules: FormValidationRules = {
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

  // 表单引用
  const formRef = ref();

  // 是否正在检测游戏
  const isDetecting = ref(false);

  // 检测结果
  const detectionResult = ref<GameDetectionResult | null>(null);

  // 是否自动检测到游戏
  const isAutoDetected = computed(() => {
    return detectionResult.value?.success && detectionResult.value.game_type;
  });

  // 重置表单
  const resetForm = () => {
    formData.name = '';
    formData.dir = '';
    formData.exe = '';
    formData.img = '';
    detectionResult.value = null;
    
    if (formRef.value) {
      formRef.value.resetFields();
    }
  };

  // 选择游戏文件夹
  const selectFolder = async () => {
    try {
      const selectedPath = await gameApi.selectGameFolder();
      if (selectedPath) {
        // 先检查是否有重复目录
        const duplicateCheck = await gameApi.checkDuplicateDirectory(selectedPath);
        if (!duplicateCheck.success) {
          message.error(duplicateCheck.error || '该目录已被其他游戏使用');
          return;
        }
        
        formData.dir = selectedPath;
        await detectGameInFolder(selectedPath);
      }
    } catch (error) {
      console.error('选择文件夹失败:', error);
      message.error('选择文件夹失败');
    }
  };

  // 检测文件夹中的游戏
  const detectGameInFolder = async (folderPath: string) => {
    try {
      isDetecting.value = true;
      const result = await gameApi.detectGame(folderPath);
      detectionResult.value = result;

      if (result.success && result.game_type && result.game_name && result.executable) {
        // 自动填充表单
        formData.name = result.game_name;
        formData.exe = result.executable;
        formData.game_type = result.game_type as 'gta3' | 'gtavc' | 'gtasa';
        
        message.success(`检测到游戏: ${result.game_name}`);
      } else {
        message.info('未检测到支持的游戏，请手动填写游戏信息');
      }
    } catch (error) {
      console.error('检测游戏失败:', error);
      message.error('检测游戏失败');
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
        message.error('请完善表单信息');
        return false;
      }

      await gameApi.saveGame(formData);
      message.success('游戏添加成功！');
      resetForm();
      return true;
    } catch (error) {
      console.error('保存游戏失败:', error);
      message.error('保存游戏失败');
      return false;
    }
  };

  // 获取游戏类型显示名称
  const getGameTypeName = (gameType: string): string => {
    const typeMap: Record<string, string> = {
      'gta3': 'Grand Theft Auto III',
      'gtavc': 'Grand Theft Auto: Vice City',
      'gtasa': 'Grand Theft Auto: San Andreas'
    };
    return typeMap[gameType] || '未知游戏';
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

    // 方法
    resetForm,
    selectFolder,
    detectGameInFolder,
    validateForm,
    submitForm,
    getGameTypeName
  };
}