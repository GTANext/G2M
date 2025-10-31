<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 页面加载时重定向到游戏列表页面
onMounted(() => {
  router.replace('/game')
})
</script>

<template>
  <div class="redirect-container">
    <a-spin size="large" tip="正在跳转到游戏列表..." />
  </div>
</template>

<style scoped>
.redirect-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}
</style>