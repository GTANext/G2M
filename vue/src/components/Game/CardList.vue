<script setup>
import {onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import {useWebview} from '@/composables/useWebview'

// 定义 props
const props = defineProps({
  showViewDetailsBtn: {
    type: Boolean,
    default: true
  },
  showLaunchGameBtn: {
    type: Boolean,
    default: false
  },
  showSettingsBtn: {
    type: Boolean,
    default: true
  },
  showDeleteBtn: {
    type: Boolean,
    default: false
  },
  showTypeTag: {
    type: Boolean,
    default: true
  }
})

const router = useRouter()

// 添加确认对话框的状态
const showDeleteConfirmDialog = ref(false)
const gameToDelete = ref(null)
const gameToDeleteIndex = ref(null)

const {
  // 状态
  games,
  isGamesLoading,
  showEditGameDialog,
  currentGame,
  currentGameIndex,
  gameTypes,
  gameImages,
  selectedGameType,
  gameName,
  gameDirectory,
  isAddingGame,
  showAddGameDialog,

  // 方法
  loadGames,
  selectEditDirectoryHandler,
  selectCustomExecutable,
  showGameEdit,
  closeEditGameDialog,
  saveGameEdit,
  softDeleteGameHandler, // 改为使用软删除方法
  launchGameHandler,
  formatAddedTime,
  getGameImage,
  selectDirectoryHandler,
  addGameHandler,
  openAddGameDialog,
  closeAddGameDialog,

  // 计算属性
  defaultExecutable
} = useWebview()

onMounted(async () => {
  await loadGames()
})

const viewGameDetails = (gameId) => {
  router.push(`/game/${gameId}`)
}

// 删除游戏处理函数
const confirmDeleteGame = (game, index) => {
  gameToDelete.value = game
  gameToDeleteIndex.value = index
  showDeleteConfirmDialog.value = true
}

const executeDeleteGame = () => {
  if (gameToDeleteIndex.value !== null && gameToDelete.value !== null) {
    // 直接传递完整的游戏数据对象
    softDeleteGameHandler({
      ...gameToDelete.value,
      index: gameToDeleteIndex.value,
      status: 'deleted'
    })
  }
  showDeleteConfirmDialog.value = false
  gameToDelete.value = null
  gameToDeleteIndex.value = null
}

const cancelDeleteGame = () => {
  showDeleteConfirmDialog.value = false
  gameToDelete.value = null
  gameToDeleteIndex.value = null
}

// 防止事件冒泡的处理函数
const handleDirectoryButtonClick = (event) => {
  event.stopPropagation()
  selectDirectoryHandler()
}

const handleEditDirectoryButtonClick = (event) => {
  event.stopPropagation()
  selectEditDirectoryHandler()
}

const handleCustomExecutableButtonClick = (event) => {
  event.stopPropagation()
  selectCustomExecutable()
}
</script>

<template>
  <div class="d-flex" v-if="games && games.length > 0">
    <div class="pa-2 me-auto">
      <v-card-title class="text-h6 pa-0 mb-2">
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

        <v-card-subtitle v-if="game?.addedTime">
          添加时间: {{ formatAddedTime(game.addedTime) }}
        </v-card-subtitle>

        <v-card-actions>
          <v-btn
              v-if="showViewDetailsBtn"
              color="orange-lighten-2"
              variant="text"
              @click="() => viewGameDetails(game.id)"
          >
            查看详情
          </v-btn>

          <v-btn
              v-if="showLaunchGameBtn"
              color="green-lighten-2"
              variant="text"
              @click="() => launchGameHandler(game)"
          >
            启动游戏
          </v-btn>

          <v-spacer></v-spacer>

          <v-chip
              v-if="showTypeTag"
              :color="game?.type === 'GTA3' ? 'blue' : game?.type === 'GTAVC' ? 'green' : 'orange'"
              size="small"
              variant="tonal"
          >
            {{ game?.type || '未知' }}
          </v-chip>

          <v-btn
              v-if="showSettingsBtn"
              icon
              @click="() => showGameEdit(game, index)"
          >
            <v-icon>mdi-cog</v-icon>
          </v-btn>

          <v-btn
              v-if="showDeleteBtn"
              icon
              color="error"
              @click="() => confirmDeleteGame(game, index)"
          >
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>

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
            @click="handleEditDirectoryButtonClick"
            class="mt-2"
            v-if="currentGame"
        >
          <template v-slot:append>
            <v-btn 
              @click="handleEditDirectoryButtonClick" 
              variant="text" 
              icon="mdi-folder-open"
            >
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
            <v-btn 
              @click="handleCustomExecutableButtonClick" 
              variant="text" 
              icon="mdi-file-find"
            >
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
        <v-btn
            @click="() => { closeEditGameDialog(); launchGameHandler(currentGame); }"
            variant="text"
            v-if="currentGame"
        >
          启动游戏
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
            @click="() => confirmDeleteGame(currentGame, currentGameIndex)"
            color="error"
            variant="text"
            v-if="currentGameIndex !== null"
        >
          删除
        </v-btn>

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
            @click="handleDirectoryButtonClick"
            class="mt-2"
        >
          <template v-slot:append>
            <v-btn 
              @click="handleDirectoryButtonClick" 
              variant="text" 
              icon="mdi-folder-open"
            >
            </v-btn>
          </template>
        </v-text-field>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="closeAddGameDialog" variant="text">取消</v-btn>
        <v-btn
            @click="addGameHandler"
            :loading="isAddingGame"
            :disabled="!selectedGameType || !gameDirectory"
            color="primary"
        >
          添加
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showDeleteConfirmDialog" max-width="400px">
    <v-card>
      <v-card-title class="text-h6">
        确认删除
      </v-card-title>
      <v-card-text>
        确定要删除游戏 "{{ gameToDelete?.name || gameToDelete?.type || '未知游戏' }}" 吗？此操作将标记游戏为已删除状态。
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="cancelDeleteGame" variant="text">
          取消
        </v-btn>
        <v-btn @click="executeDeleteGame" color="error" variant="tonal">
          确认删除
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  
  <div v-if="!isGamesLoading && (!games || games.length === 0)">
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
            @click="handleDirectoryButtonClick"
            class="mt-2"
        >
          <template v-slot:append>
            <v-btn 
              @click="handleDirectoryButtonClick" 
              variant="text" 
              icon="mdi-folder-open"
            >
            </v-btn>
          </template>
        </v-text-field>

        <v-btn
            @click="addGameHandler"
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

    <v-card
        class="mt-4"
        variant="tonal"
    >
      <v-card-text class="text-center">
        <v-icon size="large" class="mb-2">mdi-gamepad</v-icon>
        <div>暂无游戏，请先添加游戏</div>
      </v-card-text>
    </v-card>
  </div>
</template>