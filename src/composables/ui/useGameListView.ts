import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Modal } from 'ant-design-vue';
import { useGameApi } from '@/composables/api/useGameApi';
import { isTauriEnvironment } from '@/utils/tauri';
import { useMessage } from '@/composables/ui/useMessage';

export function useGameListView() {
  const gameApi = useGameApi();
  const router = useRouter();
  const { showError, showSuccess, showInfo } = useMessage();

  // 游戏列表
  const games = ref([]);

  // 搜索关键词
  const searchKeyword = ref('');

  // 选中的游戏类型
  const selectedGameType = ref('');

  // 加载状态
  const isLoading = computed(() => gameApi.loadingState.loading);
  const error = computed(() => gameApi.loadingState.error);

  // 过滤后的游戏列表
  const filteredGames = computed(() => {
    let filtered = games.value;

    // 按搜索关键词筛选
    if (searchKeyword.value) {
      const keyword = searchKeyword.value.toLowerCase();
      filtered = filtered.filter((game: any) =>
        game.name.toLowerCase().includes(keyword) ||
        game.dir.toLowerCase().includes(keyword)
      );
    }

    // 按游戏类型筛选
    if (selectedGameType.value) {
      if (selectedGameType.value === 'other') {
        // 筛选"其他"类型：没有type字段或type不是已知的GTA游戏类型
        filtered = filtered.filter((game: any) =>
          !game.type ||
          (game.type !== 'gta3' && game.type !== 'gtavc' && game.type !== 'gtasa' &&
            game.type !== 'GTA3' && game.type !== 'GTAVC' && game.type !== 'GTASA')
        );
      } else {
        // 筛选指定类型（支持大小写兼容）
        filtered = filtered.filter((game: any) =>
          game.type === selectedGameType.value ||
          game.type === selectedGameType.value.toUpperCase()
        );
      }
    }

    return filtered;
  });

  // 是否为空列表
  const isEmpty = computed(() => games.value.length === 0);

  // 获取游戏列表
  const fetchGames = async () => {
    try {
      const response = await gameApi.getGames();
      // 正确处理 ApiResponse 格式
      if (response?.success && response?.data) {
        games.value = response.data;
      } else {
        games.value = [];
        showError('获取游戏列表失败');
      }
    } catch (error) {
      showError('获取游戏列表失败');
      games.value = [];
    }
  };

  // 刷新游戏列表
  const refreshGames = async () => {
    await fetchGames();
  };

  // 启动游戏
  const launchGame = async (game: any) => {
    try {
      // showInfo('正在启动游戏...', { duration: 2 });
      const response = await gameApi.launchGame(game.dir, game.exe);
      if (response.success) {
        showSuccess(`游戏 "${game.name}" 启动成功！`);
      } else {
        throw new Error(response.error || '启动游戏失败');
      }
    } catch (error) {
      showError(`启动游戏失败`, {
        detail: error
      });
    }
  };

  // 打开游戏文件夹
  const openGameFolder = async (game: any) => {
    try {
      const response = await gameApi.openGameFolder(game.dir);
      if (!response.success) {
        throw new Error(response.error || '打开游戏文件夹失败');
      }
    } catch (error) {
      showError('打开游戏文件夹失败');
      throw error;
    }
  };

  // 格式化游戏时间
  const formatGameTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '未知时间';
    }
  };

  // 获取游戏图片
  const getGameIcon = (game: any) => {
    if (game.img) {
      // 如果是 data:image 格式的 base64 数据，直接返回
      if (game.img.startsWith('data:image')) {
        return game.img;
      }
      // 如果是其他格式的图片路径，也直接返回
      return game.img;
    }

    // 默认图片映射 - 支持大小写兼容
    const iconMap: Record<string, string> = {
      'gta3': '/images/gta3.jpg',
      'GTA3': '/images/gta3.jpg',
      'gtavc': '/images/gtavc.jpg',
      'GTAVC': '/images/gtavc.jpg',
      'gtasa': '/images/gtasa.jpg',
      'GTASA': '/images/gtasa.jpg'
    };

    // 如果有游戏类型，返回对应图片，否则返回默认图片
    if (game.type && iconMap[game.type]) {
      return iconMap[game.type];
    }

    return '/images/null.svg';
  };

  // 组件挂载时获取游戏列表
  onMounted(() => {
    // 在 Tauri 环境或开发环境中获取游戏列表
    if (isTauriEnvironment() || import.meta.env.DEV) {
      fetchGames();
    }
  });

  return {
    // 状态
    games,
    gameList: games, // 别名兼容
    searchKeyword,
    searchQuery: searchKeyword, // 别名兼容
    selectedGameType,
    filteredGames,
    filteredGameList: filteredGames, // 别名兼容
    isEmpty,
    isLoading,
    error,
    loadingState: gameApi.loadingState, // 兼容旧接口

    // 方法
    fetchGames,
    loadGameList: fetchGames, // 别名兼容
    refreshGames,
    refreshGameList: refreshGames, // 别名兼容
    launchGame,
    openGameFolder,
    formatGameTime,
    getGameIcon,
    getGameImage: getGameIcon, // 别名兼容

    // 添加缺失的方法（空实现）
    getGameTypeFromExecutable: (exe: string) => {
      const exeMap: Record<string, string> = {
        'gta3.exe': 'GTA III',
        'gta-vc.exe': 'GTA Vice City',
        'gtasa.exe': 'GTA San Andreas',
        'gta_sa.exe': 'GTA San Andreas'
      };
      return exeMap[exe.toLowerCase()] || '未知游戏';
    },
    getGameTypeName: (gameType: string) => {
      const typeMap: Record<string, string> = {
        'gta3': 'GTA III',
        'gtavc': 'GTA Vice City',
        'gtasa': 'GTA San Andreas',
        'GTA3': 'GTA III',
        'GTAVC': 'GTA Vice City',
        'GTASA': 'GTA San Andreas'
      };
      return gameType ? (typeMap[gameType] || null) : null;
    },
    goToAddGame: () => {
      // 路由导航需要在组件中实现
      console.log('导航到添加游戏页面');
    },
    goToGameInfo: (game: any) => {
      // 导航到游戏详情页面
      console.log('导航到游戏详情页面', game);
      router.push(`/game/info?id=${game.id}`);
    },
    confirmDelete: (game: any) => {
      Modal.confirm({
        title: '确认删除游戏',
        content: `确定要删除游戏 "${game.name}" 吗？此操作不可撤销。`,
        okText: '确认删除',
        okType: 'danger',
        cancelText: '取消',
        async onOk() {
          try {
            // showInfo('正在删除游戏...', { duration: 2 });
            const response = await gameApi.deleteGame(game.id);
            if (response.success) {
              showSuccess(`游戏 "${game.name}" 删除成功！`);
              // 刷新游戏列表
              await fetchGames();
            } else {
              throw new Error(response.error || '删除游戏失败');
            }
          } catch (error) {
            console.error('删除游戏失败:', error);
            showError(`删除游戏失败: ${error instanceof Error ? error.message : '未知错误'}`, {
              detail: error
            });
          }
        }
      });
    },
    handleImageError: (event: Event) => {
      const target = event.target as HTMLImageElement;
      if (target) {
        target.src = '/images/null.svg';
      }
    }
  };
}