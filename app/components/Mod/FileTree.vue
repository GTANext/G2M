<script setup>
import { ref, computed, h } from 'vue'
import { Folder, File } from 'lucide-vue-next'

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

const expandedKeys = ref(['root'])

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

    // 过滤掉 g2m.json 配置文件
    if (!node.is_directory && (node.name === 'g2m.json' || node.path?.endsWith('/g2m.json') || node.path === 'g2m.json')) {
        return null
    }

    const hasChildren = node.children && node.children.length > 0
    const children = hasChildren ? node.children.map(renderNode).filter(n => n !== null) : undefined

    return {
        key: node.path,
        label: node.name,
        isLeaf: !node.is_directory || !hasChildren || !children || children.length === 0,
        children: children,
        data: node,
        isFolder: !!node.is_directory
    }
}

const treeData = computed(() => {
    if (!props.tree || !Array.isArray(props.tree)) {
        // 即使没有文件树数据，也显示根目录（空状态）
        return [{
            key: 'root',
            label: '根目录',
            isLeaf: false,
            children: [],
            isFolder: true,
            isRoot: true,
            isEmpty: true
        }]
    }
    const files = props.tree.map(renderNode).filter(n => n !== null)
    
    // 始终显示根目录，即使没有文件
    return [{
        key: 'root',
        label: '根目录',
        isLeaf: false,
        children: files,
        isFolder: true,
        isRoot: true,
        isEmpty: files.length === 0
    }]
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
}

// 处理拖拽悬停
const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
}

// 处理拖拽放置
const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()

    let removeData = null

    // 优先从 window 获取数据
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

// 渲染树节点标签
const renderLabel = ({ option }) => {
    // 根目录节点 作为拖拽目标，不拖拽
    if (option.isRoot) {
        return h('div', {
            class: 'inline-flex items-center gap-1.5 px-2 py-1 rounded font-semibold text-gray-700 dark:text-gray-200',
            onDragover: (e) => {
                e.preventDefault()
                e.stopPropagation()
                e.dataTransfer.dropEffect = 'move'
            },
            onDrop: handleDrop
        }, [
            h(Folder, {
                class: 'flex-shrink-0 text-gray-500 dark:text-gray-400',
                size: 14
            }),
            h('span', {
                class: 'text-sm flex-1 truncate'
            }, option.label)
        ])
    }

    // 普通文件节点：可拖拽
    return h('div', {
        class: 'inline-flex items-center gap-1.5 cursor-move select-none px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
        draggable: true,
        onDragstart: (e) => handleDragStart(e, option),
        onDragend: handleDragEnd
    }, [
        h(option.isFolder ? Folder : File, {
            class: 'flex-shrink-0 text-gray-600 dark:text-gray-400',
            size: 14
        }),
        h('span', {
            class: 'text-sm text-gray-700 dark:text-gray-300 flex-1 truncate'
        }, option.label)
    ])
}
</script>

<template>
    <div data-tauri-drag-region="false" @dragover="handleDragOver" @drop="handleDrop" class="h-full w-full">
        <template v-if="treeData.length">
            <NTree :data="treeData" v-model:expanded-keys="expandedKeys" block-line :render-label="renderLabel"
                class="w-full" />
            <!-- 如果根目录为空，显示空状态 -->
            <div v-if="treeData[0]?.isEmpty" class="ml-8 mt-2 py-4">
                <NEmpty description="暂无文件" size="small" />
            </div>
        </template>
        <div v-else class="flex items-center justify-center h-full min-h-[200px]">
            <NEmpty description="暂无文件" />
        </div>
    </div>
</template>