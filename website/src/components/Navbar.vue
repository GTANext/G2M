<script setup lang="ts">
import type { AppLocale } from '@/i18n'
import { BILIBILI_URL, FEEDBACK_URL, GITHUB_URL, GTAMODX_URL } from '@/constants/links'
import { useI18n } from '@/i18n'

const { locale, localeOptions, setLocale, t } = useI18n()

function handleLocaleChange(event: Event) {
    const nextLocale = (event.target as HTMLSelectElement).value as AppLocale
    setLocale(nextLocale)
}
</script>

<template>
    <header class="sticky top-0 z-50 border-b border-white/6 bg-[rgba(10,13,21,0.72)] backdrop-blur-xl">
        <div class="mx-auto flex h-18 max-w-7xl items-center justify-between gap-6 px-6 lg:px-10">
            <a href="#top" class="flex min-w-0 items-center gap-4 text-white transition-colors hover:text-white/80"
                :aria-label="t('navbar.goTop')">
                <img src="@/assets/logo.svg" class="h-11 w-11" alt="G2M" />
            </a>

            <nav class="hidden items-center gap-8 md:flex">
                <a :href="BILIBILI_URL" target="_blank" rel="noreferrer"
                    class="text-xs font-medium uppercase tracking-[0.22em] text-white/54 transition-colors hover:text-white">
                    Bilibili
                </a>
                <a :href="FEEDBACK_URL" target="_blank" rel="noreferrer"
                    class="text-xs font-medium uppercase tracking-[0.22em] text-white/54 transition-colors hover:text-white">
                    Issue
                </a>
            </nav>

            <div class="flex items-center gap-3">
                <label class="hidden lg:block">
                    <span class="sr-only">{{ t('common.language') }}</span>
                    <select :value="locale"
                        class="min-w-[124px] cursor-pointer appearance-none rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 outline-none transition-colors hover:border-white/18"
                        @change="handleLocaleChange">
                        <option v-for="option in localeOptions" :key="option.value" :value="option.value"
                            class="bg-[#0f1420] text-white">
                            {{ option.label }}
                        </option>
                    </select>
                </label>
                <a :href="GITHUB_URL" target="_blank" rel="noreferrer"
                    class="hidden rounded-full border border-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-white/70 transition-colors hover:border-white/20 hover:text-white sm:inline-flex">
                    GitHub
                </a>
                <a :href="GTAMODX_URL" target="_blank" rel="noreferrer"
                    class="inline-flex items-center justify-center rounded-full bg-[#7a83ff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#070910] transition-colors hover:bg-[#97a0ff]">
                    Download
                </a>
            </div>
        </div>
    </header>
</template>
