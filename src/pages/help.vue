<script setup>
import { SmileTwoTone } from '@ant-design/icons-vue';
const activeKey = ref([]);
const text = `不知道喵`;
</script>

<template>
    <a-flex :align="'center'" :justify="'center'" :style="{ height: '100%' }">
        <a-card class="help-card">
            <a-result title="帮助" sub-title="这里汇集了一些常见的问题以及解决方法, 如果还是有问题那么就请加群询问">
                <template #icon>
                    <smile-twoTone />
                </template>
                <template #extra>
                    <a-button key="console" type="primary" href="https://space.bilibili.com/435502585" target="_blank">哔哩哔哩</a-button>
                    <a-button key="buy" href="https://github.com/GTANext/G2M" target="_blank">GitHub</a-button>
                </template>
            </a-result>
            <a-collapse v-model:activeKey="activeKey" accordion>
                <a-collapse-panel key="1" header="鸣谢">
                    <G2MHelpThanks />
                </a-collapse-panel>
                <a-collapse-panel key="2" header="安装MOD/前置出错">
                    <p>{{ text }}</p>
                </a-collapse-panel>
                <a-collapse-panel key="3" header="游戏添加/下载/解压失败">
                    <p>{{ text }}</p>
                </a-collapse-panel>
            </a-collapse>
        </a-card>
    </a-flex>
</template>

<style scoped>
.help-card {
    width: 100%;
    max-width: 1400px;
}
</style>