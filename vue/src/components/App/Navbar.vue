<script setup>
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'

const router = useRouter()
const route = useRoute()

const items = [
  { title: '首页', value: 'home', icon: 'mdi-home', route: '/' },
  { title: '游戏列表', value: 'modfiles', icon: 'mdi-gamepad', route: '/game/list' }
]

const onItemClick = (item) => {
  router.push(item.route)
}

// 计算当前选中的项目
const selectedItem = computed(() => {
  const currentItem = items.find(item => item.route === route.path)
  return currentItem ? currentItem.value : 'home'
})
</script>

<template>
    <v-app-bar :elevation="2">
        <v-app-bar-title>GTANext ModLoader</v-app-bar-title>
        <template v-slot:append>
          <v-btn icon="mdi-github" href="https://github.com/GTANext/ModLoader" target="_blank"></v-btn>
        </template>
    </v-app-bar>
    <v-navigation-drawer expand-on-hover permanent rail>
        <v-list density="compact" nav>
            <v-list-item
                v-for="item in items"
                :key="item.value"
                :prepend-icon="item.icon"
                :title="item.title"
                :value="item.value"
                :active="selectedItem === item.value"
                @click="onItemClick(item)">
            </v-list-item>
        </v-list>
    </v-navigation-drawer>
</template>
