<script setup>
import { ref, onMounted, computed } from 'vue'

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

const selectedGameType = ref('')
const gameDirectory = ref('')
const gameName = ref('')  // 自定义游戏名称
const isAddingGame = ref(false)
const isEditingGame = ref(false) // 是否正在编辑游戏
const games = ref([])
const showAddGameDialog = ref(false) // 控制添加游戏对话框显示状态
const showEditGameDialog = ref(false) // 控制编辑游戏对话框显示状态
const currentGame = ref(null) // 当前查看的游戏
const currentGameIndex = ref(null) // 当前查看的游戏索引

// 页面加载时获取游戏列表
onMounted(async () => {
  // 确保 pywebview API 已经准备好
  if (typeof window.pywebview !== 'undefined' && window.pywebview.api) {
    await loadGames()
  } else {
    console.warn('pywebview API 尚未准备好')
    // 设置一个定时器重试
    setTimeout(async () => {
      if (typeof window.pywebview !== 'undefined' && window.pywebview.api) {
        await loadGames()
      }
    }, 1000)
  }
})

const loadGames = async () => {
  try {
    console.log("开始获取游戏列表")
    if (!window.pywebview || !window.pywebview.api) {
      console.error('pywebview API 不可用')
      motyf.error("系统错误：API不可用")
      return
    }

    const result = await window.pywebview.api.get_games()
    console.log("获取到的游戏列表:", result)
    games.value = result || []  // 确保即使返回 undefined 也设置为空数组
    console.log("games.value 更新为:", games.value)
  } catch (error) {
    console.error('获取游戏列表时出错:', error)
    motyf.error("获取游戏列表失败：" + error.message)
    games.value = []  // 出错时设置为空数组
  }
}

const selectDirectory = async () => {
  try {
    if (!window.pywebview || !window.pywebview.api) {
      motyf.error("系统错误：API不可用")
      return
    }

    const result = await window.pywebview.api.select_directory()
    if (result) {
      gameDirectory.value = result
    }
  } catch (error) {
    motyf.error("选择目录失败：" + error.message)
    console.error('选择目录时出错:', error)
  }
}

const selectEditDirectory = async () => {
  try {
    if (!window.pywebview || !window.pywebview.api) {
      motyf.error("系统错误：API不可用")
      return
    }

    const result = await window.pywebview.api.select_directory()
    if (result && currentGame.value) {
      currentGame.value.directory = result
    }
  } catch (error) {
    motyf.error("选择目录失败：" + error.message)
    console.error('选择目录时出错:', error)
  }
}

// 选择自定义可执行文件
const selectCustomExecutable = async () => {
  try {
    if (!window.pywebview || !window.pywebview.api) {
      motyf.error("系统错误：API不可用")
      return
    }

    const result = await window.pywebview.api.select_game_executable({
      directory: currentGame.value?.directory || ''
    })

    if (result && currentGame.value) {
      // 从完整路径中提取文件名
      const fileName = result.split('\\').pop().split('/').pop()
      currentGame.value.customExecutable = fileName
    }
  } catch (error) {
    motyf.error("选择可执行文件失败：" + error.message)
    console.error('选择可执行文件时出错:', error)
  }
}

const addGame = async () => {
  if (!selectedGameType.value || !gameDirectory.value) {
    motyf.warning("请选择游戏类型和目录")
    return
  }

  isAddingGame.value = true
  try {
    if (!window.pywebview || !window.pywebview.api) {
      motyf.error("系统错误：API不可用")
      return
    }

    const result = await window.pywebview.api.add_game({
      type: selectedGameType.value,
      directory: gameDirectory.value,
      name: gameName.value.trim() || undefined  // 如果没有输入名称，则不传递该字段
    })

    if (result.success) {
      motyf.success("游戏添加成功！")
      selectedGameType.value = ''
      gameDirectory.value = ''
      gameName.value = ''  // 清空名称输入框
      showAddGameDialog.value = false // 关闭对话框
      // 重新加载游戏列表
      await loadGames()
    } else {
      motyf.error("添加失败: " + result.message)
    }
  } catch (error) {
    motyf.error("添加游戏时出错：" + error.message)
    console.error(error)
  } finally {
    isAddingGame.value = false
  }
}

// 显示游戏编辑对话框（默认模式）
const showGameEdit = (game, index) => {
  // 创建一个响应式副本而不是简单复制
  currentGame.value = {
    type: game.type || '',
    name: game.name || '',
    directory: game.directory || '',
    customExecutable: game.customExecutable || '' // 自定义可执行文件
  }
  currentGameIndex.value = index
  showEditGameDialog.value = true
}

// 关闭编辑游戏对话框
const closeEditGameDialog = () => {
  showEditGameDialog.value = false
  currentGame.value = null
  currentGameIndex.value = null
}

