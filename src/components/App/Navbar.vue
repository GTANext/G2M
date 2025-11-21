<script setup>
import { useWindowControl } from '@/composables/api/useApp'
import { useNavigation } from '@/composables/ui/useNavigation'
import {
    AppstoreOutlined,
    SettingOutlined,
    MinusOutlined,
    BorderOutlined,
    CloseOutlined
} from '@ant-design/icons-vue'

const { isMaximized, minimizeWindow, toggleMaximize, closeWindow } = useWindowControl()
const { navItems, isActive, handleNavClick } = useNavigation()
</script>

<template>
    <a-layout-header class="custom-titlebar" data-tauri-drag-region>
        <div class="titlebar-content">
            <div class="titlebar-left">
                <div class="app-info">
                    <span class="app-name">G2M</span>
                    <span class="app-subtitle">MOD 管理器</span>
                </div>
            </div>

            <div class="titlebar-center">
                <a-space size="small" class="no-drag">
                    <a-button v-for="item in navItems" :key="item.key"
                        :type="!isActive(item.route) ? 'text' : 'default'" @click="handleNavClick(item)">
                        <template #icon>
                            <component :is="item.icon" />
                        </template>
                        {{ item.label }}
                    </a-button>
                </a-space>
            </div>

            <div class="titlebar-right">
                <a-space size="small" class="no-drag">
                    <a-button type="text" size="small" title="设置" href="https://github.com/GTANext/G2M" target="_blank">
                        <template #icon>
                            <n-icon>
                                <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                                    viewBox="0 0 496 512">
                                    <path
                                        d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6c-3.3.3-5.6-1.3-5.6-3.6c0-2 2.3-3.6 5.2-3.6c3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9c2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9c.3 2 2.9 3.3 5.9 2.6c2.9-.7 4.9-2.6 4.6-4.6c-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2c12.8 2.3 17.3-5.6 17.3-12.1c0-6.2-.3-40.4-.3-61.4c0 0-70 15-84.7-29.8c0 0-11.4-29.1-27.8-36.6c0 0-22.9-15.7 1.6-15.4c0 0 24.9 2 38.6 25.8c21.9 38.6 58.6 27.5 72.9 20.9c2.3-16 8.8-27.1 16-33.7c-55.9-6.2-112.3-14.3-112.3-110.5c0-27.5 7.6-41.3 23.6-58.9c-2.6-6.5-11.1-33.3 2.6-67.9c20.9-6.5 69 27 69 27c20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27c13.7 34.7 5.2 61.4 2.6 67.9c16 17.7 25.8 31.5 25.8 58.9c0 96.5-58.9 104.2-114.8 110.5c9.2 7.9 17 22.9 17 46.4c0 33.7-.3 75.4-.3 83.6c0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252C496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2c1.6 1.6 3.9 2.3 5.2 1c1.3-1 1-3.3-.7-5.2c-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9c1.6 1 3.6.7 4.3-.7c.7-1.3-.3-2.9-2.3-3.9c-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2c2.3 2.3 5.2 2.6 6.5 1c1.3-1.3.7-4.3-1.3-6.2c-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9c1.6 2.3 4.3 3.3 5.6 2.3c1.6-1.3 1.6-3.9 0-6.2c-1.4-2.3-4-3.3-5.6-2z"
                                        fill="currentColor"></path>
                                </svg>
                            </n-icon>
                        </template>
                    </a-button>

                    <a-button type="text" size="small" @click="minimizeWindow" title="最小化">
                        <MinusOutlined />
                    </a-button>

                    <!-- <a-button type="text" size="small" @click="toggleMaximize" :title="isMaximized ? '还原' : '最大化'">
                        <BorderOutlined :style="{ transform: isMaximized ? 'scale(0.8)' : 'scale(1)' }" />
                    </a-button> -->

                    <a-button type="text" size="small" class="close-btn" @click="closeWindow" title="关闭">
                        <CloseOutlined />
                    </a-button>
                </a-space>
            </div>
        </div>
    </a-layout-header>
</template>

<style scoped>
.custom-titlebar {
    height: 40px;
    background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
    padding: 0 12px;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1145141919810;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    /* 全局拖拽设置 */
    -webkit-app-region: drag;
}

.titlebar-content {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.titlebar-left {
    flex: 1;
    display: flex;
    align-items: center;
}

.titlebar-center {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
}

.titlebar-right {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
}

.app-info {
    color: #fff;
    display: flex;
    align-items: center;
    gap: 8px;
}

.app-name {
    font-weight: 600;
    font-size: 14px;
}

.app-subtitle {
    font-size: 12px;
    opacity: 0.8;
}

/* 按钮区域禁止拖拽，确保可以正常点击 */
.no-drag {
    -webkit-app-region: no-drag;
}

:deep(.ant-btn-text) {
    color: #fff;
}

:deep(.ant-btn-text:hover) {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
}

.close-btn:hover {
    background: #ff4d4f !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .titlebar-center {
        display: none;
    }

    .app-subtitle {
        display: none;
    }
}
</style>