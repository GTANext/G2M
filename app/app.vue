<script setup>
import { darkTheme } from 'naive-ui'

const colorMode = useColorMode()

const naiveTheme = computed(() => {
  return colorMode.value === 'dark' ? darkTheme : null
})
</script>

<template>
  <UApp>
    <NConfigProvider :theme="naiveTheme">
      <NMessageProvider>
        <NDialogProvider>
          <NNotificationProvider>
            <NuxtLayout>
              <NuxtPage />
            </NuxtLayout>
          </NNotificationProvider>
        </NDialogProvider>
      </NMessageProvider>
    </NConfigProvider>
  </UApp>
</template>
