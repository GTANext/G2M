import { useGameApi } from '~/composables/api/useGameApi';
import { isTauriEnvironment } from '~/utils/tauri';
import { useMessage } from '~/composables/ui/useMessage';

export function useGameListView() {
  const gameApi = useGameApi();
  const router = useRouter();
  const { showError, showSuccess } = useMessage();

  // 游戏列表视图状态
  const viewMode = ref<'grid' | 'list'>('grid');
  const selectedGames = ref<number[]>([]);
  const isSelecting = ref(false);

  // 切换视图模式
  const toggleViewMode = () => {
    viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid';
  };

  // 切换选择模式
  const toggleSelectMode = () => {
    isSelecting.value = !isSelecting.value;
    if (!isSelecting.value) {
      selectedGames.value = [];
    }
  };

  // 切换游戏选择状态
  const toggleGameSelection = (gameId: number) => {
    const index = selectedGames.value.indexOf(gameId);
    if (index > -1) {
      selectedGames.value.splice(index, 1);
    } else {
      selectedGames.value.push(gameId);
    }
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedGames.value.length === gameApi.games.value.length) {
      selectedGames.value = [];
    } else {
      selectedGames.value = gameApi.games.value.map((game: any) => game.id);
    }
  };

  // 批量删除游戏
  const batchDeleteGames = async () => {
    if (selectedGames.value.length === 0) {
      showError('请先选择要删除的游戏');
      return;
    }

    // TODO: 使用 Nuxt UI 的确认对话框替换 ant-design-vue Modal
    const confirmed = confirm(`确定要删除选中的 ${selectedGames.value.length} 个游戏吗？`);
    if (!confirmed) return;

    try {
      const deletePromises = selectedGames.value.map((id) =>
        gameApi.deleteGame(id)
      );
      await Promise.all(deletePromises);

      // 刷新游戏列表
      await gameApi.getGames();

      // 清空选择
      selectedGames.value = [];
      isSelecting.value = false;

      showSuccess(`成功删除 ${selectedGames.value.length} 个游戏`);
    } catch (error) {
      showError('批量删除游戏失败');
    }
  };

  // 跳转到游戏详情页
  const navigateToGameInfo = (gameId: number) => {
    router.push(`/game/info?id=${gameId}`);
  };

  // 跳转到添加游戏页
  const navigateToAddGame = () => {
    router.push('/game/add');
  };

  // 组件挂载时加载游戏列表
  onMounted(async () => {
    if (isTauriEnvironment()) {
      await gameApi.getGames();
    }
  });

  return {
    // 状态
    viewMode,
    selectedGames,
    isSelecting,
    games: gameApi.games,
    loadingState: gameApi.loadingState,

    // 方法
    toggleViewMode,
    toggleSelectMode,
    toggleGameSelection,
    toggleSelectAll,
    batchDeleteGames,
    navigateToGameInfo,
    navigateToAddGame,
    refreshGames: gameApi.getGames,
  };
}
