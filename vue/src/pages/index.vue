<script setup>
import { onMounted } from 'vue'
import { useWebview } from '@/composables/useWebview'

const {
  // 状态
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
  deleteGameHandler,
  launchGameHandler,
  selectGameExecutableHandler,
  openAddGameDialog,
  closeAddGameDialog,
  formatAddedTime,
  getGameImage,

  // 计算属性
  defaultExecutable
} = useWebview()

onMounted(async () => {
  await waitForApi()
  if (isApiReady) {
    await loadGames()
  } else {
    console.warn('pywebview API 尚未准备好')
    if (window.motyf) {
      window.motyf.error("系统错误：API不可用")
    }
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
  <div class="d-flex" v-if="games && games.length > 0">
    <div class="pa-2 me-auto">
      <v-card-title class="text-h6 pa-0 mt-4 mb-2">
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
            color="orange-lighten-2"
            variant="text"
            @click="() => launchGameHandler(game)"
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
            @click="() => showGameEdit(game, index)"
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
          @click="selectDirectoryHandler"
          class="mt-2"
        >
          <template v-slot:append>
            <v-btn @click="selectDirectoryHandler" variant="text" icon="mdi-folder-open">
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
          @click="selectEditDirectoryHandler"
          class="mt-2"
          v-if="currentGame"
        >
          <template v-slot:append>
            <v-btn @click="selectEditDirectoryHandler" variant="text" icon="mdi-folder-open">
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
          @click="deleteGameHandler"
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
          @click="selectDirectoryHandler"
          class="mt-2"
        >
          <template v-slot:append>
            <v-btn @click="selectDirectoryHandler" variant="text" icon="mdi-folder-open">
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

    <v-card class="mt-4" variant="tonal">
      <v-card-text class="text-center">
        <v-icon size="large" class="mb-2">mdi-gamepad</v-icon>
        <div>暂无游戏，请先添加游戏</div>
      </v-card-text>
    </v-card>
  </div>
</template>
