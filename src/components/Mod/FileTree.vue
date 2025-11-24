<script setup>
import { ref, computed } from 'vue'
import { FolderOutlined, FileOutlined } from '@ant-design/icons-vue'

const props = defineProps({
    tree: {
        type: Array,
        default: () => []
    },
    addedFiles: {
        type: Array,
        default: () => []
    }
})

const emit = defineEmits(['drag-start', 'remove'])

const expandedKeys = ref([])

// 检查文件是否已添加
const isFileAdded = (path) => {
    return props.addedFiles.some(file => file.source === path)
}

// 转换节点数据为 Tree 组件需要的格式
const renderNode = (node) => {
    // 如果文件已添加，不显示
    if (isFileAdded(node.path)) {
        return null
    }

    const hasChildren = node.children && node.children.length > 0
    const children = hasChildren ? node.children.map(renderNode).filter(n => n !== null) : undefined

    return {
        key: node.path,
        title: node.name,
        isLeaf: !node.is_directory || !hasChildren || !children || children.length === 0,
        children: children,
        data: node,
        isFolder: !!node.is_directory
    }
}

const treeData = computed(() => {
    if (!props.tree || !Array.isArray(props.tree)) {
        return []
    }
    return props.tree.map(renderNode).filter(n => n !== null)
})

// 处理拖拽开始
const handleDragStart = (e, node) => {
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify(node.data))
    if (typeof window !== 'undefined') {
        window.__dragNodeData = node.data
    }
    emit('drag-start', node.data)
}

// 处理拖拽结束
const handleDragEnd = (e) => {
    e.stopPropagation()
    if (typeof window !== 'undefined' && window.__dragNodeData) {
        delete window.__dragNodeData
    }
}

// 处理拖拽放置（接收从右侧拖回来的文件）
const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()

    let removeData = null

    // 优先从 window 获取数据（Tauri 环境中更可靠）
    if (typeof window !== 'undefined' && window.__dragRemoveData) {
        removeData = window.__dragRemoveData
    } else {
        // 如果 window 中没有，尝试从 dataTransfer 获取
        try {
            const data = e.dataTransfer.getData('application/json')
            if (data) {
                const parsed = JSON.parse(data)
                if (parsed.type === 'remove' && parsed.fileData) {
                    removeData = parsed.fileData
                } else if (parsed.path || parsed.source) {
                    // 兼容直接传递的文件数据
                    removeData = parsed
                }
            }
        } catch (err) {
            // 忽略错误
        }
    }

    if (removeData) {
        emit('remove', removeData)
        // 清理 window 数据
        if (typeof window !== 'undefined' && window.__dragRemoveData) {
            delete window.__dragRemoveData
        }
    }
}
</script>

<template>
    <div data-tauri-drag-region="false" @dragover="(e) => {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'move'
    }" @drop="handleDrop" style="height: 100%;">
        <template v-if="treeData.length">
            <a-tree :tree-data="treeData" v-model:expandedKeys="expandedKeys" block-node>
                <template #title="{ dataRef }">
                    <span class="tree-node" :draggable="true" @dragstart="(e) => handleDragStart(e, dataRef)"
                        @dragend="handleDragEnd">
                        <component :is="dataRef.isFolder ? FolderOutlined : FileOutlined" class="node-icon" />
                        <span class="node-title">{{ dataRef.title }}</span>
                    </span>
                </template>
            </a-tree>
        </template>
        <a-flex v-else :align="'center'" :justify="'center'" :style="{ height: '100%' }">
            <a-empty />
        </a-flex>
    </div>
</template>

<style scoped>
.tree-node {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: move;
    user-select: none;
}

.node-icon {
    font-size: 14px;
}
</style>
