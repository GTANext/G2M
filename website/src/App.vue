<script setup lang="ts">
import Hero from '@/components/hero.vue'
import Navbar from '@/components/Navbar.vue'
import WorkflowTabs from '@/components/WorkflowTabs.vue'
</script>

<template>
    <div id="top" class="min-h-screen bg-[#0b0f17] text-[#f5f7fb]">
        <Navbar />
        <Hero />
        <WorkflowTabs />
    </div>
</template>
