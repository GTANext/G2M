<script setup>
import { ref, computed } from 'vue'

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
        data: node
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
    if (typeof window !== 'undefined' && window.__dragRemoveData) {
        removeData = window.__dragRemoveData
    } else {
        try {
            const data = e.dataTransfer.getData('application/json')
            if (data) {
                const parsed = JSON.parse(data)
                if (parsed.type === 'remove') {
                    removeData = parsed.fileData
                }
            }
        } catch (err) {
            // 忽略错误
        }
    }
    
    if (removeData) {
        emit('remove', removeData)
        if (typeof window !== 'undefined' && window.__dragRemoveData) {
            delete window.__dragRemoveData
        }
    }
}
</script>

<template>
    <div 
        data-tauri-drag-region="false"
        @dragover.prevent
        @drop="handleDrop"
        style="height: 100%;"
    >
        <a-tree
            :tree-data="treeData"
            v-model:expandedKeys="expandedKeys"
            block-node
        >
            <template #title="{ dataRef }">
                <span
                    :draggable="true"
                    @dragstart="(e) => handleDragStart(e, dataRef)"
                    @dragend="handleDragEnd"
                    style="cursor: move; user-select: none;"
                >
                    {{ dataRef.title }}
                </span>
            </template>
        </a-tree>
    </div>
</template>
