<script setup lang="ts">
import { useI18n } from '@/i18n'
import { GITHUB_URL, GTAMODX_URL } from '@/constants/links'

import BlurText from './ui/BlurText.vue'
import DotField from './ui/DotField.vue'

const { t } = useI18n()

function handleAnimationComplete() {
  return
}
</script>

<template>
  <section id="overview" class="px-4 pb-4 pt-4 lg:px-6 lg:pb-6">
    <div class="mx-auto max-w-7xl overflow-hidden rounded-[28px] border border-white/6 bg-[rgba(255,255,255,0.02)]">
      <div class="relative">
        <div class="absolute inset-0">
          <DotField class-name="opacity-58" :dot-radius="1.35" :dot-spacing="17" :bulge-strength="48" :glow-radius="240"
            :cursor-radius="460" :cursor-force="0.08" bulge-only gradient-from="rgba(122,131,255,0.24)"
            gradient-to="rgba(95,211,195,0.16)" glow-color="#19203a" />
        </div>

        <div
          class="relative flex min-h-[420px] items-center justify-center px-7 py-14 sm:px-10 lg:min-h-[640px] lg:px-12 lg:py-18">
          <div class="max-w-xl text-center">
            <p
              class="mb-5 flex items-center justify-center gap-4 text-[0.72rem] uppercase tracking-[0.28em] text-white/44">
              <span class="h-px w-11 bg-[#7a83ff]/70" />
              {{ t('hero.eyebrow') }}
            </p>

            <BlurText
              :text="t('hero.title')"
              :delay="140"
              animate-by="words"
              direction="top"
              :step-duration="0.42"
              class-name="mx-auto max-w-[18ch] justify-center font-['Arial_Narrow',_'Bahnschrift',_'Segoe_UI',sans-serif] text-2xl font-bold uppercase leading-[0.94] tracking-[0.04em] text-[#f5f7fb] sm:text-3xl lg:text-5xl"
              :on-animation-complete="handleAnimationComplete"
            />

            <p class="mx-auto mt-6 max-w-lg text-base leading-7 text-white/64 sm:text-lg sm:leading-8">
              {{ t('hero.description') }}
            </p>

            <div class="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <a
                :href="GTAMODX_URL"
                target="_blank"
                rel="noreferrer"
                class="inline-flex items-center justify-center rounded-full bg-[#7a83ff] px-6 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-[#070910] transition-colors hover:bg-[#99a0ff]"
              >
                {{ t('hero.primaryCta') }}
              </a>
              <a
                :href="GITHUB_URL"
                target="_blank"
                rel="noreferrer"
                class="inline-flex items-center justify-center rounded-full border border-white/12 px-6 py-3 text-sm font-medium uppercase tracking-[0.22em] text-white/72 transition-colors hover:border-white/20 hover:text-white"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
