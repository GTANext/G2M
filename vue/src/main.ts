import { createApp } from 'vue';
import App from './App.vue';
import { registerPlugins } from '@/plugins'

import 'unfonts.css'

const app = createApp(App);
registerPlugins(app); // 注册插件
app.mount('#app');