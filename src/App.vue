<script setup>
import { NConfigProvider, NGlobalStyle, NMessageProvider, NDialogProvider, NNotificationProvider } from 'naive-ui'
import { computed } from 'vue'

// Naive UI 主题配置 - 简洁风格
const themeOverrides = computed(() => ({
  common: {
    borderRadius: '8px',
    primaryColor: '#18a058',
    primaryColorHover: '#36ad6a',
    primaryColorPressed: '#0c7a43',
  }
}))
</script>

<template>
  <NConfigProvider :theme-overrides="themeOverrides">
    <NGlobalStyle />
    <NMessageProvider>
      <NDialogProvider>
        <NNotificationProvider>
          <div class="app-container">
            <AppNavbar />
            <main class="main-content">
              <RouterView />
            </main>
          </div>
        </NNotificationProvider>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  overflow: auto;
  padding: 56px 20px 20px 20px;
}
</style>