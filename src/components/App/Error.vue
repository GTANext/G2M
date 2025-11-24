<script setup>
import { useCommon } from '@/composables/ui/useCommon'

const { qqGroups, externalLinks } = useCommon()
</script>

<template>
    <a-flex :align="'center'" :justify="'center'" :style="{ height: '100%' }">
        <a-result status="error" title="出错啦" sub-title="你似乎来到了没有知识存在的荒原">
            <template #extra>
                <a-button key="bilibili" type="primary" :href="externalLinks.bilibili" target="_blank">哔哩哔哩</a-button>
                <a-button key="github" :href="externalLinks.github" target="_blank">GitHub</a-button>
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