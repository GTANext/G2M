import { ref, onMounted, computed, type Ref } from 'vue';
import { message } from 'ant-design-vue';
import type { GameInfo } from '@/types';
import { useGameApi } from '@/composables/api/useGameApi';

export function useGameList(selectedGameType?: Ref<string>) {
  const gameApi = useGameApi();

  // 游戏列表
  const gameList = ref<GameInfo[]>([]);

  // 搜索关键词
  const searchKeyword = ref('');

  // 过滤后的游戏列表
  const filteredGameList = computed(() => {
    let filtered = gameList.value;

    // 按搜索关键词筛选
    if (searchKeyword.value) {
      const keyword = searchKeyword.value.toLowerCase();
      filtered = filtered.filter(game =>
        game.name.toLowerCase().includes(keyword) ||
        game.dir.toLowerCase().includes(keyword)
      );
    }

    // 按游戏类型筛选
    if (selectedGameType?.value) {
      filtered = filtered.filter(game => {
        const gameType = getGameTypeFromExecutable(game.exe);
        return gameType === selectedGameType.value;
      });
    }

    return filtered;
  });

  // 是否为空列表
  const isEmpty = computed(() => gameList.value.length === 0);

  // 是否正在加载
  const isLoading = computed(() => gameApi.loadingState.loading);

  // 加载游戏列表
  const loadGameList = async () => {
    try {
      const games = await gameApi.getGames();
      gameList.value = games || [];
    } catch (error) {
      console.error('加载游戏列表失败:', error);
      const errorMessage = error instanceof Error ? error.message : '加载游戏列表时发生未知错误';
      message.error(`加载游戏列表失败: ${errorMessage}`);
    }
  };

  // 刷新游戏列表
  const refreshGameList = async () => {
    await loadGameList();
  };

  // 格式化游戏添加时间
  const formatGameTime = (timeString: string): string => {
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

  // 获取游戏封面
  const getGameIcon = (game: GameInfo): string => {
    if (game.img) {
      return game.img;
    }

    // 优先使用 game_type 字段，其次根据可执行文件推断
    const gameType = game.game_type || getGameTypeFromExecutable(game.exe);
    const coverMap: Record<string, string> = {
      'gta3': '/images/gta3.jpg',
      'gtavc': '/images/gtavc.jpg',
      'gtasa': '/images/gtasa.jpg'
    };

    return coverMap[gameType] || '/images/null.svg';
  };

  // 根据可执行文件名判断游戏类型
  const getGameTypeFromExecutable = (executable: string): string => {
    const exeMap: Record<string, string> = {
      'gta3.exe': 'gta3',
      'gta-vc.exe': 'gtavc',
      'gtasa.exe': 'gtasa'
    };
    return exeMap[executable.toLowerCase()] || 'unknown';
  };

  // 启动游戏（预留功能）
  const launchGame = async (game: GameInfo) => {
    try {
      // 这里可以调用 Tauri 命令来启动游戏
      message.info(`启动游戏: ${game.name}`);
      // TODO: 实现游戏启动逻辑
    } catch (error) {
      console.error('启动游戏失败:', error);
      message.error('启动游戏失败');
    }
  };

  // 删除游戏（预留功能）
  const deleteGame = async (gameId: number) => {
    try {
      // TODO: 实现删除游戏逻辑
      message.info('删除游戏功能待实现');
    } catch (error) {
      console.error('删除游戏失败:', error);
      message.error('删除游戏失败');
    }
  };

  // 编辑游戏（预留功能）
  const editGame = async (game: GameInfo) => {
    try {
      // TODO: 实现编辑游戏逻辑
      message.info('编辑游戏功能待实现');
    } catch (error) {
      console.error('编辑游戏失败:', error);
      message.error('编辑游戏失败');
    }
  };

  // 组件挂载时加载游戏列表
  onMounted(() => {
    loadGameList();
  });

  return {
    // 状态
    gameList,
    searchKeyword,
    filteredGameList,
    isEmpty,
    isLoading,
    loadingState: gameApi.loadingState,

    // 方法
    loadGameList,
    refreshGameList,
    formatGameTime,
    getGameIcon,
    getGameTypeFromExecutable,
    launchGame,
    deleteGame,
    editGame
  };
}