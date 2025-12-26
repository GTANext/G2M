// https://nuxt.com/docs/api/configuration/nuxt-config
import AutoImport from 'unplugin-auto-import/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'

// API 配置
const API_BASE_URL = process.env.NUXT_PUBLIC_API_BASE_URL || 'http://api.localhost:8080'
// 是否使用代理
// true 使用代理 /apiService
// false 直接请求后端
const USE_PROXY = process.env.NUXT_USE_PROXY !== 'false'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  devtools: { enabled: true },

  modules: ['@nuxt/ui', 'nuxtjs-naive-ui', '@nuxt/image'],

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

  // 运行时配置
  runtimeConfig: {
    public: {
      apiBaseUrl: USE_PROXY ? '/apiService' : API_BASE_URL,
      // 后端地址
      apiBackendUrl: API_BASE_URL,
      // 是否使用代理
      useProxy: USE_PROXY
    }
  },
  // Nitro 代理配置
  // 仅在 USE_PROXY=true 时生效
  ...(USE_PROXY && {
    nitro: {
      devProxy: {
        '/apiService': {
          target: API_BASE_URL,
          changeOrigin: true,
          prependPath: true
        }
      }
    }
  }),

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