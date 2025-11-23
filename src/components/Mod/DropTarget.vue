<script setup>
import { computed, ref, watch } from 'vue'

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
    }
})

const emit = defineEmits(['drop', 'remove', 'update-target'])

// 构建目标文件夹树结构：根目录下包含 CLEO、CLEO Redux、plugins、scripts、modloader
const buildTargetTree = () => {
    const children = [
        {
            key: 'cleo',
            title: 'CLEO',
            path: 'CLEO',
            isLeaf: false,
            children: []
        },
        {
            key: 'cleoredux',
            title: 'CLEO Redux',
            path: 'plugins/CLEO',
            isLeaf: false,
            children: []
        },
        {
            key: 'plugins',
            title: 'Plugins',
            path: 'plugins',
            isLeaf: false,
            children: []
        },
        {
            key: 'scripts',
            title: 'Scripts',
            path: 'scripts',
            isLeaf: false,
            children: []
        }
    ]

    // ModLoader 文件夹，默认显示，不显示 mod 名字的子文件夹（由后端处理）
    children.push({
        key: 'modloader',
        title: 'ModLoader',
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
                    title: part,
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
            // 如果提供了 modName，使用 modloader/${modName} 作为基础路径
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
            title: fileName,
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

                    // 只添加直接子文件（第一级）
                    if (childPathParts.length === 1) {
                        const childFileName = childPathParts[0]
                        fileNode.children.push({
                            key: `file-${childFile.source}`,
                            title: childFileName,
                            path: childFile.target,
                            isLeaf: !childFile.isDirectory,
                            fileData: childFile
                        })
                    }
                }
            })

            // 即使没有子文件，文件夹也应该可以展开（isLeaf: false）
            // 这样用户可以看到文件夹结构
        }

        // 找到或创建目标节点
        // 对于文件夹，需要找到它的父节点；对于文件，直接添加到目标节点，不创建中间文件夹
        let finalNode
        if (file.isDirectory) {
            // 文件夹：找到它的父节点（去掉最后一层路径）
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
            // 文件：直接添加到目标节点，不创建中间文件夹节点
            // 文件名应该包含完整路径（相对于 basePath）
            finalNode = targetNode
            // 如果 relativePath 包含路径，更新文件名以包含路径信息
            if (relativePath && relativePath.includes('/')) {
                fileNode.title = relativePath.split('/').pop() || fileName
            }
        }

        // 检查是否已存在（避免重复）
        const exists = finalNode.children.some(c => c.key === fileNode.key)
        if (!exists) {
            finalNode.children.push(fileNode)
        }
    })

    return [
        {
            key: 'root',
            title: '根目录',
            path: '',
            isLeaf: false,
            children: rootFiles.length > 0 ? [...rootFiles, ...children] : children
        }
    ]
}

// 使用 computed 确保响应式更新，并添加 key 用于强制刷新
const targetTreeData = computed(() => {
    // 触发响应式更新：访问 props 确保依赖追踪
    props.addedFiles
    props.modName
    return buildTargetTree()
})

// 添加一个 key 用于强制刷新树组件
// 使用 JSON.stringify 确保当 addedFiles 内容变化时也能触发刷新
const treeKey = computed(() => {
    // 当 modName 或 addedFiles 变化时，更新 key 以强制刷新树
    // 使用 JSON.stringify 来检测数组内容的变化，而不仅仅是长度
    const filesKey = props.addedFiles.length > 0
        ? JSON.stringify(props.addedFiles.map(f => `${f.source}-${f.target}`))
        : 'empty'
    return `${props.modName || ''}-${filesKey}`
})

// 默认展开根目录及其所有子节点
const expandedKeys = ref(['root', 'cleo', 'cleoredux', 'plugins', 'scripts', 'modloader'])

// 监听 modName 变化
// 监听 modName 变化，确保 modloader 始终展开
watch(() => props.modName, () => {
    if (!expandedKeys.value.includes('modloader')) {
        expandedKeys.value.push('modloader')
    }
}, { immediate: true })

// 监听已添加文件变化，自动展开包含文件的文件夹
watch(() => props.addedFiles, () => {
    if (props.addedFiles.length > 0 && !expandedKeys.value.includes('root')) {
        expandedKeys.value.push('root')
    }

    // 自动展开所有包含文件的文件夹
    const tree = targetTreeData.value
    const expandFolders = (nodes) => {
        nodes.forEach(node => {
            if (node.children && node.children.length > 0) {
                if (!expandedKeys.value.includes(node.key)) {
                    expandedKeys.value.push(node.key)
                }
                expandFolders(node.children)
            }
        })
    }
    expandFolders(tree)
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

    // 优先从 window 获取数据（Tauri 环境中更可靠）
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
        // 检查是否是移除操作（从右侧拖拽已添加的文件）
        if (dragData.type === 'remove' || dragData.fileData) {
            const fileData = dragData.fileData || dragData
            // 判断是否是文件夹节点
            // 1没有 fileData 属性（不是文件节点）
            // 是根目录（key === 'root'）或者是文件夹节点（isLeaf === false 或有 children）
            const isFolderNode = !node.fileData && (
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
    // 需要转换为 { path, name, is_directory } 格式以便后续处理
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
    if (typeof window !== 'undefined' && window.__dragRemoveData) {
        delete window.__dragRemoveData
    }
}
</script>

<template>
    <div data-tauri-drag-region="false" style="height: 100%;">
        <a-tree :key="treeKey" :tree-data="targetTreeData" v-model:expandedKeys="expandedKeys" block-node>
            <template #title="{ dataRef }">
                <div :draggable="dataRef.fileData ? true : false" @dragstart="(e) => {
                    if (dataRef.fileData) {
                        handleFileDragStart(e, dataRef.fileData)
                    }
                }" @dragend="handleFileDragEnd" @dragover="(e) => handleDragOver(e, dataRef)"
                    @dragleave="handleDragLeave" @drop="(e) => handleDrop(e, dataRef)" :style="{
                        padding: '4px 8px',
                        margin: '0 -8px',
                        borderRadius: '4px',
                        backgroundColor: dragOverKey === dataRef.key ? '#e6f7ff' : 'transparent',
                        border: dragOverKey === dataRef.key ? '2px solid #1890ff' : '2px dashed transparent',
                        cursor: dataRef.fileData ? 'move' : 'default',
                        userSelect: 'none'
                    }">
                    {{ dataRef.title }}
                </div>
            </template>
        </a-tree>
    </div>
</template>
