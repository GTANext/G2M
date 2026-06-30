<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

interface HeroItem {
  title: string
  description: string
  label: string
}

interface ActiveGame {
  title: string
  tag: string
  items: HeroItem[]
}

defineProps<{
  heroText: string
  activeGame: ActiveGame
  downloadTo: RouteLocationRaw
  introTo: RouteLocationRaw
}>()
</script>

<template>
  <section class="px-4 pb-10 pt-12 sm:px-6 sm:pt-16">
    <div class="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-start">
      <div>
        <div
          class="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--site-border)] bg-[var(--site-surface)] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--site-muted)]"
        >
          <span class="size-2 rounded-full bg-[var(--site-text)]"></span>
          GTA Mod Workspace
        </div>

        <h1 class="mt-6 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-[var(--site-text)] sm:text-5xl lg:text-6xl">
          更直接地管理 GTA Mod。
        </h1>

        <p class="mt-5 max-w-2xl text-base leading-8 text-[var(--site-muted)] sm:text-lg">
          {{ heroText }}
        </p>

        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <RouterLink
            class="button"
            :to="downloadTo"
          >
            下载 Alpha
          </RouterLink>
          <RouterLink
            class="button-outline"
            :to="introTo"
          >
            了解功能
          </RouterLink>
        </div>

        <div class="mt-10 grid gap-3 sm:grid-cols-3">
          <div class="rounded-xl border border-[var(--site-border)] bg-[var(--site-surface)] px-4 py-4">
            <span class="text-xs uppercase tracking-[0.12em] text-[var(--site-muted)]">Workspace</span>
            <p class="mt-2 text-sm leading-7 text-[var(--site-text)]">统一管理 GTA III / VC / SA 的 Mod 工作区。</p>
          </div>
          <div class="rounded-xl border border-[var(--site-border)] bg-[var(--site-surface)] px-4 py-4">
            <span class="text-xs uppercase tracking-[0.12em] text-[var(--site-muted)]">Import</span>
            <p class="mt-2 text-sm leading-7 text-[var(--site-text)]">导入前先看映射和文件树，再决定是否落盘。</p>
          </div>
          <div class="rounded-xl border border-[var(--site-border)] bg-[var(--site-surface)] px-4 py-4">
            <span class="text-xs uppercase tracking-[0.12em] text-[var(--site-muted)]">Manage</span>
            <p class="mt-2 text-sm leading-7 text-[var(--site-text)]">启用、停用、替换和维护都回到统一的工作区流程里。</p>
          </div>
        </div>
      </div>

      <div class="grid gap-4">
        <div class="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-6">
          <div class="flex items-center justify-between gap-3">
            <div>
              <span class="text-xs uppercase tracking-[0.12em] text-[var(--site-muted)]">当前展示</span>
              <strong class="mt-2 block text-xl font-semibold tracking-[-0.03em] text-[var(--site-text)]">{{ activeGame.title }}</strong>
            </div>
            <span class="rounded-md border border-[var(--site-border)] px-3 py-1 text-xs uppercase tracking-[0.12em] text-[var(--site-muted)]">
              {{ activeGame.tag }}
            </span>
          </div>

          <p class="mt-4 text-sm leading-7 text-[var(--site-muted)]">
            G2M 更强调工作区维护，不再把安装流程拆成一堆独立脚本和散落目录。
          </p>
        </div>

        <div class="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-6">
          <ol class="grid gap-5">
            <li
              v-for="(item, index) in activeGame.items"
              :key="item.title"
              class="grid gap-2 border-b border-[var(--site-border)] pb-5 last:border-b-0 last:pb-0"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm font-medium text-[var(--site-text)]">{{ item.title }}</span>
                <span class="text-xs uppercase tracking-[0.12em] text-[var(--site-muted)]">
                  {{ String(index + 1).padStart(2, '0') }}
                </span>
              </div>
              <p class="text-sm leading-7 text-[var(--site-muted)]">{{ item.description }}</p>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </section>
</template>
