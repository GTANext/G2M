import { ref } from 'vue'
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

    // 选择 MOD 根目录
    const selectModDirectory = async () => {
        try {
            selectingModDir.value = true
            const response: any = await tauriInvoke('select_mod_directory')

            if (response?.success && response?.data) {
                formData.value.modDir = response.data

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
                        showSuccess('已自动加载 g2m_mod.json 配置')
                    }
                } catch (error) {
                    // 读取配置失败不影响目录选择，显示信息通知
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

    // 删除文件/文件夹
    const removeModFile = (index: number) => {
        formData.value.modfiles.splice(index, 1)
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
        formRef.value?.resetFields()
    }

    return {
        formData,
        formRef,
        rules,
        saving,
        selectingModDir,
        selectModDirectory,
        addModFile,
        removeModFile,
        saveConfig,
        resetForm
    }
}

