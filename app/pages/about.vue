<script setup>
import { useCommon } from '~/composables/ui/useCommon'

definePageMeta({
    enableBackground: false
})

const { thankYouList } = useCommon()
const testimonials = thankYouList
</script>

<template>
    <div class="relative grid h-[500px] place-content-center overflow-hidden">
        <p
            class="z-10 whitespace-pre-wrap text-center text-5xl font-medium tracking-tighter text-black dark:text-white">
            <ClientOnly>
                <UITextGenerateEffect words="念念不忘 必有回响" />
            </ClientOnly>
        </p>

        <UIInteractiveGridPattern :class="[
            '[mask-image:radial-gradient(350px_circle_at_center,white,transparent)]',
            'inset-0 h-[200%] skew-y-12',
        ]" />
    </div>
    <div class="relative h-[500px] w-full overflow-hidden rounded-lg border bg-background">
        <div class="flex items-center justify-center">
            <UISparklesText text="特别感谢" :colors="{ first: '#9E7AFF', second: '#FE8BBB' }" :sparkles-count="10"
                class="mt-8" />
        </div>
        <div class="mt-[64px] flex justify-center px-12">
            <UITestimonialSlider :testimonials="testimonials" />
        </div>
    </div>
</template>