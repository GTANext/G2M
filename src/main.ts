import './styles/main.scss'
import { createApp } from "vue";
import router from "./router";
import naive from 'naive-ui'
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import App from "./App.vue";
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

// 初始化 Tauri
async function initApp() {
  // 在 Tauri 环境中初始化
  if (window.__TAURI__) {
    try {
      // 确保 Tauri API 已准备就绪
      await import('@tauri-apps/api/core');
    } catch (error) {
      console.error('Tauri API 初始化失败:', error);
    }
  }

  const app = createApp(App);
  const pinia = createPinia();
  pinia.use(piniaPluginPersistedstate);

  app.use(pinia);
  app.use(Antd);
  app.use(naive);
  app.use(router);

  app.mount("#app");
}

// 启动应用
initApp().catch(console.error);