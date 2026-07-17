<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@/i18n'

const { t } = useI18n()

const featureRows = computed(() => [
    {
        name: t('preview.rows.silentPatch.name'),
        role: t('preview.rows.silentPatch.role'),
        state: t('preview.rows.silentPatch.state'),
        hint: t('preview.rows.silentPatch.hint')
    },
    {
        name: t('preview.rows.cleoRedux.name'),
        role: t('preview.rows.cleoRedux.role'),
        state: t('preview.rows.cleoRedux.state'),
        hint: t('preview.rows.cleoRedux.hint')
    },
    {
        name: t('preview.rows.projectProps.name'),
        role: t('preview.rows.projectProps.role'),
        state: t('preview.rows.projectProps.state'),
        hint: t('preview.rows.projectProps.hint')
    }
])

const targets = computed(() => [
    t('preview.targets.iii'),
    t('preview.targets.vc'),
    t('preview.targets.sa')
])
</script>

<template>
    <div
        id="preview"
        class="overflow-hidden rounded-[24px] border border-white/8 bg-[rgba(14,18,28,0.68)]"
    >
        <div class="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-4 sm:px-6">
            <div>
                <p class="text-[0.68rem] uppercase tracking-[0.24em] text-white/34">
                    {{ t('preview.eyebrow') }}
                </p>
                <h2 class="mt-2 text-lg font-semibold text-white/92 sm:text-xl">
                    {{ t('preview.title') }}
                </h2>
            </div>

            <div class="flex flex-wrap justify-end gap-2">
                <span
                    v-for="target in targets"
                    :key="target"
                    class="rounded-full border border-white/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/54"
                >
                    {{ target }}
                </span>
            </div>
        </div>

        <div class="border-b border-white/8 px-5 py-4 sm:px-6">
            <div class="flex items-center justify-between gap-4">
                <div>
                    <p class="text-[0.68rem] uppercase tracking-[0.22em] text-white/34">
                        {{ t('preview.currentFocus') }}
                    </p>
                    <p class="mt-2 text-base font-medium text-white/84">
                        {{ t('preview.currentFocusValue') }}
                    </p>
                </div>

                <span class="rounded-full border border-[#5fd3c3]/22 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#80e8da]">
                    {{ t('preview.statusReady') }}
                </span>
            </div>
        </div>

        <ul>
            <li
                v-for="row in featureRows"
                :key="row.name"
                class="grid gap-3 border-b border-white/8 px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-6"
            >
                <div class="min-w-0">
                    <div class="flex items-center gap-3">
                        <span class="h-2.5 w-2.5 shrink-0 rounded-full bg-[#7a83ff]" />
                        <p class="truncate text-sm font-semibold uppercase tracking-[0.16em] text-white/88">
                            {{ row.name }}
                        </p>
                    </div>

                    <p class="mt-2 text-sm text-white/42">
                        {{ row.role }}
                    </p>

                    <p class="mt-3 text-sm leading-6 text-white/64">
                        {{ row.hint }}
                    </p>
                </div>

                <div class="flex items-center sm:justify-end">
                    <span class="rounded-full border border-white/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/56">
                        {{ row.state }}
                    </span>
                </div>
            </li>
        </ul>

        <div
            id="download"
            class="flex flex-col gap-4 border-t border-white/8 px-5 py-4 text-sm text-white/58 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
            <p>
                {{ t('preview.footer') }}
            </p>
            <a
                href="#top"
                class="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/72 transition-colors hover:border-white/20 hover:text-white"
            >
                {{ t('preview.backToTop') }}
            </a>
        </div>
    </div>
</template>
