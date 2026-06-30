<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

import Hero from '@/component/hero.vue'
import Navbar from '@/component/navbar.vue'

interface HeroItem {
  title: string
  description: string
  label: string
}

interface GamePreview {
  key: string
  title: string
  tag: string
  items: HeroItem[]
}

interface PlatformLine {
  title: string
  text: string
}

interface PlatformOption {
  key: string
  label: string
  description: string
  primaryLabel: string
  primaryHref: string
  secondaryLabel: string
  secondaryHref: string
  hint: string
  lines: PlatformLine[]
}

interface IntroCard {
  title: string
  description: string
}

interface HighlightStat {
  value: string
  label: string
  description: string
}

interface WorkflowStep {
  title: string
  description: string
}

interface NavLink {
  label: string
  href?: string
  to?: RouteLocationRaw
  external?: boolean
}

const homeTo = { path: '/' } satisfies RouteLocationRaw
const downloadTo = { path: '/', hash: '#download' } satisfies RouteLocationRaw
const introTo = { path: '/', hash: '#intro' } satisfies RouteLocationRaw

const navLinks: NavLink[] = [
  { label: '下载', to: downloadTo },
  { label: '介绍', to: introTo },
  { label: 'GTAMODX', href: 'https://www.gtamodx.com/', external: true },
]

const heroText =
  'G2M 是一个面向 GTA III、Vice City、San Andreas 的桌面 Mod 工作区管理器。它把 Mod 下载后的导入、文件映射、冲突处理、启停和维护统一到一个更清晰的流程里。'

const games: GamePreview[] = [
  {
    key: 'vc',
    title: 'Vice City Workspace',
    tag: 'preview',
    items: [
      {
        title: '导入前先看文件树',
        description: '先知道 Mod 会落到哪里，再决定是不是继续导入。',
        label: 'scan',
      },
      {
        title: '目标路径可以直接调整',
        description: '根目录、modloader、自定义目录都能在导入前修正。',
        label: 'map',
      },
      {
        title: '冲突先确认再覆盖',
        description: '不再靠手动复制文件碰运气。',
        label: 'safe',
      },
    ],
  },
  {
    key: 'sa',
    title: 'San Andreas Workspace',
    tag: 'alpha',
    items: [
      {
        title: '适合大型整合包',
        description: '面对复杂目录时，映射和预览仍然保持可读。',
        label: 'large',
      },
      {
        title: '工作区统一收敛到 .g2m',
        description: '缓存、备份和包配置都放进同一个隐藏目录。',
        label: '.g2m',
      },
      {
        title: '更容易持续维护',
        description: '启用、停用、删除都回到同一个工作区内完成。',
        label: 'manage',
      },
    ],
  },
]

const platforms: PlatformOption[] = [
  {
    key: 'windows',
    label: 'Windows',
    description: '当前主力平台。建议以管理员身份运行，以便创建 Symbolic Link 和执行本地目录操作。',
    primaryLabel: '下载 Windows Alpha',
    primaryHref: 'https://www.gtamodx.com/',
    secondaryLabel: '访问 GTAMODX',
    secondaryHref: 'https://www.gtamodx.com/',
    hint: 'Alpha 版本优先面向开发和内测环境。',
    lines: [
      { title: '系统要求', text: 'Windows 10/11，建议使用管理员权限启动。' },
      { title: '工作区目录', text: '游戏根目录下统一使用 .g2m 保存缓存、备份和工作区包。' },
      { title: '适用游戏', text: '支持 GTA III、GTA Vice City、GTA San Andreas。' },
    ],
  },
  {
    key: 'preview',
    label: 'Preview',
    description: '如果你只是先了解产品结构，可以先从官网和 GTAMODX 站点入口开始，不需要立刻装本地环境。',
    primaryLabel: '访问 GTAMODX',
    primaryHref: 'https://www.gtamodx.com/',
    secondaryLabel: '下载 Windows Alpha',
    secondaryHref: 'https://www.gtamodx.com/',
    hint: '适合先看设计方向和工作流的人。',
    lines: [
      { title: '产品方向', text: '更强调工作区管理，而不是单次安装动作。' },
      { title: '页面栈', text: '当前官网已经切到 Vue 组件化开发，方便继续扩展。' },
      { title: '当前阶段', text: '还在 Alpha，优先收敛核心导入链路和桌面体验。' },
    ],
  },
]

