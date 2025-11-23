import { ref, watch } from 'vue'
import { tauriInvoke } from '@/utils/tauri'
import { useMessage } from '@/composables/ui/useMessage'
import { notification } from 'ant-design-vue'
import { NOTIFICATION_STYLE } from '@/constants/ui'

export function useBuildModConfig() {
    const { showSuccess, showError } = useMessage()

    // 表单数据
    const formData = ref<{
        modDir: string
        name: string
        author: string
        modfiles: Array<{
            source: string
            target: string
            isDirectory: boolean
        }>
    }>({
        modDir: '',           // MOD 根目录
        name: '',             // MOD 名称
        author: '',           // 作者（可选）
        modfiles: []          // 文件/文件夹列表，每个项包含: { source, target, isDirectory }
    })

    // 表单引用
    const formRef = ref()

    // 表单验证规则
    const rules = {
        name: [
            { required: true, message: '请输入 MOD 名称', trigger: 'blur' }
        ],
        modDir: [
            { required: true, message: '请选择 MOD 根目录', trigger: 'change' }
        ]
    }

    // 加载状态
    const saving = ref(false)
    const selectingModDir = ref(false)
    const loadingFileTree = ref(false)

    // 文件树数据
    const fileTree = ref<any[]>([])

    // Transfer 组件需要的数据
    const transferDataSource = ref<any[]>([])
    const targetKeys = ref<string[]>([])

    // 目标文件夹树数据
    const targetTreeData = ref<any[]>([])

    // 选择 MOD 根目录
    const selectModDirectory = async () => {
        try {
            selectingModDir.value = true
            const response: any = await tauriInvoke('select_mod_directory')

            if (response?.success && response?.data) {
                formData.value.modDir = response.data

                // 加载文件树
                await loadFileTree(response.data)

                // 检查目录内是否有 g2m_mod.json 文件，如果有则自动读取配置
                try {
                    const configResponse: any = await tauriInvoke('read_g2m_mod_config', {
                        modDir: response.data
                    })

                    if (configResponse?.success && configResponse?.data) {
                        const config = configResponse.data
                        // 填充表单数据
                        formData.value.name = config.name || ''
                        formData.value.author = config.author || ''
                        formData.value.modfiles = (config.modfile || []).map((file: any) => ({
                            source: file.source,
                            target: file.target,
                            isDirectory: file.is_directory || false
                        }))
                        // 同步 targetKeys
                        targetKeys.value = formData.value.modfiles.map(f => f.source)
                        showSuccess('已自动加载 g2m_mod.json 配置')
                    } else {
                        // 如果没有找到配置文件，清空已添加的文件和名称
                        formData.value.name = ''
                        formData.value.author = ''
                        formData.value.modfiles = []
                        targetKeys.value = []
                    }
                } catch (error) {
                    // 读取配置失败不影响目录选择，清空已添加的文件和名称
                    formData.value.name = ''
                    formData.value.author = ''
                    formData.value.modfiles = []
                    targetKeys.value = []
                    // 显示信息通知
                    notification.info({
                        message: '提示',
                        description: '未找到 g2m_mod.json 配置文件或读取失败',
                        placement: 'topRight',
                        style: NOTIFICATION_STYLE,
                        duration: 3
                    })
                }
            } else if (response?.error) {
                // 用户取消不显示错误
                if (response.error) {
                    showError(response.error)
                }
            }
        } catch (error) {
            showError('选择目录失败', { detail: error })
        } finally {
            selectingModDir.value = false
        }
    }

    // 添加文件/文件夹
    const addModFile = async (isDirectory = false) => {
        try {
            if (!formData.value.modDir) {
                showError('请先选择 MOD 根目录')
                return
            }

            const response: any = await tauriInvoke('select_mod_files', {
                defaultDir: formData.value.modDir,
                isDirectory: isDirectory
            })

            if (!response?.success || !response?.data) {
                if (response?.error) {
                    // 用户取消不显示错误
                }
                return
            }

            const selectedPaths = response.data

            selectedPaths.forEach((path: string) => {
                // 计算相对于 MOD 根目录的路径
                // 统一路径分隔符为 /
                const modDirNormalized = formData.value.modDir.replace(/\\/g, '/')
                const pathNormalized = path.replace(/\\/g, '/')

                let relativePath = pathNormalized
                if (pathNormalized.startsWith(modDirNormalized)) {
                    relativePath = pathNormalized.substring(modDirNormalized.length)
                    if (relativePath.startsWith('/')) {
                        relativePath = relativePath.substring(1)
                    }
                } else {
                    // 如果路径不在 MOD 目录下，使用文件名
                    relativePath = pathNormalized.split(/[/\\]/).pop() || relativePath
                }

                // 检查是否已存在
                if (!formData.value.modfiles.some((f: any) => f.source === relativePath)) {
                    // 默认目标路径（可以根据需要调整）
                    let defaultTarget = relativePath

                    // 根据文件类型设置默认目标路径
                    if (relativePath.endsWith('.cs')) {
                        defaultTarget = `CLEO/${relativePath.split(/[/\\]/).pop()}`
                    } else if (relativePath.includes('models') || relativePath.includes('textures')) {
                        defaultTarget = `modloader/${relativePath}`
                    }

                    formData.value.modfiles.push({
                        source: relativePath,
                        target: defaultTarget,
                        isDirectory: isDirectory
                    })
                }
            })
        } catch (error) {
            showError('选择文件失败', { detail: error })
        }
    }

    // 转换文件树为 Transfer 数据源
    const convertTreeToTransferData = (nodes: any[], parentPath = ''): any[] => {
        const result: any[] = []
        nodes.forEach(node => {
            const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name
            result.push({
                key: node.path || currentPath,
                title: node.name,
                isDirectory: node.is_directory,
                path: node.path || currentPath,
                data: node
            })
            if (node.children && node.children.length > 0) {
                result.push(...convertTreeToTransferData(node.children, currentPath))
            }
        })
        return result
    }

    // 构建目标文件夹树
    const buildTargetTree = () => {
        const children = [
            {
                key: 'cleo',
                title: 'CLEO',
                path: 'CLEO',
                isLeaf: false
            },
            {
                key: 'cleoredux',
                title: 'CLEOREDUX',
                path: 'plugins/CLEO',
                isLeaf: false
            }
        ]

        if (formData.value.name) {
            children.push({
                key: 'modloader',
                title: 'modloader',
                path: `modloader/${formData.value.name}`,
                isLeaf: false
            })
        }

        return [
            {
                key: 'root',
                title: '根目录',
                path: '',
                isLeaf: false,
                children: children
            }
        ]
    }

    // 加载文件树
    const loadFileTree = async (modDir: string) => {
        try {
            loadingFileTree.value = true
            const response: any = await tauriInvoke('get_mod_file_tree', {
                modDir: modDir
            })

            if (response?.success && response?.data) {
                fileTree.value = response.data
                transferDataSource.value = convertTreeToTransferData(response.data)
            } else {
                fileTree.value = []
                transferDataSource.value = []
                if (response?.error) {
                    showError('加载文件树失败', { detail: response.error })
                }
            }
        } catch (error) {
            fileTree.value = []
            transferDataSource.value = []
            showError('加载文件树失败', { detail: error })
        } finally {
            loadingFileTree.value = false
        }
    }

    // 初始化目标文件夹树
    const initTargetTree = () => {
        targetTreeData.value = buildTargetTree()
    }

    // 监听 modName 变化，更新目标树
    watch(() => formData.value.name, () => {
        initTargetTree()
    }, { immediate: true })

    // 处理 Transfer 变化
    const handleTransferChange = (nextTargetKeys: string[], direction: string, moveKeys: string[]) => {
        targetKeys.value = nextTargetKeys

        // 更新 formData.modfiles
        const selectedItems = transferDataSource.value.filter(item => nextTargetKeys.includes(item.key))
        formData.value.modfiles = selectedItems.map(item => {
            // 检查是否已存在，如果存在则保留原有的 target
            const existing = formData.value.modfiles.find(f => f.source === item.path)
            let defaultTarget = existing?.target || ''

            if (!defaultTarget) {
                // 根据文件类型设置默认路径
                if (item.isDirectory) {
                    defaultTarget = item.path
                } else {
                    const fileName = item.title
                    if (fileName.endsWith('.cs')) {
                        defaultTarget = `CLEO/${fileName}`
                    } else if (fileName.endsWith('.js') || fileName.endsWith('.ts')) {
                        defaultTarget = `plugins/CLEO/${fileName}`
                    } else {
                        defaultTarget = fileName
                    }
                }
            }

            return {
                source: item.path,
                target: defaultTarget,
                isDirectory: item.isDirectory
            }
        })
    }

    // 处理拖拽放置
    const handleFileDrop = (node: any, targetFolder: any) => {
        // 检查是否已存在
        if (formData.value.modfiles.some((f: any) => f.source === node.path)) {
            notification.info({
                message: '提示',
                description: '该文件/文件夹已添加',
                placement: 'topRight',
                style: NOTIFICATION_STYLE,
                duration: 2
            })
            return
        }

        // 根据文件类型和拖拽目标设置默认路径
        let defaultTarget = targetFolder.path

        if (node.is_directory) {
            // 目录：追加到目标路径
            if (defaultTarget) {
                defaultTarget = `${defaultTarget}/${node.name}`
            } else {
                defaultTarget = node.name
            }
        } else {
            // 文件：根据扩展名决定
            const fileName = node.name
            if (fileName.endsWith('.cs')) {
                // CLEO 脚本
                defaultTarget = `CLEO/${fileName}`
            } else if (fileName.endsWith('.js') || fileName.endsWith('.ts')) {
                // CLEO Redux 脚本
                defaultTarget = `plugins/CLEO/${fileName}`
            } else {
                // 其他文件：追加到目标路径
                if (defaultTarget) {
                    defaultTarget = `${defaultTarget}/${fileName}`
                } else {
                    defaultTarget = fileName
                }
            }
        }

        const newItem = {
            source: node.path,
            target: defaultTarget,
            isDirectory: node.is_directory
        }

        formData.value.modfiles.push(newItem)

        // 根据目录层级排序：先按目标路径的层级深度，再按路径字母顺序
        formData.value.modfiles.sort((a, b) => {
            const depthA = a.target.split('/').length
            const depthB = b.target.split('/').length
            if (depthA !== depthB) {
                return depthA - depthB
            }
            return a.target.localeCompare(b.target)
        })
    }

    // 处理目标路径变化
    const handleTargetChange = (key: string, newTarget: string) => {
        const index = formData.value.modfiles.findIndex(f => f.source === key)
        if (index > -1) {
            formData.value.modfiles[index].target = newTarget
        }
    }


    // 删除文件/文件夹
    const removeModFile = (index: number) => {
        const removed = formData.value.modfiles[index]
        formData.value.modfiles.splice(index, 1)
        // 同步更新 targetKeys
        targetKeys.value = targetKeys.value.filter(key => key !== removed.source)
    }

    // 保存配置
    const saveConfig = async () => {
        try {
            // 验证表单
            await formRef.value?.validate()

            if (formData.value.modfiles.length === 0) {
                showError('请至少添加一个文件或文件夹')
                return
            }

            saving.value = true

            // 构建配置对象
            const authorValue = formData.value.author.trim()
            const config = {
                name: formData.value.name.trim(),
                author: authorValue === '' ? null : authorValue,
                modfile: formData.value.modfiles.map((f: any) => ({
                    source: f.source,
                    target: f.target,
                    is_directory: f.isDirectory
                }))
            }

            // 调用后端保存
            const response: any = await tauriInvoke('save_g2m_mod_config', {
                modDir: formData.value.modDir,
                config: config
            })

            if (response?.success) {
                showSuccess('保存成功！g2m_mod.json 已创建')
                // 可以重置表单或保持当前状态
            } else {
                showError(response?.error || '保存失败')
            }
        } catch (error) {
            showError('保存配置失败', { detail: error })
        } finally {
            saving.value = false
        }
    }

    // 重置表单
    const resetForm = () => {
        formData.value = {
            modDir: '',
            name: '',
            author: '',
            modfiles: []
        }
        targetKeys.value = []
        transferDataSource.value = []
        fileTree.value = []
        formRef.value?.resetFields()
    }

    return {
        formData,
        formRef,
        rules,
        saving,
        selectingModDir,
        loadingFileTree,
        fileTree,
        transferDataSource,
        targetKeys,
        targetTreeData,
        selectModDirectory,
        addModFile,
        removeModFile,
        saveConfig,
        resetForm,
        loadFileTree,
        handleFileDrop,
        handleTargetChange,
        initTargetTree
    }
}

