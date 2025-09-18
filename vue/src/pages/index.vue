<script setup>
import { useWebAPI } from '@/composables/useWebAPI'

const {
  openGitHubRepository
} = useWebAPI()
</script>

<template>
  <v-card title="欢迎使用 G2M" subtitle="可视化安装 III.VC.SA 的 Mod / Cleo" class="mb-1">
    <template v-slot:append>
      <v-btn
        icon="mdi-github"
        variant="text"
        @click="openGitHubRepository"
      ></v-btn>
    </template>
  </v-card>

  <!-- <GameCardList 
  :show-view-details-btn="false"
  :show-launch-game-btn="true"
  /> -->
</template>
