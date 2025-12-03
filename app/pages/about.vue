<script setup>
definePageMeta({
    enableBackground: false
})
</script>

<template>
    <div class="relative grid h-[500px] place-content-center overflow-hidden">
        <p
            class="z-10 whitespace-pre-wrap text-center text-5xl font-medium tracking-tighter text-black dark:text-white">
            <ClientOnly>
                <UITextGenerateEffect words="念念不忘，必有回响" />
            </ClientOnly>
        </p>

        <UIInteractiveGridPattern :class="[
            '[mask-image:radial-gradient(350px_circle_at_center,white,transparent)]',
            'inset-0 h-[200%] skew-y-12',
        ]" />
    </div>
</template>