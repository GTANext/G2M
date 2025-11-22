<script setup>
const qqGroups = [
    {
        name: '254239242',
        link: 'https://qm.qq.com/q/4zCXv1Lmcw',
    },
    {
        name: '894712495',
        link: 'https://qm.qq.com/q/nEjjiknj6S',
    },
    {
        name: '829270254',
        link: 'https://qm.qq.com/q/gcBGq9A82k',
    },
]
</script>

<template>
    <a-flex :align="'center'" :justify="'center'" :style="{ height: '100%' }">
        <a-result status="error" title="出错啦" sub-title="你似乎来到了没有知识存在的荒原">
            <template #extra>
                <a-button key="console" type="primary" href="https://space.bilibili.com/435502585" target="_blank">哔哩哔哩</a-button>
                <a-button key="buy" href="https://github.com/GTANext/G2M" target="_blank">GitHub</a-button>
            </template>

            <div class="desc">
                <p>
                    QQ交流群:
                    <a-space wrap>
                        <a-button 
                            v-for="item in qqGroups" 
                            :key="item.name" 
                            type="link" 
                            :href="item.link"
                            target="_blank" block>
                            {{ item.name }}
                        </a-button>
                    </a-space>
                </p>
                <p>
                    注意: 
                    <a-button type="link" danger>
                        G2M是免费开源的如果发现有人将其用于商业用途请及时联系作者的B站
                    </a-button>
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