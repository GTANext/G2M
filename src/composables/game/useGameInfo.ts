import { ref, computed } from 'vue';
import { GAME_IMAGES, GAME_TYPE_NAMES } from '@/constants/game';
import { useGameApi } from '@/composables/api/useGameApi';
import { isTauriEnvironment } from '@/utils/tauri';
import { useMessage } from '@/composables/ui/useMessage';

export function useGameInfo(gameId: any) {
  const gameApi = useGameApi();
  const { showError } = useMessage();
  
  // 游戏数据 - 使用 any 类型
  const gameData: any = ref({});
  
  // 加载状态
  const loading = ref(false);

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

  return {
    // 状态
    gameData,
    gameInfo: gameData, // 别名兼容
    loading,
    
    // 计算属性
    getGameTypeName,
    getGameImage,
    getGameDirectory,
    getGameExecutable,
    getGameName,
    getGameId,
    
    // 方法
    setGameData,
    loadGameInfo,
    handleImageError
  };
}