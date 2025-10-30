<script setup>
import { message } from 'ant-design-vue';
const info = () => {
  message.success({
    content: () => '感谢使用G2M',
    style: {
      marginTop: '10vh',
    },
  });
};
// onMounted(() => {
//   info();
// });
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