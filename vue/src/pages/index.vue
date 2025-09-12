<script setup>
import { useWebview } from '@/composables/useWebview'

const {
  // 状态
  games,
  selectedGameType,
  gameDirectory,
  gameName,
  isAddingGame,
  showAddGameDialog,
  gameTypes,

  // 方法
  selectDirectoryHandler,
  addGameHandler,
  openAddGameDialog,
  closeAddGameDialog
} = useWebview()
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

  <GameCardList @open-add-game="openAddGameDialog" />

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
</template>