// 保存游戏修改
const saveGameEdit = async () => {
  if (!currentGame.value || !currentGame.value.type || !currentGame.value.directory) {
    motyf.warning("请选择游戏类型和目录")
    return
  }

  try {
    if (!window.pywebview || !window.pywebview.api) {
      motyf.error("系统错误：API不可用")
      return
    }

    // 调用API更新游戏信息
    const result = await window.pywebview.api.update_game({
      index: currentGameIndex.value,
      type: currentGame.value.type,
      directory: currentGame.value.directory,
      name: currentGame.value.name || undefined,
      customExecutable: currentGame.value.customExecutable || undefined
    })

    if (result.success) {
      motyf.success("游戏信息更新成功！")
      showEditGameDialog.value = false
      currentGame.value = null
      currentGameIndex.value = null
      // 重新加载游戏列表
      await loadGames()
    } else {
      motyf.error("更新失败: " + result.message)
    }
  } catch (error) {
    motyf.error("更新游戏信息时出错：" + error.message)
    console.error(error)
  }
}

// 启动游戏
const launchGame = async (game) => {
  try {
    if (!window.pywebview || !window.pywebview.api) {
      motyf.error("系统错误：API不可用")
      return
    }

    console.log("尝试启动游戏:", game); // 调试信息

    // 直接尝试启动游戏，传递自定义exe
    const result = await window.pywebview.api.launch_game({
      type: game.type,
      directory: game.directory,
      exe: game.customExecutable || undefined
    })

    console.log("启动游戏结果:", result); // 调试信息

    if (result.success) {
      motyf.success("游戏启动成功！")
    } else {
      motyf.error("启动失败: " + result.message)
      // 如果启动失败，让用户选择exe文件
      selectGameExecutable(game)
    }
  } catch (error) {
    console.error("启动游戏时出错:", error) // 调试信息
    motyf.error("启动游戏时出错：" + error.message)
    // 出错时也让用户选择exe文件
    selectGameExecutable(game)
  }
}

// 选择游戏可执行文件
const selectGameExecutable = async (game) => {
  try {
    if (!window.pywebview || !window.pywebview.api) {
      motyf.error("系统错误：API不可用")
      return
    }

    // 使用pywebview的文件选择器选择exe文件
    const exePath = await window.pywebview.api.select_game_executable({
      type: game.type,
      directory: game.directory
    })

    if (exePath) {
      // 选择成功后启动游戏
      const result = await window.pywebview.api.launch_game({
        type: game.type,
        directory: game.directory,
        exe: exePath
      })

      if (result.success) {
        motyf.success("游戏启动成功！")
      } else {
        motyf.error("启动失败: " + result.message)
      }
    }
  } catch (error) {
    motyf.error("选择游戏文件时出错：" + error.message)
    console.error(error)
  }
}

// 根据游戏类型获取对应的图片
const getGameImage = (gameType) => {
  const gameImage = gameImages.find(img => img.value === gameType)
  return gameImage ? gameImage.src : 'images/heishou.jpg'
}

// 打开添加游戏对话框
const openAddGameDialog = () => {
  showAddGameDialog.value = true
}

