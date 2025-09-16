<script setup>
import { onMounted, ref } from 'vue'
import { useWebview } from '@/composables/useWebview'

const { isApiReady, waitForApi } = useWebview()

const apiAvailable = ref(false)

onMounted(async () => {
  await waitForApi()
  apiAvailable.value = isApiReady.value

  if (!apiAvailable.value) {
    console.warn('pywebview API 尚未准备好')
    if (window.motyf) {
      window.motyf.error("致命错误: 后端API不可用")
    }
  }
})
</script>

<template>
  <v-app>
    <AppNavbar />
    <v-main>
      <v-container>
        <v-alert v-if="!apiAvailable" class="mb-3" text="致命错误: 后端API不可用" type="error" variant="tonal"></v-alert>
        <template v-else>
          <v-alert class="mb-3" text="还在开发中! 如有疑问请加群: 829270254" type="info" variant="tonal"></v-alert>
          <RouterView />
        </template>
      </v-container>
    </v-main>
  </v-app>
</template>
