<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

import { useTheme } from '@/composables/useTheme'

interface NavLink {
  label: string
  href?: string
  to?: RouteLocationRaw
  external?: boolean
}

const { theme, toggleTheme } = useTheme()
const themeActionLabel = computed(() => theme.value === 'dark' ? '切换到白色主题' : '切换到黑色主题')


defineProps<{
  links: NavLink[]
}>()
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-[var(--site-border)] bg-[var(--site-surface)]/90 backdrop-blur-xl">
    <div class="mx-auto flex min-h-[68px] w-full max-w-7xl items-center justify-between gap-5 px-4 sm:px-6">
      <a class="inline-flex items-center gap-3 font-semibold tracking-[0.02em] text-[var(--site-text)]" href="/#/">
        <span
          class="grid size-10 place-items-center rounded-xl border border-[var(--site-border)] bg-[var(--site-surface-strong)]"
        >
          <img class="size-6" src="./assets/images/logo.svg" alt="G2M" />
        </span>
        <span>G2M</span>
      </a>

      <div class="flex items-center gap-3">
        <nav class="hidden items-center gap-5 text-sm text-[var(--site-muted)] md:flex">
        <component
          v-for="link in links"
          :is="link.to ? RouterLink : 'a'"
          :key="link.label"
          :to="link.to"
          :href="link.href"
          :target="link.external ? '_blank' : undefined"
          :rel="link.external ? 'noreferrer' : undefined"
          class="transition-colors duration-200 hover:text-[var(--site-text)]"
        >
          {{ link.label }}
        </component>
        </nav>

        <button
          class="theme-icon-button"
          type="button"
          :aria-label="themeActionLabel"
          :title="themeActionLabel"
          @click="toggleTheme"
        >
          <svg
            v-if="theme === 'dark'"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <path d="M12 3v2.5" />
            <path d="M12 18.5V21" />
            <path d="M3 12h2.5" />
            <path d="M18.5 12H21" />
            <path d="M5.64 5.64l1.77 1.77" />
            <path d="M16.59 16.59l1.77 1.77" />
            <path d="M5.64 18.36l1.77-1.77" />
            <path d="M16.59 7.41l1.77-1.77" />
            <circle cx="12" cy="12" r="4" />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M20.742 13.045a8.088 8.088 0 0 1-9.787-9.787 1 1 0 0 0-1.25-1.25A10.004 10.004 0 1 0 21.992 14.295a1 1 0 0 0-1.25-1.25Z" />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>
