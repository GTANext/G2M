import { ref, computed } from 'vue';
import { GAME_IMAGES, GAME_TYPE_NAMES } from '@/constants/game';
import { useGameApi } from '@/composables/api/useGameApi';
import { isTauriEnvironment, tauriInvoke, installModPrerequisites } from '@/utils/tauri';
import { useMessage } from '@/composables/ui/useMessage';
import type { ModLoaderStatus, ApiResponse, ModInstallRequest, ModInstallResult } from '@/types';

export function useGameInfo(gameId: any) {
  const gameApi = useGameApi();
  const { showError } = useMessage();
  
  // 游戏数据 - 使用 any 类型
  const gameData: any = ref({});
  
  // 加载状态
  const loading = ref(false);
  
  // MOD 加载器状态
  const modLoaderStatus = ref<ModLoaderStatus | null>(null);
  const modLoaderLoading = ref(false);
  
  // MOD 安装状态
  const isInstalling = ref(false);
  const installResult = ref<ModInstallResult | null>(null);

  // 设置游戏数据
  const setGameData = (data: any) => {
    gameData.value = data;
  };

  // 获取游戏类型名称 - 支持大小写兼容
  const getGameTypeName = computed(() => {
    const gameType = gameData.value?.type;
    if (!gameType) return '未知游戏';
    
    // 先尝试直接匹配
    // @ts-ignore - 忽略类型检查
    let typeName = (GAME_TYPE_NAMES as any)[gameType];
    
    // 如果直接匹配失败，尝试小写匹配
    if (!typeName) {
      // @ts-ignore - 忽略类型检查
      typeName = (GAME_TYPE_NAMES as any)[gameType.toLowerCase()];
    }
    
    return typeName || '未知游戏';
  });

  // 获取游戏图片
  const getGameImage = computed(() => {
    // 首先检查是否有自定义图片
    if (gameData.value?.img) {
      // 如果是 data:image 格式的 base64 数据，直接返回
      if (gameData.value.img.startsWith('data:image')) {
        return gameData.value.img;
      }
      // 如果是其他格式的图片路径，也直接返回
      return gameData.value.img;
    }
    
    // 如果没有自定义图片，根据游戏类型返回默认图片
    const gameType = gameData.value?.type;
    if (gameType) {
      // 默认图片映射 - 支持大小写兼容
      const iconMap: Record<string, string> = {
        'GTA3': '/images/gta3.jpg',
        'GTAVC': '/images/gtavc.jpg', 
        'GTASA': '/images/gtasa.jpg',
        'gta3': '/images/gta3.jpg',
        'gtavc': '/images/gtavc.jpg',
        'gtasa': '/images/gtasa.jpg'
      };
      
      // 先尝试直接匹配，如果失败则尝试小写匹配
      let gameImage = iconMap[gameType];
      if (!gameImage) {
        gameImage = iconMap[gameType.toLowerCase()];
      }
      
      return gameImage || '/images/null.svg';
    }
    
    // 最后的退路
    return '/images/null.svg';
  });

  // 获取游戏目录
  const getGameDirectory = computed(() => {
    return gameData.value?.dir || '';
  });

  // 获取游戏可执行文件
  const getGameExecutable = computed(() => {
    return gameData.value?.exe || '';
  });

  // 获取游戏名称
  const getGameName = computed(() => {
    return gameData.value?.name || '';
  });

  // 获取游戏ID
  const getGameId = computed(() => {
    return gameData.value?.id || null;
  });

  // 加载游戏信息
  const loadGameInfo = async () => {
    if (!gameId?.value) {
      console.warn('游戏ID为空，无法加载游戏信息');
      return;
    }

    // 只在 Tauri 环境中加载游戏信息
    if (!isTauriEnvironment()) {
      console.log('非 Tauri 环境，跳过加载游戏信息');
      return;
    }

    try {
      loading.value = true;
      const response = await gameApi.getGameById(gameId.value);
      
      if (response?.success && response?.data) {
        gameData.value = response.data;
      } else {
        showError('获取游戏信息失败');
      }
    } catch (error) {
      showError('加载游戏信息失败');
    } finally {
      loading.value = false;
    }
  };

  // 处理图片错误
  const handleImageError = (event: Event) => {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = '/images/null.svg';
    }
  };

  // 检查 MOD 加载器
  const checkModLoaders = async (gamePath?: string) => {
    // 默认状态对象
    const defaultStatus = {
      dinput8: false,
      cleo: false,
      cleo_redux: false,
      modloader: false
    };

    // 如果没有传入游戏路径，使用内部状态
    const gameDir = gamePath || getGameDirectory.value;
    if (!gameDir) {
      console.warn('游戏目录为空，无法检查 MOD 加载器');
      return defaultStatus;
    }

    try {
      modLoaderLoading.value = true;
      // 获取游戏类型，用于正确检测CLEO文件
      const gameType = gameData.value?.type || null;
      const response = await tauriInvoke<ApiResponse<ModLoaderStatus>>('check_mod_loaders', { 
        gameDir,
        gameType
      });
      
      if (response?.success && response?.data) {
        modLoaderStatus.value = response.data;
        // 返回格式化的状态对象，正确映射 ModLoaderStatus 属性
        return {
          dinput8: response.data.has_dinput8 || false,
          cleo: response.data.has_cleo || false,
          cleo_redux: response.data.has_cleo_redux || false,
          modloader: response.data.has_modloader || false
        };
      } else {
        console.error('检查 MOD 加载器失败:', response?.error);
        modLoaderStatus.value = null;
        return defaultStatus;
      }
    } catch (error) {
      console.error('检查 MOD 加载器时出错:', error);
      modLoaderStatus.value = null;
      return defaultStatus;
    } finally {
      modLoaderLoading.value = false;
    }
  };

  // 计算属性：是否缺少 MOD 加载器
  const hasMissingModLoaders = computed(() => {
    return modLoaderStatus.value && modLoaderStatus.value.missing_loaders.length > 0;
  });

  // MOD 前置安装方法 - 支持选择性安装
  const installModPrerequisitesMethod = async (params?: { game_path?: string; game_type?: string; components?: string[] } | string[]) => {
    let gameDir: string;
    let gameType: string;
    let selectedComponents: string[] | undefined;

    // 处理不同的参数格式
    if (Array.isArray(params)) {
      // 如果传入的是数组，使用内部状态
      gameDir = getGameDirectory.value;
      gameType = gameData.value?.type || '';
      selectedComponents = params;
    } else if (params && typeof params === 'object') {
      // 如果传入的是对象，使用对象中的参数
      gameDir = params.game_path || getGameDirectory.value;
      gameType = params.game_type || gameData.value?.type || '';
      selectedComponents = params.components;
    } else {
      // 如果没有传入参数，使用内部状态
      gameDir = getGameDirectory.value;
      gameType = gameData.value?.type || '';
      selectedComponents = undefined;
    }
    
    if (!gameDir || !gameType) {
      const errorMsg = '游戏目录或游戏类型为空，无法安装 MOD 前置';
      console.error('安装参数错误:', { gameDir, gameType, selectedComponents });
      showError(errorMsg);
      return { success: false, message: errorMsg, details: ['游戏目录或游戏类型为空'] };
    }

    try {
      isInstalling.value = true;
      installResult.value = null;
      
      const request: ModInstallRequest = {
        game_dir: gameDir,
        game_type: gameType,
        components: selectedComponents // 传递选择的组件
      };
      
      console.log('发送安装请求:', request);
      const response = await installModPrerequisites(request);
      
      if (response?.success && response?.data) {
        installResult.value = response.data;
        
        // 安装成功后重新检查 MOD 状态
        await checkModLoaders(gameDir);
        
        return { success: true, message: '安装成功', data: response.data };
      } else {
        const errorMsg = response?.error || '安装 MOD 前置失败';
        console.error('安装失败:', response);
        showError(errorMsg);
        return { success: false, message: errorMsg, details: [response?.error || '未知错误'] };
      }
    } catch (error) {
      const errorMsg = '安装 MOD 前置时出错: ' + (error as Error).message;
      console.error('安装异常:', error);
      showError(errorMsg);
      return { success: false, message: '安装过程中发生错误', details: [(error as Error).message || '未知错误'] };
    } finally {
      isInstalling.value = false;
    }
  };

  return {
    // 状态
    gameData,
    gameInfo: gameData, // 别名兼容
    loading,
    modLoaderStatus,
    modLoaderLoading,
    isInstalling,
    installResult,
    
    // 计算属性
    getGameTypeName,
    getGameImage,
    getGameDirectory,
    getGameExecutable,
    getGameName,
    getGameId,
    hasMissingModLoaders,
    
    // 方法
    setGameData,
    loadGameInfo,
    handleImageError,
    checkModLoaders,
    installModPrerequisitesMethod
  };
}