/**
 * plugins/index.ts
 *
 * Automatically included in `./src/main.ts`
 */
import '../assets/main.css'
// Plugins
import router from '../router'

// Types
import type { App } from 'vue'

export function registerPlugins (app: App) {
  app
    .use(router)
}