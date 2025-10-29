<script setup>

</script>

<template>
  <div class="app-container">
    <AppNavbar />
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding-top: 30px; /* 与标题栏高度一致 */
  height: calc(100vh - 30px);
  overflow: auto;
}
</style>