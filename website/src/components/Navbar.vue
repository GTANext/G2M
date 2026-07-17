<script setup lang="ts">
import type { AppLocale } from '@/i18n'
import { BILIBILI_URL, FEEDBACK_URL, GITHUB_URL, GTAMODX_URL } from '@/constants/links'
import { useI18n } from '@/i18n'
import { ref } from 'vue'

const { locale, localeOptions, setLocale, t } = useI18n()
const isDrawerOpen = ref(false)

function handleLocaleChange(event: Event) {
    const nextLocale = (event.target as HTMLSelectElement).value as AppLocale
    setLocale(nextLocale)
}

function toggleDrawer() {
    isDrawerOpen.value = !isDrawerOpen.value
}

function closeDrawer() {
    isDrawerOpen.value = false
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
                    {{ t('navbar.issue') }}
                </a>
            </nav>

            <div class="flex items-center gap-3">
                <label class="hidden lg:block">
                    <span class="sr-only">{{ t('common.language') }}</span>
                    <select :value="locale"
                        class="min-w-[124px] cursor-pointer appearance-none rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 outline-none transition-colors hover:border-white/18 text-center"
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
                    GTAMODX
                </a>

                <button @click="toggleDrawer" class="md:hidden inline-flex items-center justify-center text-white/72 hover:text-white transition-colors" aria-label="Toggle navigation">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                </button>
            </div>
        </div>
    </header>

    <div v-if="isDrawerOpen" class="fixed inset-0 z-50 md:hidden">
        <div class="absolute inset-0 bg-black/60" @click="closeDrawer"></div>
        <div class="absolute right-0 top-0 h-full w-64 max-w-[80vw] border-l border-white/8 bg-[#0b0f17] p-6">
            <div class="flex justify-end mb-6">
                <button @click="closeDrawer" class="text-white/72 hover:text-white transition-colors" aria-label="Close navigation">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <nav class="flex flex-col gap-4">
                <a :href="BILIBILI_URL" target="_blank" rel="noreferrer"
                    class="text-sm font-medium uppercase tracking-[0.22em] text-white/72 transition-colors hover:text-white"
                    @click="closeDrawer">
                    Bilibili
                </a>
                <a :href="FEEDBACK_URL" target="_blank" rel="noreferrer"
                    class="text-sm font-medium uppercase tracking-[0.22em] text-white/72 transition-colors hover:text-white"
                    @click="closeDrawer">
                    {{ t('navbar.issue') }}
                </a>
                <a :href="GITHUB_URL" target="_blank" rel="noreferrer"
                    class="text-sm font-medium uppercase tracking-[0.22em] text-white/72 transition-colors hover:text-white"
                    @click="closeDrawer">
                    GitHub
                </a>
            </nav>

            <div class="mt-8 pt-6 border-t border-white/8">
                <label class="block">
                    <span class="sr-only">{{ t('common.language') }}</span>
                    <select :value="locale"
                        class="w-full cursor-pointer appearance-none rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 outline-none transition-colors hover:border-white/18 text-center"
                        @change="handleLocaleChange">
                        <option v-for="option in localeOptions" :key="option.value" :value="option.value"
                            class="bg-[#0f1420] text-white">
                            {{ option.label }}
                        </option>
                    </select>
                </label>
            </div>

            <a :href="GTAMODX_URL" target="_blank" rel="noreferrer"
                class="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#7a83ff] px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#070910] transition-colors hover:bg-[#97a0ff]"
                @click="closeDrawer">
                Download
            </a>
        </div>
    </div>
</template>
