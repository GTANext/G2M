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
        <NuxtPage />
      </NConfigProvider>
    </NuxtLayout>
  </UApp>
</template>
