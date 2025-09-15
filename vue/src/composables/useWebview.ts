import {ref, type Ref, computed} from 'vue'

declare global {
    interface Window {
        pywebview?: {
            api: {
                [key: string]: (...args: any[]) => Promise<any>
            }
        }
        motyf?: any
    }
}

interface GameData {
    id?: number
    type: string
    directory: string
    name?: string
    customExecutable?: string
    addedTime?: number | string
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

interface DeleteGameOptions {
    index: number
}

export function useWebview() {
    const isApiAvailable = ref(false)
    const isApiReady = ref(false)

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

    const gameTypes = [
        {value: 'GTA3', title: 'GTA III'},
        {value: 'GTAVC', title: 'GTA Vice City'},
        {value: 'GTASA', title: 'GTA San Andreas'}
    ]

    const gameImages = [
        {value: 'GTA3', src: 'images/games/gta3.jpg'},
        {value: 'GTAVC', src: 'images/games/gtavc.jpg'},
        {value: 'GTASA', src: 'images/games/gtasa.jpg'}
    ]

    // 消息显示函数
    type MessageType = 'success' | 'error' | 'warning' | 'info'
    const showMessage = (message: string, type: MessageType = 'info', duration?: number) => {
        if (window.motyf) {
            const options: { content: string; type: MessageType; time?: number } = {content: message, type}
            if (duration !== undefined) options.time = duration
            window.motyf(options)
        } else {
            const consoleMethods: Record<MessageType, keyof Console> = {
                success: 'log',
                error: 'error',
                warning: 'warn',
                info: 'info'
            }

            const method = consoleMethods[type]
            ;(console[method] as (...args: any[]) => void)(`[${type.toUpperCase()}] ${message}`)
        }
    }
    // 改进的时间格式化函数
    const formatAddedTime = (timestamp: number | string | undefined): string => {
        if (!timestamp) return '未知时间'

        // 处理字符串类型的时间戳
        const timestampNum = typeof timestamp === 'string'
            ? parseInt(timestamp, 10)
            : timestamp

        // 验证时间戳有效性
        if (isNaN(timestampNum) || timestampNum <= 0) {
            return '未知时间'
        }

        // 处理秒级时间戳（10位）
        const adjustedTimestamp = timestampNum < 10000000000
            ? timestampNum * 1000
            : timestampNum

        try {
            return new Date(adjustedTimestamp).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).replace(/\//g, '-')
        } catch (e) {
            console.error('格式化时间失败:', e)
            return '未知时间'
        }
    }

    const checkApiAvailability = () => {
        isApiAvailable.value = typeof window.pywebview !== 'undefined' && window.pywebview?.api !== undefined
        return isApiAvailable.value
    }

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

            setTimeout(() => {
                clearInterval(timer)
                resolve(false)
            }, 5000)
        })
    }

    const callApiMethod = async <T>(methodName: string, params?: any): Promise<T> => {
        if (!isApiAvailable.value && !checkApiAvailability()) {
            throw new Error('API不可用')
        }

        try {
            const method = window.pywebview!.api[methodName]
            if (!method) {
                throw new Error(`API方法 "${methodName}" 不存在`)
            }
            return params === undefined ? await method() : await method(params)
        } catch (error) {
            console.error(`调用API方法 "${methodName}" 时出错:`, error)
            throw error
        }
    }

    const getGames = async (): Promise<GameData[]> => {
        return await callApiMethod<GameData[]>('get_games')
    }

    const addGame = async (gameData: Omit<GameData, 'addedTime' | 'index' | 'id'>) => {
        return await callApiMethod<{ success: boolean; message: string }>('add_game', gameData)
    }

    const updateGame = async (gameData: GameData & { index: number }) => {
        return await callApiMethod<{ success: boolean; message: string }>('update_game', gameData)
    }

    const deleteGame = async (options: DeleteGameOptions) => {
        return await callApiMethod<{ success: boolean; message: string }>('delete_game', options)
    }

    const launchGame = async (gameData: GameData) => {
        return await callApiMethod<{ success: boolean; message: string }>('launch_game', gameData)
    }

    const selectDirectory = async (options?: DirectorySelectionOptions) => {
        return await callApiMethod<string | null>('select_directory', options)
    }

    const selectGameExecutable = async (options?: ExecutableSelectionOptions) => {
        return await callApiMethod<string | null>('select_game_executable', options)
    }

    const loadGames = async () => {
        isGamesLoading.value = true
        try {
            const loadedGames = await getGames()
            // 确保时间戳有效
            games.value = loadedGames.map(game => ({
                ...game,
                addedTime: game.addedTime && !isNaN(Number(game.addedTime))
                    ? Number(game.addedTime)
                    : Date.now()
            }))
        } catch (error) {
            console.error('加载游戏列表失败:', error)
            showMessage('加载游戏列表失败', 'error')
        } finally {
            isGamesLoading.value = false
        }
    }

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
                showMessage('游戏添加成功', 'success', 2000)
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

    const showGameEdit = (game: GameData, index: number) => {
        currentGame.value = {...game}
        currentGameIndex.value = index
        showEditGameDialog.value = true
    }

    const closeEditGameDialog = () => {
        showEditGameDialog.value = false
        currentGame.value = null
        currentGameIndex.value = null
    }

    const saveGameEdit = async () => {
        if (!currentGame.value || currentGameIndex.value === null) return

        try {
            const result = await updateGame({
                ...currentGame.value,
                index: currentGameIndex.value
            })

            if (result.success) {
                showMessage('游戏更新成功', 'success', 2000)
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

    const deleteGameHandler = async () => {
        if (currentGameIndex.value === null || currentGameIndex.value === undefined) return

        try {
            // 确保传递的是正确的对象格式
            const result = await deleteGame({index: Number(currentGameIndex.value)})

            if (result.success) {
                showMessage(result.message || '游戏删除成功', 'success', 2000)
                await loadGames()
                closeEditGameDialog()
            } else {
                showMessage(result.message || '删除游戏失败', 'error')
            }
        } catch (error) {
            console.error('删除游戏失败:', error)
            showMessage('删除游戏失败', 'error')
        }
    }


    const launchGameHandler = async (game: GameData) => {
        try {
            const result = await launchGame(game)
            if (result.success) {
                showMessage('游戏启动成功', 'success', 2000)
            } else {
                showMessage(result.message || '启动游戏失败', 'error')
            }
        } catch (error) {
            console.error('启动游戏失败:', error)
            showMessage('启动游戏失败', 'error')
        }
    }

    const selectGameExecutableHandler = async (game: GameData) => {
        try {
            const executable = await selectGameExecutable({
                directory: game.directory,
                type: game.type
            })
            if (executable) {
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

    const openAddGameDialog = () => {
        showAddGameDialog.value = true
        selectedGameType.value = ''
        gameDirectory.value = ''
        gameName.value = ''
    }

    const closeAddGameDialog = () => {
        showAddGameDialog.value = false
        selectedGameType.value = ''
        gameDirectory.value = ''
        gameName.value = ''
    }

    const getGameImage = (gameType: string) => {
        const gameImage = gameImages.find(img => img.value === gameType)
        return gameImage ? gameImage.src : 'images/heishou.jpg'
    }

    const defaultExecutable = computed(() => {
        if (!currentGame.value || !currentGame.value.type) return '未知'
        switch (currentGame.value.type) {
            case 'GTA3':
                return 'gta3.exe'
            case 'GTAVC':
                return 'gta-vc.exe'
            case 'GTASA':
                return 'gta-sa.exe'
            default:
                return '未知'
        }
    })

    return {
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
        waitForApi,
        loadGames,
        selectDirectoryHandler,
        selectEditDirectoryHandler,
        selectCustomExecutable,
        addGameHandler,
        showGameEdit,
        closeEditGameDialog,
        saveGameEdit,
        deleteGameHandler,
        launchGameHandler,
        selectGameExecutableHandler,
        openAddGameDialog,
        closeAddGameDialog,
        formatAddedTime,
        getGameImage,
        defaultExecutable
    }
}