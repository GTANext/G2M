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
  padding-top: 40px;
  overflow: auto;
}
</style>