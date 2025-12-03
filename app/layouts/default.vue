<script setup>
const route = useRoute()
const enableBackground = computed(() => {
    return route.meta.enableBackground !== false
})
</script>

<template>
    <UIStarsBackground v-if="enableBackground" class="inset-0 -z-10">
        <G2MAppHead />
        <UMain class="my-4 pt-14">
            <UContainer>
                <slot />
            </UContainer>
        </UMain>
        <G2MAppFoot />
    </UIStarsBackground>
    <template v-else>
        <G2MAppHead />
        <UMain class="my-4 pt-14">
            <UContainer>
                <slot />
            </UContainer>
        </UMain>
        <G2MAppFoot />
    </template>
</template>