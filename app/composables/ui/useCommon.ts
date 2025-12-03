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

// 感谢名单配置
export interface ThankYouItem {
    img: string
    quote: string
    name: string
    role: string
}

export const THANK_YOU_LIST: ThankYouItem[] = [
    {
        img: `/images/avatar/YuiNijika.jpg`,
        quote: "安装、管理、构建，就这么简单。",
        name: "鼠子",
        role: "G2M开发者, GTAMODX首席股东",
    },
    {
        img: `/images/avatar/kfc.jpg`,
        quote: "我去不早说",
        name: "狂风晨",
        role: "G2M产品经理, GTAMODX站长",
    },
    {
        img: `/images/avatar/Cyber.jpg`,
        quote: "欧内该，瓦达西！",
        name: "Cyber蝈蝈总",
        role: "G2M金牌赞助, 老一辈GTA艺术家",
    }
]

export function useCommon() {
    const router = useRouter()
    const route = useRoute()

    // 导航菜单配置
    const navItems = ref([
        { key: 'index', label: '启动', route: '/', icon: null },
        { key: 'build', label: '构建', route: '/build', icon: null },
        { key: 'download', label: '下载', route: '/download', icon: null },
        { key: 'about', label: '关于', route: '/about', icon: null }
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
        thankYouList: THANK_YOU_LIST,
    }
}