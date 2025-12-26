<script setup>
import { useCommon } from '~/composables/ui/useCommon'
import { useWindowControl } from '~/composables/api/useApp'

const { navItems, isActive, externalLinks } = useCommon()
const { minimizeWindow, closeWindow } = useWindowControl()

const items = computed(() => {
    if (!externalLinks || !Array.isArray(externalLinks)) {
        return []
    }
    return externalLinks.map(item => ({
        label: item.label,
        href: item.route,
        target: '_blank',
        rel: 'noopener noreferrer'
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
            <UTooltip text="Open on GitHub">
                <UButton color="neutral" variant="ghost"
                    :href="externalLinks.find(link => link.key === 'github')?.route" target="_blank"
                    icon="i-simple-icons-github" aria-label="GitHub" />
            </UTooltip>
        </template>
    </UFooter>
</template>