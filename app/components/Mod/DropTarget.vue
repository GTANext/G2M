<script setup>
import { computed, ref, watch, h } from 'vue'
import { Folder, File, FolderOpen, Trash2 } from 'lucide-vue-next'

const props = defineProps({
    modName: {
        type: String,
        default: ''
    },
    addedFiles: {
        type: Array,
        default: () => []
    },
    gameDir: {
        type: String,
        default: ''
    },
    modTree: {
        type: Array,
        default: () => []
    }
})

const emit = defineEmits(['drop', 'remove', 'update-target'])

const sortTreeNodes = (nodes = []) => {
    nodes.sort((a, b) => {
        // 判断是否为文件夹
        const aIsFolder = a.isFolder || (a.fileData?.isDirectory === true) || (!a.fileData && !!a.children && a.children.length > 0)
        const bIsFolder = b.isFolder || (b.fileData?.isDirectory === true) || (!b.fileData && !!b.children && b.children.length > 0)

        if (aIsFolder !== bIsFolder) {
            return aIsFolder ? -1 : 1
        }

        return (a.label || '').localeCompare(b.label || '')
    })

    nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
            sortTreeNodes(node.children)
        }
    })
}

const findNodeInModTree = (nodes = [], targetPath) => {
    for (const node of nodes) {
        if (node.path === targetPath) {
            return node
        }
        if (node.children && node.children.length > 0) {
            const found = findNodeInModTree(node.children, targetPath)
            if (found) {
                return found
            }
        }
    }
    return null
}

const convertModChildrenToPreview = (children = [], parentNode) => {
    return children.map(child => {
        const childNode = {
            key: `preview-${parentNode.key}-${child.path || child.name}`,
            label: child.name,
            path: child.path || child.name,
            isLeaf: !child.is_directory,
            preview: true
        }

        if (child.children && child.children.length > 0) {
            childNode.children = convertModChildrenToPreview(child.children, childNode)
        }

        return childNode
    })
}

