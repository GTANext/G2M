<script setup>
import { useGameList } from '~/composables/ui/useGameList'

const { games, isLoading, fetchGames } = useGameList()

onMounted(() => {
    fetchGames()
})
</script>

<template>
    <div v-if="isLoading">加载中...</div>
    <UBlogPosts v-else>
        <GameCard v-for="game in games" :key="game.id" :game="game" />
        <GameAddCard />
    </UBlogPosts>
</template>
