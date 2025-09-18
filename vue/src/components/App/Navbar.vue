<script setup>
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'

const router = useRouter()
const route = useRoute()

const items = [
  { 
    title: '首页', 
    value: 'home', 
    icon: 'mdi-home', 
    route: '/' 
  },
  { 
    title: '游戏', 
    value: 'games', 
    icon: 'mdi-gamepad-variant', 
    route: '/games' 
  },
  // { 
  //   title: '模组',
  //   value: 'mods',
  //   icon: 'mdi-gamepad-circle',
  //   route: '/mod' 
  // },
  { 
    title: '删除', 
    value: 'bin', 
    icon: 'mdi-delete', 
    route: '/bin' 
  },
  { 
    title: '关于', 
    value: 'about', 
    icon: 'mdi-information-slab-circle', 
    route: '/about' 
  }
]

const onItemClick = (item) => {
  router.push(item.route)
}

// 计算当前选中的项目
const selectedItem = computed(() => {
  const currentItem = items.find(item => item.route === route.path)
  return currentItem ? currentItem.value : null
})
</script>

<template>
  <v-app-bar :elevation="2">
    <v-app-bar-title>GTAModx Manager</v-app-bar-title>
    <template v-slot:append>
      <v-btn v-for="item in items" :key="item.value" :to="item.route">
        {{ item.title }}
      </v-btn>
      <v-btn icon="mdi-github" href="https://github.com/GTANext/ModLoader" target="_blank"></v-btn>
    </template>
  </v-app-bar>
  <v-navigation-drawer expand-on-hover permanent rail>
    <v-list density="compact" nav>
      <v-list-item v-for="item in items" :key="item.value" :prepend-icon="item.icon" :title="item.title"
        :value="item.value" :active="selectedItem === item.value" @click="onItemClick(item)">
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>
