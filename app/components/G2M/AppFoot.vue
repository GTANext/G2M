<script setup>
import { useCommon } from '~/composables/ui/useCommon'
import { useWindowControl } from '~/composables/api/useApp'

const { navItems, isActive, externalLinks } = useCommon()
const { minimizeWindow, closeWindow } = useWindowControl()

const items = computed(() => {
    return navItems.value.map(item => ({
        label: item.label,
        to: item.route,
        active: isActive(item.route)
    }))
})
</script>

<template>
    <USeparator :avatar="{
        src: '/images/logo.svg'
    }" />
    <UFooter>
        <template #left>
            <p class="text-muted text-sm">© {{ new Date().getFullYear() }} GTAModx Manager</p>
        </template>

        <UNavigationMenu :items="items" variant="link" />

        <template #right>
            <UColorModeButton />

            <UTooltip text="Open on GitHub">
                <UButton color="neutral" variant="ghost" :to="externalLinks.github" target="_blank"
                    icon="i-simple-icons-github" aria-label="GitHub" />
            </UTooltip>
        </template>
    </UFooter>
</template>