// 关闭添加游戏对话框
const closeAddGameDialog = () => {
  showAddGameDialog.value = false
  // 清空表单数据
  selectedGameType.value = ''
  gameDirectory.value = ''
  gameName.value = ''
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
</script>

<template>
  <v-alert class="mb-3" text="还在开发中! 如有疑问请加群: 829270254" type="info" variant="tonal"></v-alert>

  <v-card title="欢迎使用 ModLoader" subtitle="可视化安装 III.VC.SA 的 Mod / Cleo">
    <template v-slot:append>
      <v-btn
        icon="mdi-plus"
        variant="text"
        @click="openAddGameDialog"
      ></v-btn>
    </template>
  </v-card>

  <!-- 游戏列表标题 -->
  <div class="d-flex">
      <div class="pa-2 me-auto">
        <v-card-title v-if="games && games.length > 0" class="text-h6 pa-0 mt-4 mb-2">
          已添加的游戏
        </v-card-title>
      </div>
      <div class="pa-2 align-self-center">
        <v-btn color="primary" @click="openAddGameDialog">添加游戏</v-btn>
      </div>
  </div>

  <v-row v-if="games && games.length > 0">
    <v-col
      v-for="(game, index) in games"
      :key="index"
      cols="12"
      sm="6"
      md="4"
    >
      <v-card class="mx-auto" height="100%">
        <v-img
          height="200px"
          :src="getGameImage(game?.type)"
          cover
        ></v-img>

        <v-card-title>
          {{ game?.name || game?.type || '未知游戏' }}
        </v-card-title>

        <v-card-actions>

          <v-btn
            color="orange-lighten-2"
            variant="text"
            @click="launchGame(game)"
          >
            启动游戏
          </v-btn>

          <v-spacer></v-spacer>
          <v-chip
            :color="game?.type === 'GTA3' ? 'blue' : game?.type === 'GTAVC' ? 'green' : 'orange'"
            size="small"
            variant="tonal"
          >
            {{ game?.type || '未知' }}
          </v-chip>

          <v-btn
            icon
            @click="showGameEdit(game, index)"
          >
            <v-icon>mdi-cog</v-icon>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>

  <!-- 添加游戏对话框 -->
  <v-dialog v-model="showAddGameDialog" max-width="500px">
    <v-card title="添加游戏">
      <v-card-text>
        <v-select
          v-model="selectedGameType"
          :items="gameTypes"
          label="选择游戏类型"
          item-title="title"
          item-value="value"
          variant="outlined"
          density="comfortable"
        ></v-select>

        <v-text-field
          v-model="gameName"
          label="游戏显示名称（可选）"
          placeholder="留空则使用默认名称"
          variant="outlined"
          density="comfortable"
          class="mt-2"
        ></v-text-field>

        <v-text-field
          v-model="gameDirectory"
          label="游戏目录"
          variant="outlined"
          density="comfortable"
          readonly
          @click="selectDirectory"
          class="mt-2"
        >
          <template v-slot:append>
            <v-btn @click="selectDirectory" variant="text" icon="mdi-folder-open">
            </v-btn>
          </template>
        </v-text-field>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="closeAddGameDialog" variant="text">取消</v-btn>
        <v-btn
          @click="addGame"
          :loading="isAddingGame"
          :disabled="!selectedGameType || !gameDirectory"
          color="primary"
        >
          添加
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 编辑游戏对话框 -->
  <v-dialog v-model="showEditGameDialog" max-width="500px">
    <v-card title="编辑游戏">
      <v-card-text>
        <v-select
          v-model="currentGame.type"
          :items="gameTypes"
          label="选择游戏类型"
          item-title="title"
          item-value="value"
          variant="outlined"
          density="comfortable"
          v-if="currentGame"
        ></v-select>

        <v-text-field
          v-model="currentGame.name"
          label="游戏显示名称（可选）"
          placeholder="留空则使用默认名称"
          variant="outlined"
          density="comfortable"
          class="mt-2"
          v-if="currentGame"
        ></v-text-field>

        <v-text-field
          v-model="currentGame.directory"
          label="游戏目录"
          variant="outlined"
          density="comfortable"
          readonly
          @click="selectEditDirectory"
          class="mt-2"
          v-if="currentGame"
        >
          <template v-slot:append>
            <v-btn @click="selectEditDirectory" variant="text" icon="mdi-folder-open">
            </v-btn>
          </template>
        </v-text-field>

        <v-text-field
          v-model="currentGame.customExecutable"
          label="自定义可执行文件（可选）"
          :placeholder="`默认: ${defaultExecutable}`"
          variant="outlined"
          density="comfortable"
          class="mt-2"
          v-if="currentGame"
        >
          <template v-slot:append>
            <v-btn @click="selectCustomExecutable" variant="text" icon="mdi-file-find">
            </v-btn>
          </template>
        </v-text-field>

        <v-list class="mt-4" v-if="currentGame">
          <v-list-item>
            <v-list-item-title>默认可执行文件</v-list-item-title>
            <v-list-item-subtitle>{{ defaultExecutable }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-card-actions>
        <v-btn
          @click="() => { closeEditGameDialog(); launchGame(currentGame); }"
          variant="text"
          v-if="currentGame"
        >
          启动游戏
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn @click="closeEditGameDialog" variant="text">取消</v-btn>
        <v-btn
          @click="saveGameEdit"
          color="primary"
          v-if="currentGame"
        >
          保存
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 没有游戏时的提示和表单 -->
  <div v-if="!games || games.length === 0">
    <v-card class="mt-4" title="添加游戏">
      <v-card-text>
        <v-select
          v-model="selectedGameType"
          :items="gameTypes"
          label="选择游戏类型"
          item-title="title"
          item-value="value"
          variant="outlined"
          density="comfortable"
        ></v-select>

        <v-text-field
          v-model="gameName"
          label="游戏显示名称（可选）"
          placeholder="留空则使用默认名称"
          variant="outlined"
          density="comfortable"
          class="mt-2"
        ></v-text-field>

        <v-text-field
          v-model="gameDirectory"
          label="游戏目录"
          variant="outlined"
          density="comfortable"
          readonly
          @click="selectDirectory"
          class="mt-2"
        >
          <template v-slot:append>
            <v-btn @click="selectDirectory" variant="text" icon="mdi-folder-open">
            </v-btn>
          </template>
        </v-text-field>

        <v-btn
          @click="addGame"
          :loading="isAddingGame"
          :disabled="!selectedGameType || !gameDirectory"
          color="primary"
          block
          class="mt-2"
        >
          添加游戏
        </v-btn>
      </v-card-text>
    </v-card>

    <v-card class="mt-4" variant="tonal">
      <v-card-text class="text-center">
        <v-icon size="large" class="mb-2">mdi-gamepad</v-icon>
        <div>暂无游戏，请先添加游戏</div>
      </v-card-text>
    </v-card>
  </div>
</template>
