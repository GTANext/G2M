<script setup lang="ts">
import { computed, ref } from 'vue'

import { GITHUB_URL } from '@/constants/links'
import { useI18n } from '@/i18n'

type WorkflowTab = 'workspace' | 'mapping' | 'conflict' | 'launch'

const { t } = useI18n()

const activeTab = ref<WorkflowTab>('workspace')

const tabs = computed(() => [
  {
    key: 'workspace' as const,
    label: t('workflow.tabs.workspace.label')
  },
  {
    key: 'mapping' as const,
    label: t('workflow.tabs.mapping.label')
  },
  {
    key: 'conflict' as const,
    label: t('workflow.tabs.conflict.label')
  }
])

const panel = computed(() => ({
  eyebrow: t(`workflow.tabs.${activeTab.value}.eyebrow`),
  title: t(`workflow.tabs.${activeTab.value}.title`),
  description: t(`workflow.tabs.${activeTab.value}.description`),
  points: [
    t(`workflow.tabs.${activeTab.value}.points.0`),
    t(`workflow.tabs.${activeTab.value}.points.1`),
    t(`workflow.tabs.${activeTab.value}.points.2`)
  ]
}))
</script>

<template>
  <section id="preview" class="px-4 pb-12 lg:px-6 lg:pb-16">
    <div class="mx-auto max-w-7xl overflow-hidden rounded-[28px] border border-white/8 bg-[rgba(16,20,30,0.62)]">
      <div class="border-b border-white/8 px-6 py-5">
        <p class="text-[0.68rem] uppercase tracking-[0.24em] text-white/34">
          {{ t('workflow.eyebrow') }}
        </p>
        <div class="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="max-w-2xl">
            <h2 class="text-2xl font-semibold text-white/92 sm:text-3xl">
              {{ t('workflow.title') }}
            </h2>
            <p class="mt-3 text-sm leading-7 text-white/60 sm:text-base">
              {{ t('workflow.description') }}
            </p>
          </div>

          <a
            id="download"
            :href="GITHUB_URL"
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70 transition-colors hover:border-white/20 hover:text-white"
          >
            GitHub
          </a>
        </div>
      </div>

      <div class="border-b border-white/8 px-3 py-3 sm:px-6">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="cursor-pointer rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors"
            :class="
              activeTab === tab.key
                ? 'bg-[#7a83ff] text-[#070910]'
                : 'border border-white/10 text-white/58 hover:border-white/18 hover:text-white'
            "
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="grid gap-8 px-6 py-6 lg:grid-cols-[minmax(0,0.98fr)_minmax(260px,0.64fr)]">
        <div class="rounded-[22px] border border-white/8 bg-[rgba(255,255,255,0.02)] px-5 py-5 sm:px-6 sm:py-6">
          <p class="text-[0.68rem] uppercase tracking-[0.22em] text-white/34">
            {{ panel.eyebrow }}
          </p>
          <h3 class="mt-3 text-xl font-semibold text-white/90 sm:text-2xl">
            {{ panel.title }}
          </h3>
          <p class="mt-4 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
            {{ panel.description }}
          </p>
        </div>

        <ul class="overflow-hidden rounded-[22px] border border-white/8 bg-[rgba(255,255,255,0.02)]">
          <li
            v-for="point in panel.points"
            :key="point"
            class="flex items-start gap-3 border-b border-white/8 px-4 py-4 text-sm leading-7 text-white/66 last:border-b-0"
          >
            <span class="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#7a83ff]" />
            <span>{{ point }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
