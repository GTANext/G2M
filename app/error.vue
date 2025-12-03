<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
    error: NuxtError
}>()
</script>

<template>
    <UApp>
        <G2MAppHead />
        <UError :error="error" />
        <G2MAppFoot />
    </UApp>
</template>
