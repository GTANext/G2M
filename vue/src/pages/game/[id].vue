<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWebview } from '@/composables/useWebview'

const route = useRoute()
const router = useRouter()

const {
    showEditGameDialog,
    showGameEdit,
    loadGameInfo,
    launchGameHandler,
    showMessage,
    selectGameExecutable,
    detectPrerequisiteModsHandler,
    isDetectingMods,
    modDetectionResult,
    gameTypes,
    defaultExecutable,
    formatAddedTime,
    handleEditDirectoryButtonClick,
    handleCustomExecutableButtonClick,
    closeEditGameDialog,
    saveGameEdit,
    confirmDeleteGame,
    currentGame,
    currentGameIndex
} = useWebview()

const game = ref(null)
const loading = ref(true)
const customExecutable = ref('')
const showModDetectionDialog = ref(false)
const detailedModResult = ref(null)

onMounted(async () => {
    const gameId = Number(route.params.id) // 强制转为数字
    if (isNaN(gameId)) {
        router.push('/')
        return
    }

    try {
        const gameData = await loadGameInfo(gameId)
        if (gameData) {
            game.value = gameData
            // 静默检测前置组件，不显示消息
            await detectPrerequisiteModsHandler(gameData, true)
        } else {
            showMessage('未找到指定的游戏', 'error')
            router.push('/')
        }
    } catch (error) {
        console.error('加载游戏信息失败:', error)
        showMessage('加载游戏信息失败', 'error')
        router.push('/')
    } finally {
        loading.value = false
    }
})

const launchGame = async () => {
    if (!game.value) return

    const gameData = {
        ...game.value,
        exe: customExecutable.value || undefined
    }

    await launchGameHandler(gameData)
}

const selectCustomExecutable = async () => {
    if (!game.value) return

    try {
        const executable = await selectGameExecutable({
            directory: game.value.directory,
            type: game.value.type
        })

        if (executable) {
            customExecutable.value = executable
            showMessage('已选择自定义可执行文件', 'success')
        }
    } catch (error) {
        console.error('选择可执行文件失败:', error)
        showMessage('选择可执行文件失败', 'error')
    }
}

const detectMods = async () => {
    if (!game.value) return

    try {
        const result = await detectPrerequisiteModsHandler(game.value)
        detailedModResult.value = result
        showModDetectionDialog.value = true
        
        // 手动点击检测时显示消息提示
        if (result.success) {
            if (result.data?.all_required_found) {
                showMessage('前置组件检测完成，所有组件已安装', 'success')
            } else {
                showMessage('前置组件检测完成，部分组件缺失', 'warning')
            }
        } else {
            showMessage('前置组件检测失败', 'warning')
        }
    } catch (error) {
        showMessage('组件检测失败', 'error')
    }
}

const goBack = () => {
    router.push('/games')
}
</script>

