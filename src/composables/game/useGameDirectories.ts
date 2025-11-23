import { ref, watch, computed, type Ref, type ComputedRef } from 'vue'
import { tauriInvoke } from '@/utils/tauri'

/**
 * 游戏目录检测 Composable
 * 用于检测游戏目录中是否存在 plugins 和 scripts 文件夹
 * 
 * @param gameDir 游戏目录路径，可以是 string、Ref<string> 或 ComputedRef<string>，也可以不传
 * @returns 返回检测结果和方法
 */
export function useGameDirectories(gameDir?: string | Ref<string> | ComputedRef<string>) {
    // 游戏目录检测结果
    const hasPlugins = ref(false)
    const hasScripts = ref(false)
    const checkingDirs = ref(false)

    /**
     * 获取当前游戏目录值
     */
    const getGameDirValue = () => {
        if (!gameDir) return ''
        if (typeof gameDir === 'string') return gameDir
        if (typeof gameDir === 'function') return gameDir()
        if (gameDir && typeof gameDir === 'object' && 'value' in gameDir) {
            return gameDir.value
        }
        return ''
    }

    /**
     * 检查游戏目录
     * @param dir 游戏目录路径，如果不提供则使用传入的 gameDir
     */
    const checkGameDirectories = async (dir?: string) => {
        const targetDir = dir || getGameDirValue()
        
        if (!targetDir) {
            // 如果没有提供游戏目录，默认显示所有选项
            hasPlugins.value = true
            hasScripts.value = true
            return
        }

        try {
            checkingDirs.value = true
            const response = await tauriInvoke('check_game_directories', {
                gameDir: targetDir
            })

            if (response?.success && response?.data) {
                hasPlugins.value = response.data.has_plugins || false
                hasScripts.value = response.data.has_scripts || false
            } else {
                // 如果检测失败，默认显示所有选项
                hasPlugins.value = true
                hasScripts.value = true
            }
        } catch (error) {
            // 如果检测出错，默认显示所有选项
            hasPlugins.value = true
            hasScripts.value = true
        } finally {
            checkingDirs.value = false
        }
    }

    // 如果传入了 gameDir，监听其变化
    if (gameDir) {
        watch(
            () => getGameDirValue(),
            (newDir) => {
                if (newDir) {
                    checkGameDirectories(newDir)
                }
            },
            { immediate: true }
        )
    }

    return {
        hasPlugins,
        hasScripts,
        checkingDirs,
        checkGameDirectories
    }
}

