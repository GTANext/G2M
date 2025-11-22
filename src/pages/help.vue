<script setup>
import {
    HeartFilled,
    InfoCircleOutlined
} from '@ant-design/icons-vue'
</script>

<template>
    <a-flex :align="'center'" :justify="'center'" :style="{ height: '100%' }">
        <a-result status="error" title="你好鸭" sub-title="你似乎来到了没有知识存在的荒原">
            <template #icon>
                <HeartFilled />
            </template>
            <template #extra>
                <a-button key="console" type="primary" href="https://space.bilibili.com/435502585"
                    target="_blank">哔哩哔哩</a-button>
                <a-button key="buy" href="https://github.com/GTANext/G2M" target="_blank">GitHub</a-button>
            </template>

            <div class="desc">
                <p>
                    <InfoCircleOutlined :style="{ color: '#1677ff' }" />
                    Your account has been frozen
                    <a>Thaw immediately &gt;</a>
                </p>
            </div>
        </a-result>
    </a-flex>
</template>

<style scoped>
.desc p {
    margin-bottom: 1em;
}
</style>