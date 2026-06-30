<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

import Navbar from '@/component/navbar.vue'

interface NavLink {
  label: string
  href?: string
  to?: RouteLocationRaw
  external?: boolean
}

const route = useRoute()
const router = useRouter()

const navLinks: NavLink[] = [
  { label: '首页', to: { path: '/' } },
  { label: '下载', to: { path: '/download' } },
  { label: '文档', to: { path: '/docs' } },
  { label: 'GTAMODX', href: 'https://www.gtamodx.com/', external: true },
]

const quickLinks = [
  { label: '文档首页', to: { path: '/docs' } },
  { label: '快速开始', to: { path: '/docs/guide/getting-started' } },
  { label: '返回下载页', to: { path: '/download' } },
]

const docsSubPath = computed(() => {
  const trimmed = route.path.replace(/^\/docs\/?/, '')
  return trimmed
})

const iframeSrc = computed(() => {
  const suffix = docsSubPath.value ? `/${docsSubPath.value}` : '/'
  return `/docs${suffix}?embed=1`
})

function normalizeDocsRoute(inputPath: string) {
  if (!inputPath.startsWith('/docs')) {
    return null
  }

  const normalized = inputPath.replace(/\/index\.html$/, '/').replace(/\/$/, '')
  return normalized === '/docs' ? '/docs' : normalized
}

function handleDocsMessage(event: MessageEvent) {
  if (event.origin !== window.location.origin) {
    return
  }

  const payload = event.data

  if (!payload || payload.source !== 'g2m-docs' || typeof payload.path !== 'string') {
    return
  }

  const nextPath = normalizeDocsRoute(payload.path)

  if (!nextPath || nextPath === route.path) {
    return
  }

  router.replace({ path: nextPath })
}

onMounted(() => {
  window.addEventListener('message', handleDocsMessage)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handleDocsMessage)
})
</script>

<template>
  <div class="min-h-screen bg-[var(--site-bg)] text-[var(--site-text)] transition-colors duration-200">
    <Navbar :links="navLinks" />

    <section class="px-4 pb-6 pt-8 sm:px-6 sm:pt-10">
      <div class="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside class="grid content-start gap-4">
          <div class="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-5">
            <span class="text-xs uppercase tracking-[0.12em] text-[var(--site-muted)]">Docs Route</span>
            <h1 class="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--site-text)]">网站内文档壳层</h1>
            <p class="mt-3 text-sm leading-7 text-[var(--site-muted)]">
              当前页面走网站 `docs` 路由，文档内容仍由 VitePress 驱动，样式和跳转入口继续留在网站体系里。
            </p>
          </div>

          <div class="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-5">
            <span class="text-xs uppercase tracking-[0.12em] text-[var(--site-muted)]">Quick Links</span>
            <div class="mt-4 grid gap-3">
              <RouterLink
                v-for="link in quickLinks"
                :key="link.label"
                class="rounded-xl border border-[var(--site-border)] bg-[var(--site-surface-strong)] px-4 py-3 text-sm font-medium text-[var(--site-text)] transition-colors duration-200 hover:border-[var(--site-text)]"
                :to="link.to"
              >
                {{ link.label }}
              </RouterLink>
            </div>
          </div>
        </aside>

        <div class="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-3 sm:p-4">
          <iframe
            class="h-[calc(100vh-180px)] min-h-[720px] w-full rounded-xl border border-[var(--site-border)] bg-white"
            :src="iframeSrc"
            title="G2M Docs"
          ></iframe>
        </div>
      </div>
    </section>
  </div>
</template>
