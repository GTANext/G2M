<script setup>
import { useWindowControl } from '@/composables/api/useWindowControl'
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
            <div class="titlebar-left" data-tauri-drag-region>
                <div class="app-info">
                    <AppstoreOutlined class="app-icon" />
                    <span class="app-name">G2M</span>
                    <span class="app-subtitle">MOD 管理器</span>
                </div>
            </div>

            <div class="titlebar-center" data-tauri-drag-region="false">
                <a-space size="small">
                    <a-button v-for="item in navItems" :key="item.key"
                        :type="!isActive(item.route) ? 'text' : 'default'" @click="handleNavClick(item)">
                        <template #icon>
                            <component :is="item.icon" />
                        </template>
                        {{ item.label }}
                    </a-button>
                </a-space>
            </div>

            <div class="titlebar-right" data-tauri-drag-region="false">
                <a-space size="small">
                    <a-button type="text" size="small" title="设置">
                        <template #icon>
                            <SettingOutlined />
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
    z-index: 1000;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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

.app-icon {
    font-size: 16px;
}

.app-name {
    font-weight: 600;
    font-size: 14px;
}

.app-subtitle {
    font-size: 12px;
    opacity: 0.8;
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

.custom-titlebar[data-tauri-drag-region] {
    -webkit-app-region: drag;
}

.titlebar-center[data-tauri-drag-region="false"],
.titlebar-right[data-tauri-drag-region="false"] {
    -webkit-app-region: no-drag;
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
