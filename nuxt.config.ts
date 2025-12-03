// https://nuxt.com/docs/api/configuration/nuxt-config
import AutoImport from 'unplugin-auto-import/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  devtools: { enabled: true },

  modules: ['@nuxt/ui', 'nuxtjs-naive-ui'],

  // 构建配置
  build: {
    transpile: ['@tauri-apps/api']
  },

  // Vite 配置
  vite: {
    build: {
      rollupOptions: {
        external: (id: string) => {
          if (process.env.TAURI_PLATFORM) {
            return id.startsWith('@tauri-apps/')
          }
          return false
        }
      }
    },
    plugins: [
      AutoImport({
        imports: [
          {
            'naive-ui': [
              'useDialog',
              'useNotification',
              'useLoadingBar'
            ]
          }
        ]
      }),
      Components({
        resolvers: [NaiveUiResolver()]
      })
    ],
    optimizeDeps: {
      exclude: ['@tauri-apps/api']
    },
    define: {
      '__TAURI__': 'undefined'
    }
  },

  // SSR 配置
  ssr: false,

  ui: {
    fonts: false,
    colorMode: true,
    theme: {
      colors: [
        'primary',
        'secondary',
        'info',
        'success',
        'warning',
        'error',
        'pink',
      ],
    }
  },
  css: [
    '~/assets/app.css',
  ],

  // 应用配置
  app: {
    head: {
      title: 'G2M - GTAModx Manager',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ]
    }
  },

  // 忽略文件
  ignore: [
    '**/src-tauri/**'
  ]
})