// 构建目标文件夹树结构
const buildTargetTree = () => {
    const children = [
        {
            key: 'cleo',
            label: 'CLEO',
            path: 'CLEO',
            isLeaf: false,
            children: []
        },
        {
            key: 'cleoredux',
            label: 'CLEO Redux',
            path: 'plugins/CLEO',
            isLeaf: false,
            children: []
        },
        {
            key: 'plugins',
            label: 'Plugins',
            path: 'plugins',
            isLeaf: false,
            children: []
        },
        {
            key: 'scripts',
            label: 'Scripts',
            path: 'scripts',
            isLeaf: false,
            children: []
        }
    ]

    // ModLoader 文件夹
    children.push({
        key: 'modloader',
        label: 'ModLoader',
        path: props.modName ? `modloader/${props.modName}` : 'modloader',
        isLeaf: false,
        children: []
    })

    // 根目录文件列表
    const rootFiles = []

    // 根据 target 路径找到或创建对应的节点
    const findOrCreateNode = (targetPath, parentNode, parentPath) => {
        const pathParts = targetPath.split('/').filter(p => p)
        if (pathParts.length === 0) {
            return parentNode
        }

        let currentPath = parentPath
        let currentNode = parentNode

        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i]
            currentPath = currentPath ? `${currentPath}/${part}` : part
            const nodeKey = `node-${currentPath}`

            let node = currentNode.children.find(c => c.path === currentPath)
            if (!node) {
                node = {
                    key: nodeKey,
                    label: part,
                    path: currentPath,
                    isLeaf: false,
                    children: [],
                    isFolder: true
                }
                currentNode.children.push(node)
            }
            currentNode = node
        }

        return currentNode
    }

    // 将已添加的文件添加到对应的目标文件夹下
    props.addedFiles.forEach(file => {
        const targetPath = file.target
        let targetNode = null
        let basePath = ''

        // 找到对应的基础目标节点
        if (targetPath.startsWith('CLEO/')) {
            targetNode = children.find(c => c.key === 'cleo')
            basePath = 'CLEO'
        } else if (targetPath.startsWith('plugins/CLEO/')) {
            targetNode = children.find(c => c.key === 'cleoredux')
            basePath = 'plugins/CLEO'
        } else if (targetPath.startsWith('plugins/') && !targetPath.startsWith('plugins/CLEO')) {
            targetNode = children.find(c => c.key === 'plugins')
            basePath = 'plugins'
        } else if (targetPath.startsWith('scripts/')) {
            targetNode = children.find(c => c.key === 'scripts')
            basePath = 'scripts'
        } else if (targetPath.startsWith('modloader/')) {
            targetNode = children.find(c => c.key === 'modloader')
            basePath = props.modName ? `modloader/${props.modName}` : 'modloader'
        } else if (targetPath === 'CLEO') {
            targetNode = children.find(c => c.key === 'cleo')
            basePath = 'CLEO'
        } else if (targetPath === 'plugins/CLEO') {
            targetNode = children.find(c => c.key === 'cleoredux')
            basePath = 'plugins/CLEO'
        } else if (targetPath === 'plugins') {
            targetNode = children.find(c => c.key === 'plugins')
            basePath = 'plugins'
        } else if (targetPath === 'scripts') {
            targetNode = children.find(c => c.key === 'scripts')
            basePath = 'scripts'
        } else {
            // 根目录文件
            targetNode = { children: rootFiles, key: 'root', path: '' }
            basePath = ''
        }

        if (!targetNode) {
            targetNode = { children: rootFiles, key: 'root', path: '' }
            basePath = ''
        }

        // 计算相对路径
        let relativePath = targetPath
        if (basePath && targetPath.startsWith(basePath)) {
            relativePath = targetPath.substring(basePath.length)
            if (relativePath.startsWith('/')) {
                relativePath = relativePath.substring(1)
            }
        }

        // 添加文件节点
        const fileName = file.source.split('/').pop() || file.source
        const fileNode = {
            key: `file-${file.source}`,
            label: fileName,
            path: file.target,
            isLeaf: !file.isDirectory,
            fileData: file
        }

        // 如果是文件夹，查找子文件并设置可展开
        if (file.isDirectory) {
            fileNode.isLeaf = false
            fileNode.children = []
            fileNode.isFolder = true

            // 查找该文件夹下的所有直接子文件
            const folderTargetPrefix = file.target.endsWith('/') ? file.target : `${file.target}/`
            props.addedFiles.forEach(childFile => {
                if (childFile.target.startsWith(folderTargetPrefix) && childFile.target !== file.target) {
                    const relativePath = childFile.target.substring(folderTargetPrefix.length)
                    const childPathParts = relativePath.split('/').filter(p => p)

                    // 只添加直接子文件
                    if (childPathParts.length === 1) {
                        const childFileName = childPathParts[0]
                        fileNode.children.push({
                            key: `file-${childFile.source}`,
                            label: childFileName,
                            path: childFile.target,
                            isLeaf: !childFile.isDirectory,
                            fileData: childFile
                        })
                    }
                }
            })

            if (fileNode.children.length === 0) {
                const originalNode = findNodeInModTree(props.modTree, file.source)
                if (originalNode && originalNode.children) {
                    fileNode.children = convertModChildrenToPreview(originalNode.children, fileNode)
                    fileNode.hasPreviewChildren = true
                }
            }
        }

        // 找到或创建目标节点
        let finalNode
        if (file.isDirectory) {
            // 文件夹找到它的父节点
            const pathParts = relativePath.split('/').filter(p => p)
            if (pathParts.length > 1) {
                // 有父路径，找到父节点
                const parentPath = pathParts.slice(0, -1).join('/')
                finalNode = findOrCreateNode(parentPath, targetNode, basePath)
            } else {
                // 直接添加到基础目标节点
                finalNode = targetNode
            }
        } else {
            // 文件：直接添加到目标节点
            finalNode = targetNode
            // 如果 relativePath 包含路径，更新文件名以包含路径信息
            if (relativePath && relativePath.includes('/')) {
                fileNode.label = relativePath.split('/').pop() || fileName
            }
        }

        // 检查是否已存在
        const exists = finalNode.children.some(c => c.key === fileNode.key)
        if (!exists) {
            finalNode.children.push(fileNode)
        }
    })

    // 仅对根目录文件排序，保留系统文件夹的固定顺序
    sortTreeNodes(rootFiles)
    children.forEach(child => {
        if (child.children && child.children.length > 0) {
            sortTreeNodes(child.children)
        }
    })

    return [
        {
            key: 'root',
            label: '根目录',
            path: '',
            isLeaf: false,
            children: rootFiles.length > 0 ? [...children, ...rootFiles] : children
        }
    ]
}

// 使用 computed 确保响应式更新
const targetTreeData = computed(() => {
    props.addedFiles
    props.modName
    return buildTargetTree()
})

// 添加一个 key 用于强制刷新树组件
const treeKey = computed(() => {
    const filesKey = props.addedFiles.length > 0
        ? JSON.stringify(props.addedFiles.map(f => `${f.source}-${f.target}`))
        : 'empty'
    return `${props.modName || ''}-${filesKey}`
})

// 默认展开根目录及其所有子节点
const expandedKeys = ref(['root', 'cleo', 'cleoredux', 'plugins', 'scripts', 'modloader'])

// 监听 modName 变化
watch(() => props.modName, () => {
    if (!expandedKeys.value.includes('modloader')) {
        expandedKeys.value.push('modloader')
    }
}, { immediate: true })

// 监听已添加文件变化，只展开系统文件夹和根目录
watch(() => props.addedFiles, () => {
    if (props.addedFiles.length > 0 && !expandedKeys.value.includes('root')) {
        expandedKeys.value.push('root')
    }

    // 只展开指定文件夹
    // 不自动展开用户添加的文件夹节点
    const systemKeys = ['root', 'cleo', 'cleoredux', 'plugins', 'scripts', 'modloader']
    systemKeys.forEach(key => {
        if (!expandedKeys.value.includes(key)) {
            expandedKeys.value.push(key)
        }
    })
}, { deep: true })