<template>
    <div class="d-flex mb-2">
        <div class="me-auto">
            <v-btn @click="goBack" variant="text" prepend-icon="mdi-arrow-left">
                返回游戏列表
            </v-btn>
        </div>
        <div>
            <v-btn @click="detectMods" :loading="isDetectingMods" variant="text">
                检测前置
            </v-btn>
            <v-btn @click="() => showGameEdit(game, index)" variant="text">
                设置
            </v-btn>
        </div>
    </div>


    <v-card v-if="loading" class="pa-6 text-center">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
        <div class="mt-2">加载中...</div>
    </v-card>

    <v-card v-else-if="game" class="mx-auto">
        <v-card-title class="text-h5">{{ game.name }}</v-card-title>

        <v-card-text>

        </v-card-text>
    </v-card>

    <v-card v-else class="pa-6 text-center">
        <v-icon size="64" color="error">mdi-alert-circle</v-icon>
        <div class="text-h6 mt-2">
            游戏未找到
            {{ router.currentRoute.value.fullPath }}
        </div>
        <v-btn @click="goBack" color="primary" class="mt-4">返回游戏列表</v-btn>
    </v-card>

    <v-dialog v-model="showEditGameDialog" max-width="500px">
        <v-card title="编辑游戏">
            <v-card-text>
                <v-select v-model="currentGame.type" :items="gameTypes" label="选择游戏类型" item-title="title"
                    item-value="value" variant="outlined" density="comfortable" v-if="currentGame"></v-select>

                <v-text-field v-model="currentGame.name" label="游戏显示名称（可选）" placeholder="留空则使用默认名称" variant="outlined"
                    density="comfortable" class="mt-2" v-if="currentGame"></v-text-field>

                <v-text-field v-model="currentGame.directory" label="游戏目录" variant="outlined" density="comfortable"
                    readonly @click="handleEditDirectoryButtonClick" class="mt-2" v-if="currentGame">
                    <template v-slot:append>
                        <v-btn @click="handleEditDirectoryButtonClick" variant="text" icon="mdi-folder-open">
                        </v-btn>
                    </template>
                </v-text-field>

                <v-text-field v-model="currentGame.customExecutable" label="自定义可执行文件（可选）"
                    :placeholder="`默认: ${defaultExecutable}`" variant="outlined" density="comfortable" class="mt-2"
                    v-if="currentGame">
                    <template v-slot:append>
                        <v-btn @click="handleCustomExecutableButtonClick" variant="text" icon="mdi-file-find">
                        </v-btn>
                    </template>
                </v-text-field>

                <v-list v-if="currentGame">
                    <v-list-item v-if="currentGame.addedTime">
                        <v-list-item-title>添加时间</v-list-item-title>
                        <v-list-item-subtitle>{{ formatAddedTime(currentGame.addedTime) }}</v-list-item-subtitle>
                    </v-list-item>
                    <v-list-item>
                        <v-list-item-title>默认可执行文件</v-list-item-title>
                        <v-list-item-subtitle>{{ defaultExecutable }}</v-list-item-subtitle>
                    </v-list-item>
                </v-list>
            </v-card-text>

            <v-card-actions>
                <v-btn @click="() => { closeEditGameDialog(); launchGameHandler(currentGame); }" variant="text"
                    v-if="currentGame">
                    启动游戏
                </v-btn>
                <v-spacer></v-spacer>
                <v-btn @click="() => confirmDeleteGame(currentGame, currentGameIndex)" color="error" variant="text"
                    v-if="currentGameIndex !== null">
                    删除
                </v-btn>

                <v-btn @click="closeEditGameDialog" variant="text">取消</v-btn>
                <v-btn @click="saveGameEdit" color="primary" v-if="currentGame">
                    保存
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <v-dialog v-model="showModDetectionDialog" max-width="800">
        <v-card>
            <v-card-title class="headline">
                前置组件检测结果
            </v-card-title>
            <v-card-text>
                <div v-if="detailedModResult">
                    <div v-if="detailedModResult.success">
                        <v-alert :type="detailedModResult.data?.all_required_found ? 'success' : 'warning'" class="mb-4">
                            {{ detailedModResult.data?.all_required_found ? '所有必需的前置组件都已安装' : '部分前置组件缺失' }}
                        </v-alert>
                        
                        <div class="mb-4">
                            <v-chip v-for="dir in detailedModResult.data?.checked_directories" :key="dir" 
                                    small class="mr-2 mb-2" color="primary">
                                {{ dir }}
                            </v-chip>
                        </div>
                        
                        <div v-if="detailedModResult.data?.found_mods_details.length" class="mb-4">
                            <h4 class="subtitle-1">已安装的前置组件</h4>
                            <v-list dense>
                                <v-list-item v-for="modDetail in detailedModResult.data.found_mods_details" :key="modDetail.mod_file">
                                    <v-list-item-content>
                                        <v-list-item-title>{{ modDetail.mod_file }}</v-list-item-title>
                                        <v-list-item-subtitle>
                                            位置: {{ modDetail.directory_name }} ({{ modDetail.directory_path }})
                                        </v-list-item-subtitle>
                                        <v-list-item-subtitle class="text-caption">
                                            完整路径: {{ modDetail.full_path }}
                                        </v-list-item-subtitle>
                                    </v-list-item-content>
                                </v-list-item>
                            </v-list>
                        </div>
                        
                        <div v-if="detailedModResult.data?.missing_mods.length" class="mb-4">
                            <h4 class="subtitle-1 text-error">缺失的组件:</h4>
                            <v-list dense>
                                <v-list-item v-for="mod in detailedModResult.data.missing_mods" :key="mod">
                                    <v-list-item-content>
                                        <v-list-item-title class="text-error">{{ mod }}</v-list-item-title>
                                        <v-list-item-subtitle class="text-error">
                                            在所有检查的目录中均未找到此文件
                                        </v-list-item-subtitle>
                                    </v-list-item-content>
                                </v-list-item>
                            </v-list>
                        </div>
                    </div>
                    <div v-else>
                        <v-alert type="error" class="mb-4">
                            <v-icon class="mr-2">mdi-alert-circle</v-icon>
                            {{ detailedModResult.message || 'Mod检测失败' }}
                        </v-alert>
                    </div>
                </div>
                <div v-else>
                    <div class="text-center py-4">
                        <v-progress-circular indeterminate color="primary"></v-progress-circular>
                        <div class="mt-2">正在检测mod...</div>
                    </div>
                </div>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="primary" @click="showModDetectionDialog = false">关闭</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<style scoped></style>