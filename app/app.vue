<script setup>
import { darkTheme } from 'naive-ui'

const colorMode = useColorMode()

const naiveTheme = computed(() => {
  return colorMode.value === 'dark' ? darkTheme : null
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NConfigProvider :theme="naiveTheme">
        <NMessageProvider>
          <NDialogProvider>
            <NNotificationProvider>
              <NuxtPage />
            </NNotificationProvider>
          </NDialogProvider>
        </NMessageProvider>
      </NConfigProvider>
    </NuxtLayout>
  </UApp>
</template>
