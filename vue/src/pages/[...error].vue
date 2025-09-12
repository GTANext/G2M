<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const onClickAction = () => {
  router.push('/')
}
</script>

<template>
  <v-empty-state
    action-text="返回首页"
    image="images/error.gif"
    title="没有这个页面捏"
    @click:action="onClickAction"
  ></v-empty-state>
</template>

<style scoped>

</style>
