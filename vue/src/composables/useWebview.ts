import { ref, type Ref, computed } from 'vue'

// 扩展Window接口
declare global {
  interface Window {
    pywebview?: {
      api: {
        [key: string]: (...args: any[]) => Promise<any>
      }
    }
    motyf?: any // 声明 motyf 全局变量
  }
}

interface GameData {
  type: string
  directory: string
  name?: string
  customExecutable?: string
  addedTime?: number
  exe?: string
  index?: number
}

interface DirectorySelectionOptions {
  title?: string
}

interface ExecutableSelectionOptions {
  directory?: string
  type?: string
}

export function useWebview() {
  const isApiAvailable = ref(false)
  const isApiReady = ref(false)

  // 状态管理
  const games = ref<GameData[]>([])
  const isGamesLoading = ref(false)
  const selectedGameType = ref<string>('')
  const gameDirectory = ref<string>('')
  const gameName = ref<string>('')
  const isAddingGame = ref(false)
  const showAddGameDialog = ref(false)
  const showEditGameDialog = ref(false)
  const currentGame = ref<GameData | null>(null)
  const currentGameIndex = ref<number | null>(null)

  // 游戏类型和图片数据
  const gameTypes = [
    { value: 'GTA3', title: 'GTA III' },
    { value: 'GTAVC', title: 'GTA Vice City' },
    { value: 'GTASA', title: 'GTA San Andreas' }
  ]

  const gameImages = [
    { value: 'GTA3', src: 'images/games/gta3.jpg' },
    { value: 'GTAVC', src: 'images/games/gtavc.jpg' },
    { value: 'GTASA', src: 'images/games/gtasa.jpg' }
  ]

  // 显示消息的辅助函数
  const showMessage = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', options: any = {}) => {
    if (window.motyf) {
      window.motyf({
        content: message,
        type,
        ...options
      })
    } else {
      console[type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log'](message)
    }
  }

  // 检查API是否可用
  const checkApiAvailability = () => {
    isApiAvailable.value = typeof window.pywebview !== 'undefined' && window.pywebview?.api !== undefined
    return isApiAvailable.value
  }

  // 等待API准备就绪
  const waitForApi = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (checkApiAvailability()) {
        isApiReady.value = true
        resolve(true)
        return
      }

      const timer = setInterval(() => {
        if (checkApiAvailability()) {
          clearInterval(timer)
          isApiReady.value = true
          resolve(true)
        }
      }, 100)

      // 超时处理
      setTimeout(() => {
        clearInterval(timer)
        resolve(false)
      }, 5000)
    })
  }

  // 调用API方法的通用函数
  const callApiMethod = async <T>(methodName: string, params?: any): Promise<T> => {
    if (!isApiAvailable.value && !checkApiAvailability()) {
      throw new Error('API不可用')
    }

    try {
      const method = window.pywebview!.api[methodName]
      if (!method) {
        throw new Error(`API方法 "${methodName}" 不存在`)
      }

      // 如果没有参数，直接调用方法
      if (params === undefined) {
        return await method()
      }

      return await method(params)
    } catch (error) {
      console.error(`调用API方法 "${methodName}" 时出错:`, error)
      throw error
    }
  }

  // 获取游戏列表
  const getGames = async (): Promise<GameData[]> => {
    return await callApiMethod<GameData[]>('get_games')
  }

  // 添加游戏
  const addGame = async (gameData: Omit<GameData, 'addedTime' | 'index'>) => {
    return await callApiMethod<{ success: boolean; message: string }>('add_game', gameData)
  }

  // 更新游戏
  const updateGame = async (gameData: GameData & { index: number }) => {
    return await callApiMethod<{ success: boolean; message: string }>('update_game', gameData)
  }

  // 启动游戏
  const launchGame = async (gameData: GameData) => {
    return await callApiMethod<{ success: boolean; message: string }>('launch_game', gameData)
  }

  // 选择目录
  const selectDirectory = async (options?: DirectorySelectionOptions) => {
    return await callApiMethod<string | null>('select_directory', options)
  }

  // 选择游戏可执行文件
  const selectGameExecutable = async (options?: ExecutableSelectionOptions) => {
    return await callApiMethod<string | null>('select_game_executable', options)
  }

  // 加载游戏列表
  const loadGames = async () => {
    isGamesLoading.value = true
    try {
      const loadedGames = await getGames()
      games.value = loadedGames
    } catch (error) {
      console.error('加载游戏列表失败:', error)
      showMessage('加载游戏列表失败', 'error')
    } finally {
      isGamesLoading.value = false
    }
  }

  // 选择目录处理
  const selectDirectoryHandler = async () => {
    try {
      const directory = await selectDirectory()
      if (directory) {
        gameDirectory.value = directory
      }
    } catch (error) {
      console.error('选择目录失败:', error)
      showMessage('选择目录失败', 'error')
    }
  }

  // 选择编辑目录处理
  const selectEditDirectoryHandler = async () => {
    if (!currentGame.value) return

    try {
      const directory = await selectDirectory()
      if (directory) {
        currentGame.value.directory = directory
      }
    } catch (error) {
      console.error('选择目录失败:', error)
      showMessage('选择目录失败', 'error')
    }
  }

  // 选择自定义可执行文件
  const selectCustomExecutable = async () => {
    if (!currentGame.value) return

    try {
      const executable = await selectGameExecutable({
        directory: currentGame.value.directory,
        type: currentGame.value.type
      })
      if (executable) {
        currentGame.value.customExecutable = executable
      }
    } catch (error) {
      console.error('选择可执行文件失败:', error)
      showMessage('选择可执行文件失败', 'error')
    }
  }

  // 添加游戏处理
  const addGameHandler = async () => {
    if (!selectedGameType.value || !gameDirectory.value) {
      showMessage('请选择游戏类型和目录', 'error')
      return
    }

    isAddingGame.value = true
    try {
      const result = await addGame({
        type: selectedGameType.value,
        directory: gameDirectory.value,
        name: gameName.value || undefined
      })

      if (result.success) {
        showMessage('游戏添加成功', 'success')
        await loadGames()
        closeAddGameDialog()
      } else {
        showMessage(result.message || '添加游戏失败', 'error')
      }
    } catch (error) {
      console.error('添加游戏失败:', error)
      showMessage('添加游戏失败', 'error')
    } finally {
      isAddingGame.value = false
    }
  }

  // 显示游戏编辑对话框
  const showGameEdit = (game: GameData, index: number) => {
    currentGame.value = { ...game }
    currentGameIndex.value = index
    showEditGameDialog.value = true
  }

  // 关闭编辑游戏对话框
  const closeEditGameDialog = () => {
    showEditGameDialog.value = false
    currentGame.value = null
    currentGameIndex.value = null
  }

  // 保存游戏编辑
  const saveGameEdit = async () => {
    if (!currentGame.value || currentGameIndex.value === null) return

    try {
      const result = await updateGame({
        ...currentGame.value,
        index: currentGameIndex.value
      })

      if (result.success) {
        showMessage('游戏更新成功', 'success')
        await loadGames()
        closeEditGameDialog()
      } else {
        showMessage(result.message || '更新游戏失败', 'error')
      }
    } catch (error) {
      console.error('更新游戏失败:', error)
      showMessage('更新游戏失败', 'error')
    }
  }

  // 启动游戏处理
  const launchGameHandler = async (game: GameData) => {
    try {
      const result = await launchGame(game)
      if (result.success) {
        showMessage('游戏启动成功', 'success')
      } else {
        showMessage(result.message || '启动游戏失败', 'error')
      }
    } catch (error) {
      console.error('启动游戏失败:', error)
      showMessage('启动游戏失败', 'error')
    }
  }

  // 选择游戏可执行文件处理
  const selectGameExecutableHandler = async (game: GameData) => {
    try {
      const executable = await selectGameExecutable({
        directory: game.directory,
        type: game.type
      })
      if (executable) {
        // 更新游戏的可执行文件
        const index = games.value.findIndex(g => g.directory === game.directory)
        if (index !== -1) {
          games.value[index].exe = executable
        }
      }
    } catch (error) {
      console.error('选择可执行文件失败:', error)
      showMessage('选择可执行文件失败', 'error')
    }
  }

  // 打开添加游戏对话框
  const openAddGameDialog = () => {
    showAddGameDialog.value = true
    selectedGameType.value = ''
    gameDirectory.value = ''
    gameName.value = ''
  }

  // 关闭添加游戏对话框
  const closeAddGameDialog = () => {
    showAddGameDialog.value = false
    selectedGameType.value = ''
    gameDirectory.value = ''
    gameName.value = ''
  }

  // 格式化添加时间
  const formatAddedTime = (timestamp: number) => {
    if (!timestamp) return '未知时间'
    return new Date(timestamp).toLocaleString()
  }

  // 根据游戏类型获取对应的图片
  const getGameImage = (gameType: string) => {
    const gameImage = gameImages.find(img => img.value === gameType)
    return gameImage ? gameImage.src : 'images/heishou.jpg'
  }

  // 计算属性用于编辑对话框中的默认exe文件名
  const defaultExecutable = computed(() => {
    if (!currentGame.value || !currentGame.value.type) return '未知'

    switch (currentGame.value.type) {
      case 'GTA3': return 'gta3.exe'
      case 'GTAVC': return 'gta-vc.exe'
      case 'GTASA': return 'gta-sa.exe'
      default: return '未知'
    }
  })

  return {
    // 状态
    isApiAvailable,
    isApiReady,
    games,
    isGamesLoading,
    selectedGameType,
    gameDirectory,
    gameName,
    isAddingGame,
    showAddGameDialog,
    showEditGameDialog,
    currentGame,
    currentGameIndex,
    gameTypes,
    gameImages,

    // 方法
    waitForApi,
    loadGames,
    selectDirectoryHandler,
    selectEditDirectoryHandler,
    selectCustomExecutable,
    addGameHandler,
    showGameEdit,
    closeEditGameDialog,
    saveGameEdit,
    launchGameHandler,
    selectGameExecutableHandler,
    openAddGameDialog,
    closeAddGameDialog,
    formatAddedTime,
    getGameImage,

    // 计算属性
    defaultExecutable
  }
}