const dragOverKey = ref(null)

// 处理拖拽悬停
const handleDragOver = (e, node) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    dragOverKey.value = node.key
}

// 处理拖拽离开
const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dragOverKey.value = null
}

// 处理放置
const handleDrop = (e, node) => {
    e.preventDefault()
    e.stopPropagation()
    dragOverKey.value = null

    let dragData = null

    // 优先从 window 获取数据
    if (typeof window !== 'undefined') {
        if (window.__dragRemoveData) {
            dragData = {
                type: 'remove',
                fileData: window.__dragRemoveData
            }
        } else if (window.__dragNodeData) {
            dragData = window.__dragNodeData
        }
    }

    // 如果 window 中没有，尝试从 dataTransfer 获取
    if (!dragData) {
        try {
            const data = e.dataTransfer.getData('application/json')
            if (data) {
                dragData = JSON.parse(data)
            }
        } catch (err) {
            // 忽略错误
        }
    }

    if (dragData) {
        // 检查是否是移除操作
        if (dragData.type === 'remove' || dragData.fileData) {
            const fileData = dragData.fileData || dragData
            // 判断是否是文件夹节点
            const isFolderNode = !node.fileData && !node.preview && (
                node.key === 'root' ||
                node.isLeaf === false ||
                (node.children !== undefined)
            )

            if (isFolderNode) {
                // 拖拽到文件夹节点，更新目标路径
                emit('update-target', fileData, node)
            }
        } else {
            // 从左侧拖拽新文件
            emit('drop', dragData, node)
        }

        // 清理 window 数据
        if (typeof window !== 'undefined') {
            if (window.__dragNodeData) {
                delete window.__dragNodeData
            }
            if (window.__dragRemoveData) {
                delete window.__dragRemoveData
            }
        }
    }
}

// 处理文件拖拽开始
const handleFileDragStart = (e, fileData) => {
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'move'
    // fileData 是从 addedFiles 来的，结构是 { source, target, isDirectory }
    const dragData = {
        type: 'remove',
        fileData: {
            source: fileData.source,
            path: fileData.source,
            name: fileData.source.split('/').pop() || fileData.source,
            isDirectory: fileData.isDirectory,
            is_directory: fileData.isDirectory,
            target: fileData.target
        }
    }
    e.dataTransfer.setData('application/json', JSON.stringify(dragData))
    if (typeof window !== 'undefined') {
        window.__dragRemoveData = dragData.fileData
    }
}

// 处理文件拖拽结束
const handleFileDragEnd = (e) => {
    e.stopPropagation()
}

// 渲染树节点标签
const renderLabel = ({ option }) => {
    const isDragOver = dragOverKey.value === option.key
    const hasFileData = !!option.fileData
    const isSystemFolder = !hasFileData && !option.preview && (option.key === 'root' || ['cleo', 'cleoredux', 'plugins', 'scripts', 'modloader'].includes(option.key))

    return h('div', {
        class: [
            'inline-flex items-center gap-2 px-2 py-1.5 rounded transition-all',
            hasFileData ? 'cursor-move select-none hover:bg-blue-50 dark:hover:bg-blue-900/20' : 'cursor-default',
            isDragOver ? 'bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-500' : 'border-2 border-transparent',
            isSystemFolder ? 'font-semibold text-gray-700 dark:text-gray-200' : ''
        ],
        draggable: hasFileData,
        onDragstart: hasFileData ? (e) => handleFileDragStart(e, option.fileData) : undefined,
        onDragend: handleFileDragEnd,
        onDragover: (e) => handleDragOver(e, option),
        onDragleave: handleDragLeave,
        onDrop: (e) => handleDrop(e, option)
    }, [
        h('div', { class: 'flex items-center gap-1.5 flex-1 min-w-0' }, [
            hasFileData
                ? h(option.fileData.isDirectory ? Folder : File, {
                    class: 'flex-shrink-0 text-blue-600 dark:text-blue-400',
                    size: 16
                })
                : isSystemFolder
                    ? h(FolderOpen, {
                        class: 'flex-shrink-0 text-gray-500 dark:text-gray-400',
                        size: 16
                    })
                    : null,
            h('span', {
                class: [
                    'text-sm flex-1 truncate',
                    hasFileData
                        ? 'text-gray-700 dark:text-gray-300'
                        : 'text-gray-600 dark:text-gray-400'
                ]
            }, option.label)
        ])
    ])
}
</script>

<template>
    <div data-tauri-drag-region="false" class="h-full w-full">
        <NTree :key="treeKey" :data="targetTreeData" v-model:expanded-keys="expandedKeys" block-line
            :render-label="renderLabel" class="w-full" />
    </div>
</template>