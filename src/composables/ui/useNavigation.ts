import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
    PlayCircleOutlined,
    BuildOutlined,
    DownloadOutlined,
    QuestionCircleOutlined
} from '@ant-design/icons-vue'

export function useNavigation() {
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
        navItems,
        activeRoute,
        isActive,
        handleNavClick
    }
}
