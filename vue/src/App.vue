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
      window.motyf.error("系统错误：API不可用")
    }
  }
})
</script>

<template>
  <v-app>
    <AppNavbar />
    <v-main>
      <v-container>
        <v-alert
          v-if="!apiAvailable"
          class="mb-3"
          text="系统错误：API不可用"
          type="error"
          variant="tonal"
        ></v-alert>
        <RouterView v-else />
      </v-container>
    </v-main>
  </v-app>
</template>
