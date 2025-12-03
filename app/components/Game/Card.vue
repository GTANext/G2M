<script setup>
import { useGameUtils } from '~/composables/game/useGameUtils'
import { formatTime } from '~/utils/format'

const props = defineProps({
    game: {
        type: Object,
        required: true
    }
})

const { getGameIcon } = useGameUtils()

const gameImage = computed(() => props.game ? getGameIcon(props.game) : '/images/null.svg')
const gameTitle = computed(() => props.game?.name || '未知游戏')
const gameDescription = computed(() => props.game?.dir || '')
const gameDate = computed(() => formatTime(props.game?.time))
const gameTo = computed(() => props.game?.id ? `/game/${props.game.id}` : '#')
</script>

<template>
    <UBlogPost 
        :title="gameTitle" 
        :description="gameDescription" 
        :image="gameImage" 
        :date="gameDate" 
        :to="gameTo"
    />
</template>
