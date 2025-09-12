import { ref, type Ref } from 'vue'

// 扩展Window接口
declare global {
  interface Window {
    pywebview?: {
      api: {
        [key: string]: (...args: any[]) => Promise<any>
      }
    }
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

  return {
    // 状态
    isApiAvailable: isApiAvailable as Ref<boolean>,
    isApiReady: isApiReady as Ref<boolean>,

    // 方法
    checkApiAvailability,
    waitForApi,
    callApiMethod,
    getGames,
    addGame,
    updateGame,
    launchGame,
    selectDirectory,
    selectGameExecutable
  }
}