const introCards: IntroCard[] = [
  {
    title: '下载后直接进入工作区',
    description: '首页不是内容堆叠，而是明确告诉用户下一步做什么: 选择游戏、导入 Mod、确认映射。',
  },
  {
    title: '导入过程先预览后执行',
    description: '目录结构、目标路径、冲突文件和前置状态都尽量前置展示，减少误操作。',
  },
  {
    title: '持续维护而不是一次性安装',
    description: '当你需要反复切换、停用、替换和测试 Mod 时，G2M 的工作区方式更稳定。',
  },
]

const highlightStats: HighlightStat[] = [
  {
    value: '3',
    label: 'Supported Games',
    description: 'GTA III、Vice City、San Andreas 使用同一套工作区思路。',
  },
  {
    value: '.g2m',
    label: 'Workspace Root',
    description: '缓存、备份和包配置统一沉到隐藏工作区目录。',
  },
  {
    value: 'Preflight',
    label: 'Import Flow',
    description: '先看映射和冲突，再决定是否真正落盘。',
  },
]

const workflowSteps: WorkflowStep[] = [
  {
    title: '导入 Mod',
    description: '先读取压缩包或目录结构，再把文件树和目标位置展开给你看。',
  },
  {
    title: '确认映射',
    description: '根目录、保留目录和自定义位置都在导入前确认，不把错误拖到安装后。',
  },
  {
    title: '持续维护',
    description: '启用、停用、替换和删除都基于工作区进行，而不是手动回滚文件。',
  },
]

const activePlatformKey = ref<PlatformOption['key']>('windows')
const defaultPlatform = platforms[0]!
const defaultGame = games[0]!
const previewGame = games[1] ?? defaultGame

const activePlatform = computed(() => {
  return platforms.find((platform) => platform.key === activePlatformKey.value) ?? defaultPlatform
})

const activeGame = computed(() => {
  return activePlatformKey.value === 'preview' ? previewGame : defaultGame
})
</script>

