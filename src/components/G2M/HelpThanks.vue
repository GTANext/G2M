<script setup>
import { ref } from 'vue';
const items = [
    {
        name: '狂风晨',
        avatar: '/images/avatar/kfc.jpg',
        link: 'https://space.bilibili.com/1945126',
        description: 'G2M产品经理',
    },
    {
        name: 'Cyber蝈蝈总',
        avatar: '/images/avatar/Cyber.jpg',
        link: 'https://space.bilibili.com/37706580',
        description: '金牌赞助~',
    }
]
</script>

<template>
    <a-comment v-for="item in items" :key="item.name">
        <template #author>
            <a-typography-link :href="item.link" target="_blank">
                {{ item.name }}
            </a-typography-link>
        </template>
        <template #avatar>
            <a-avatar :src="item.avatar" alt="Han Solo" />
        </template>
        <template #content>
            <p>
                {{ item.description }}
            </p>
        </template>
    </a-comment>
</template>