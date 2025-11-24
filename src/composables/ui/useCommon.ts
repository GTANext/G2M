import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
    PlayCircleOutlined,
    BuildOutlined,
    DownloadOutlined,
    QuestionCircleOutlined
} from '@ant-design/icons-vue'

// QQ 交流群配置
export const QQ_GROUPS = [
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

// 外部链接配置
export const EXTERNAL_LINKS = {
    github: 'https://github.com/GTANext/G2M',
    bilibili: 'https://space.bilibili.com/435502585',
}

export function useCommon() {
    const router = useRouter()
    const route = useRoute()

    // 导航菜单配置
    const navItems = ref([
        { key: 'index', label: '启动', route: '/', icon: PlayCircleOutlined },
        { key: 'build', label: '构建', route: '/build', icon: BuildOutlined },
        { key: 'download', label: '下载', route: '/download', icon: DownloadOutlined },
        { key: 'help', label: '帮助', route: '/help', icon: QuestionCircleOutlined }
    ])

    // 计算当前激活的路由
    const activeRoute = computed(() => route.path)

    // 检查按钮是否激活
    const isActive = (itemRoute: string) => {
        return activeRoute.value === itemRoute
    }

    const handleNavClick = (item: { route: string }) => {
        router.push(item.route)
    }

    return {
        // 导航相关
        navItems,
        activeRoute,
        isActive,
        handleNavClick,

        // 通用信息
        qqGroups: QQ_GROUPS,
        externalLinks: EXTERNAL_LINKS,
    }
}