<template>
  <div class="min-h-screen bg-[var(--site-bg)] text-[var(--site-text)] transition-colors duration-200">
    <Navbar :links="navLinks" />
    <Hero :hero-text="heroText" :active-game="activeGame" :download-to="downloadTo" :intro-to="introTo" />

    <section class="px-4 pb-8 sm:px-6">
      <div class="mx-auto grid w-full max-w-7xl gap-4 sm:grid-cols-3">
        <article
          v-for="stat in highlightStats"
          :key="stat.label"
          class="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface-soft)] px-5 py-5 shadow-[var(--site-shadow-soft)] backdrop-blur-xl"
        >
          <span class="text-xs uppercase tracking-[0.12em] text-[var(--site-muted)]">{{ stat.label }}</span>
          <strong class="mt-3 block text-3xl font-semibold tracking-[-0.04em] text-[var(--site-text)]">{{ stat.value }}</strong>
          <p class="mt-3 text-sm leading-7 text-[var(--site-muted)]">{{ stat.description }}</p>
        </article>
      </div>
    </section>

    <section class="px-4 pb-8 sm:px-6">
      <div class="mx-auto grid w-full max-w-7xl gap-5 rounded-[28px] border border-[var(--site-border)] bg-[var(--site-surface-soft)] p-6 shadow-[var(--site-shadow-soft)] backdrop-blur-xl lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
        <div>
          <span class="text-xs uppercase tracking-[0.12em] text-[var(--site-muted)]">Positioning</span>
          <h2 class="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[var(--site-text)] sm:text-4xl">
            不是一次性安装器，而是可持续维护的 Mod 工作区。
          </h2>
          <p class="mt-4 max-w-2xl text-base leading-8 text-[var(--site-muted)]">
            G2M 的重点不是把文件塞进游戏目录，而是把导入、映射、启停、替换和回滚收成一条稳定链路。你不需要再靠记忆追踪哪个文件从哪里来。
          </p>
        </div>

        <div class="grid gap-3">
          <div class="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface-strong)] px-5 py-5">
            <span class="text-xs uppercase tracking-[0.12em] text-[var(--site-muted)]">What You See</span>
            <p class="mt-3 text-sm leading-7 text-[var(--site-text)]">清晰的文件树、目标路径、冲突预览和当前工作区状态。</p>
          </div>
          <div class="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface-strong)] px-5 py-5">
            <span class="text-xs uppercase tracking-[0.12em] text-[var(--site-muted)]">What You Avoid</span>
            <p class="mt-3 text-sm leading-7 text-[var(--site-text)]">手动复制、覆盖混乱、目录嵌套失控和回滚困难。</p>
          </div>
        </div>
      </div>
    </section>

    <section id="download" class="px-4 pb-8 pt-2 sm:px-6">
      <div class="mx-auto w-full max-w-7xl rounded-[28px] border border-[var(--site-border)] bg-[var(--site-surface-soft)] p-6 shadow-[var(--site-shadow-soft)] backdrop-blur-xl sm:p-8">
        <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <span class="text-xs uppercase tracking-[0.12em] text-[var(--site-muted)]">Download</span>
            <h2 class="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[var(--site-text)] sm:text-4xl">
              先下载，再接入你的游戏目录。
            </h2>
            <p class="mt-3 max-w-3xl text-base leading-8 text-[var(--site-muted)]">
              {{ activePlatform.description }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2.5 lg:justify-end">
            <button
              v-for="platform in platforms"
              :key="platform.key"
              class="platform-tab"
              :class="platform.key === activePlatformKey
                ? 'active bg-[var(--site-surface-strong)] text-[var(--site-text)]'
                : 'bg-transparent text-[var(--site-muted)]'"
              @click="activePlatformKey = platform.key"
            >
              {{ platform.label }}
            </button>
          </div>
        </div>

        <div class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div class="grid gap-4">
            <div class="grid gap-4 sm:grid-cols-3">
              <div
                v-for="item in activePlatform.lines"
                :key="item.title"
                class="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface-strong)] px-4 py-4"
              >
                <strong class="block text-sm font-medium tracking-[-0.01em] text-[var(--site-text)]">{{ item.title }}</strong>
                <span class="mt-2 block text-sm leading-7 text-[var(--site-muted)]">{{ item.text }}</span>
              </div>
            </div>

            <div class="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface-strong)] px-5 py-5">
              <span class="text-xs uppercase tracking-[0.12em] text-[var(--site-muted)]">当前平台说明</span>
              <p class="mt-3 text-sm leading-7 text-[var(--site-text)]">
                {{ activePlatform.hint }}
              </p>
            </div>
          </div>

          <div class="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface-strong)] p-5">
            <span class="text-xs uppercase tracking-[0.12em] text-[var(--site-muted)]">Action</span>
            <div class="mt-4 flex flex-col gap-3">
              <a
                class="button"
                :href="activePlatform.primaryHref"
                target="_blank"
                rel="noreferrer"
              >
                {{ activePlatform.primaryLabel }}
              </a>
              <a
                class="button-outline"
                :href="activePlatform.secondaryHref"
                target="_blank"
                rel="noreferrer"
              >
                {{ activePlatform.secondaryLabel }}
              </a>
            </div>
            <p class="mt-4 text-sm leading-7 text-[var(--site-muted)]">
              当前官网只保留产品概览和下载入口，下载与更新动态继续通过外部站点分发。
            </p>
          </div>
        </div>
      </div>
    </section>

    <section id="intro" class="px-4 pb-8 pt-6 sm:px-6">
      <div class="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[minmax(240px,0.42fr)_minmax(0,0.58fr)]">
        <div>
          <span class="text-xs uppercase tracking-[0.12em] text-[var(--site-muted)]">Workflow</span>
          <h2 class="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[var(--site-text)] sm:text-4xl">
            从导入到维护，所有动作都围绕同一个工作区展开。
          </h2>
          <p class="mt-3 max-w-3xl text-base leading-8 text-[var(--site-muted)]">
            页面本身也遵循同样思路: 先说明入口，再展示平台和能力，最后告诉你为什么这套流程更稳定。
          </p>
        </div>

        <div class="grid gap-4">
          <article
            v-for="(step, index) in workflowSteps"
            :key="step.title"
            class="grid gap-4 rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface-soft)] px-5 py-5 shadow-[var(--site-shadow-soft)] backdrop-blur-xl sm:grid-cols-[64px_minmax(0,1fr)] sm:items-start"
          >
            <span
              class="inline-flex size-12 items-center justify-center rounded-xl border border-[var(--site-border)] bg-[var(--site-surface-strong)] text-xs font-semibold uppercase tracking-[0.08em] text-[var(--site-muted)]"
            >
              {{ String(index + 1).padStart(2, '0') }}
            </span>
            <div>
              <h3 class="text-2xl font-semibold tracking-[-0.03em] text-[var(--site-text)]">{{ step.title }}</h3>
              <p class="mt-3 text-base leading-8 text-[var(--site-muted)]">{{ step.description }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="px-4 pb-14 pt-2 sm:px-6">
      <div class="mx-auto grid w-full max-w-7xl gap-8 rounded-[28px] border border-[var(--site-border)] bg-[var(--site-surface-soft)] p-6 shadow-[var(--site-shadow-soft)] backdrop-blur-xl lg:grid-cols-[minmax(240px,0.42fr)_minmax(0,0.58fr)]">
        <div>
          <span class="text-xs uppercase tracking-[0.12em] text-[var(--site-muted)]">Why G2M</span>
          <h2 class="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[var(--site-text)] sm:text-4xl">
            不是把功能堆满，而是把真正有用的步骤前置出来。
          </h2>
          <p class="mt-3 max-w-2xl text-base leading-8 text-[var(--site-muted)]">
            对桌面端 Mod 工具来说，最重要的不是视觉花样，而是用户每次导入和维护时都知道接下来会发生什么。
          </p>
        </div>

        <div class="grid gap-4">
          <article
            v-for="card in introCards"
            :key="card.title"
            class="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface-strong)] px-5 py-5"
          >
            <h3 class="text-2xl font-semibold tracking-[-0.03em] text-[var(--site-text)]">{{ card.title }}</h3>
            <p class="mt-3 text-base leading-8 text-[var(--site-muted)]">{{ card.description }}</p>
          </article>
        </div>
      </div>
    </section>

    <footer class="border-t border-[var(--site-border)] px-4 py-6 text-sm text-[var(--site-muted)] sm:px-6">
      <div class="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span>G2M Alpha. Built for GTA III, Vice City and San Andreas.</span>
        <div class="flex flex-wrap gap-4">
          <RouterLink class="transition-colors duration-200 hover:text-[var(--site-text)]" :to="homeTo">返回顶部</RouterLink>
          <RouterLink class="transition-colors duration-200 hover:text-[var(--site-text)]" :to="downloadTo">下载</RouterLink>
          <RouterLink class="transition-colors duration-200 hover:text-[var(--site-text)]" :to="introTo">介绍</RouterLink>
        </div>
      </div>
    </footer>
  </div>
</template>
