import { ref, computed, watch } from 'vue';
import { tauriInvoke, installModPrerequisites } from '@/utils/tauri';
import { useMessage } from '@/composables/ui/useMessage';
import type { CustomPrerequisiteInfo, ApiResponse, ModLoaderStatus, ModInstallRequest } from '@/types';

export function useModPrerequisites(gameInfo: any) {
  const { showError, showSuccess } = useMessage();

  // MOD 加载器状态
  const modStatus = ref({
    dinput8: false,
    cleo: false,
    cleo_redux: false,
    modloader: false
  });

  const modLoaderDetails = ref({
    found_loaders: []
  });

  const isLoading = ref(false);
  const selectedComponents = ref<string[]>([]);
  const isInstalling = ref(false);
  const installResult = ref<any>(null);
  const showResult = ref(false);

  // 自定义前置相关状态
  const customPrerequisites = ref<CustomPrerequisiteInfo[]>([]);
  const showCustomPrerequisiteDialog = ref(false);
  const customPrerequisiteForm = ref({
    name: '',
    sourcePaths: [] as string[],
    targetDir: 'plugins'
  });
  const selectingCustomPrerequisiteFiles = ref(false);
  const availableTargetDirs = ref([
    { label: '游戏根目录', value: 'root', disabled: false }
  ]);

  // 根据游戏类型定义可用组件
  const availableComponents = computed(() => {
    if (!gameInfo?.value) return [];

    const gameType = gameInfo.value.type;
    const components = [
      {
        key: 'dinput8',
        name: 'dinput8.dll',
        description: 'plugins scripts 加载器',
        installed: modStatus.value.dinput8
      }
    ];

    // 根据游戏类型添加 CLEO 相关组件
    if (['gta3', 'gtavc', 'gtasa'].includes(gameType)) {
      components.push({
        key: 'cleo',
        name: 'CLEO',
        description: '经典脚本执行引擎，支持 .cs 脚本文件',
        installed: modStatus.value.cleo
      });
    }

    // CLEO Redux
    components.push({
      key: 'cleo_redux',
      name: 'CLEO Redux',
      description: '现代脚本引擎，支持 JavaScript 和其他现代脚本语言',
      installed: modStatus.value.cleo_redux
    });

    // ModLoader
    components.push({
      key: 'modloader',
      name: 'ModLoader',
      description: 'MOD 加载器，用于加载 .dff、.txd 等资源文件',
      installed: modStatus.value.modloader
    });

    return components;
  });

  // 计算选中组件数量
  const selectedCount = computed(() => selectedComponents.value.length);

  // 计算是否所有组件都已安装
  const allComponentsInstalled = computed(() => {
    return availableComponents.value.length > 0 &&
      availableComponents.value.every(component => component.installed);
  });

  // 方法
  const toggleComponent = (key: string) => {
    // dinput8 不能取消选择
    if (key === 'dinput8') {
      return;
    }

    const index = selectedComponents.value.indexOf(key);
    if (index > -1) {
      selectedComponents.value.splice(index, 1);
    } else {
      selectedComponents.value.push(key);
    }
  };

  const getComponentName = (key: string) => {
    const component = availableComponents.value.find(c => c.key === key);
    return component ? component.name : key;
  };

  // 获取组件的安装位置信息
  const getComponentLocation = (key: string) => {
    if (!modLoaderDetails.value.found_loaders || modLoaderDetails.value.found_loaders.length === 0) {
      return null;
    }

    const componentMap: Record<string, string> = {
      'dinput8': 'dinput8.dll',
      'cleo': 'CLEO',
      'cleo_redux': 'CLEO Redux',
      'modloader': 'ModLoader'
    };

    const searchKey = componentMap[key];
    if (!searchKey) return null;

    // 对于 ModLoader，返回所有匹配的项（文件夹和 .asi 文件）
    if (key === 'modloader') {
      const found = modLoaderDetails.value.found_loaders.filter((loader: string) => {
        return loader.includes(searchKey);
      });
      return found.length > 0 ? found : null;
    }

    // 对于其他组件，只返回第一个匹配的项
    const found = modLoaderDetails.value.found_loaders.find((loader: string) => {
      return loader.includes(searchKey);
    });

    return found || null;
  };

  // 加载 MOD 状态
  const loadModStatus = async () => {
    if (!gameInfo?.value || !gameInfo.value.dir) {
      console.warn('游戏信息或目录为空，无法检查 MOD 状态');
      return;
    }

    isLoading.value = true;
    try {
      const response = await tauriInvoke<ApiResponse<ModLoaderStatus>>('check_mod_loaders', {
        gameDir: gameInfo.value.dir,
        gameType: gameInfo.value.type || null
      });

      if (response?.success && response?.data) {
        // 保存完整的详细信息
        modLoaderDetails.value = {
          found_loaders: response.data.found_loaders || [],
          manual_bindings: response.data.manual_bindings || []
        };

        // 保存状态
        modStatus.value = {
          dinput8: response.data.has_dinput8 || false,
          cleo: response.data.has_cleo || false,
          cleo_redux: response.data.has_cleo_redux || false,
          modloader: response.data.has_modloader || false
        };

        // 根据安装状态更新 selectedComponents，移除已安装的组件
        selectedComponents.value = selectedComponents.value.filter(key => {
          const isInstalled = modStatus.value[key as keyof typeof modStatus] === true;
          return !isInstalled;
        });

        // 如果 dinput8 未安装，确保它在选中列表中（且不能取消）
        if (!modStatus.value.dinput8) {
          if (!selectedComponents.value.includes('dinput8')) {
            selectedComponents.value.unshift('dinput8');
          }
        } else {
          // 如果 dinput8 已安装，从选中列表中移除
          const dinput8Index = selectedComponents.value.indexOf('dinput8');
          if (dinput8Index > -1) {
            selectedComponents.value.splice(dinput8Index, 1);
          }
        }
      } else {
        // 如果返回的状态无效，使用默认状态
        modStatus.value = {
          dinput8: false,
          cleo: false,
          cleo_redux: false,
          modloader: false
        };
        // 确保 dinput8 默认选中
        if (!selectedComponents.value.includes('dinput8')) {
          selectedComponents.value.unshift('dinput8');
        }
      }
    } catch (error) {
      console.error('检查 MOD 状态失败:', error);
      // 出错时设置默认状态
      modStatus.value = {
        dinput8: false,
        cleo: false,
        cleo_redux: false,
        modloader: false
      };
      // 确保 dinput8 默认选中
      if (!selectedComponents.value.includes('dinput8')) {
        selectedComponents.value.unshift('dinput8');
      }
    } finally {
      isLoading.value = false;
    }
  };

  // 安装 MOD 前置
  const handleInstall = async () => {
    if (!gameInfo?.value || selectedComponents.value.length === 0) return;

    isInstalling.value = true;
    try {
      const request: ModInstallRequest = {
        game_dir: gameInfo.value.dir,
        game_type: gameInfo.value.type,
        components: selectedComponents.value
      };

      const response = await installModPrerequisites(request);

      if (response?.success && response?.data) {
        installResult.value = {
          success: true,
          message: '安装成功',
          data: response.data
        };
        showResult.value = true;
        // 安装完成后重新检查状态
        await loadModStatus();
      } else {
        const errorMsg = response?.error || '安装 MOD 前置失败';
        installResult.value = {
          success: false,
          message: errorMsg,
          details: [response?.error || '未知错误']
        };
        showResult.value = true;
        showError(errorMsg);
      }
    } catch (error: any) {
      console.error('安装失败:', error);
      installResult.value = {
        success: false,
        message: '安装过程中发生错误',
        details: [error?.message || '未知错误']
      };
      showResult.value = true;
      showError('安装过程中发生错误');
    } finally {
      isInstalling.value = false;
    }
  };

  // 安装单个组件
  const handleInstallSingle = async (componentKey: string) => {
    if (!gameInfo?.value) return;

    isInstalling.value = true;
    try {
      const request: ModInstallRequest = {
        game_dir: gameInfo.value.dir,
        game_type: gameInfo.value.type,
        components: [componentKey]
      };

      const response = await installModPrerequisites(request);

      if (response?.success && response?.data) {
        showSuccess('安装成功');
        // 安装完成后重新检查状态
        await loadModStatus();
      } else {
        const errorMsg = response?.error || '安装失败';
        showError(errorMsg);
      }
    } catch (error: any) {
      console.error('安装失败:', error);
      showError('安装过程中发生错误');
    } finally {
      isInstalling.value = false;
    }
  };

  const closeResult = () => {
    showResult.value = false;
    installResult.value = null;
  };

  // 手动选择 MOD 加载器文件
  const handleManualSelect = async (loaderType: string) => {
    if (!gameInfo?.value || !gameInfo.value.dir) {
      showError('游戏信息不完整');
      return;
    }

    try {
      // 选择文件，默认指向游戏目录
      const selectResponse = await tauriInvoke<ApiResponse<string>>('select_mod_loader_file', {
        defaultDir: gameInfo.value.dir
      });

      if (!selectResponse?.success || !selectResponse?.data) {
        // 用户取消选择，不显示错误
        if (selectResponse?.error && selectResponse.error.trim() !== '') {
          showError('选择文件失败', { detail: selectResponse.error });
        }
        return;
      }

      const filePath = selectResponse.data;

      // 标记为已安装
      const markResponse = await tauriInvoke<ApiResponse<ModLoaderStatus>>('mark_mod_loader_manual', {
        gameDir: gameInfo.value.dir,
        loaderType: loaderType,
        filePath: filePath
      });

      if (markResponse?.success) {
        showSuccess('已手动标记为已安装');
        // 重新加载状态
        await loadModStatus();
      } else {
        showError('标记失败', { detail: markResponse?.error || '未知错误' });
      }
    } catch (error: any) {
      console.error('手动选择失败:', error);
      showError('手动选择失败', { detail: error?.message || '未知错误' });
    }
  };

  // 取消手动标记
  const handleUnmarkManual = async (loaderType: string) => {
    if (!gameInfo?.value || !gameInfo.value.dir) {
      showError('游戏信息不完整');
      return;
    }

    try {
      const response = await tauriInvoke<ApiResponse<ModLoaderStatus>>('unmark_mod_loader_manual', {
        gameDir: gameInfo.value.dir,
        loaderType: loaderType
      });

      if (response?.success) {
        showSuccess('已取消手动标记');
        // 重新加载状态
        await loadModStatus();
      } else {
        showError('取消标记失败', { detail: response?.error || '未知错误' });
      }
    } catch (error: any) {
      console.error('取消标记失败:', error);
      showError('取消标记失败', { detail: error?.message || '未知错误' });
    }
  };

  // 判断是否是手动绑定的
  const isManualBinding = (loaderType: string): boolean => {
    if (!modLoaderDetails.value) return false;
    const manualBindings = (modLoaderDetails.value as any).manual_bindings || [];
    return manualBindings.includes(loaderType);
  };

  // 检查游戏目录并设置默认安装位置
  const checkGameDirectories = async () => {
    if (!gameInfo?.value || !gameInfo.value.dir) return;

    try {
      const response = await tauriInvoke<ApiResponse<any>>('check_game_directories', {
        gameDir: gameInfo.value.dir
      });

      if (response?.success && response?.data) {
        const data = response.data;
        const options = [
          { label: '游戏根目录', value: 'root', disabled: false }
        ];

        if (data.has_plugins) {
          options.push({ label: 'plugins目录', value: 'plugins', disabled: false });
        }
        if (data.has_scripts) {
          options.push({ label: 'scripts目录', value: 'scripts', disabled: false });
        }

        availableTargetDirs.value = options;
        customPrerequisiteForm.value.targetDir = data.default_dir || 'root';
      }
    } catch (error) {
      console.error('检查游戏目录失败:', error);
    }
  };

  // 加载自定义前置列表
  const loadCustomPrerequisites = async () => {
    if (!gameInfo?.value || !gameInfo.value.dir) return;

    try {
      const response = await tauriInvoke<ApiResponse<CustomPrerequisiteInfo[]>>('get_custom_prerequisites', {
        gameDir: gameInfo.value.dir
      });

      if (response?.success && response?.data) {
        customPrerequisites.value = response.data;
      }
    } catch (error) {
      console.error('加载自定义前置列表失败:', error);
    }
  };

  // 选择自定义前置文件
  const selectCustomPrerequisiteFiles = async () => {
    try {
      selectingCustomPrerequisiteFiles.value = true;
      const response = await tauriInvoke<ApiResponse<string[]>>('select_custom_prerequisite_files');

      if (response?.success && response?.data) {
        customPrerequisiteForm.value.sourcePaths = response.data;
      } else if (response?.error && response.error.trim() !== '') {
        showError('选择文件失败', { detail: response.error });
      }
    } catch (error: any) {
      console.error('选择文件失败:', error);
      showError('选择文件失败', { detail: error?.message || '未知错误' });
    } finally {
      selectingCustomPrerequisiteFiles.value = false;
    }
  };

  // 安装自定义前置
  const handleInstallCustomPrerequisite = async () => {
    if (!gameInfo?.value || !gameInfo.value.dir) {
      showError('游戏信息不完整');
      return;
    }

    if (!customPrerequisiteForm.value.name.trim()) {
      showError('请输入自定义前置名称');
      return;
    }

    if (customPrerequisiteForm.value.sourcePaths.length === 0) {
      showError('请至少选择一个文件或文件夹');
      return;
    }

    try {
      const response = await tauriInvoke<ApiResponse<CustomPrerequisiteInfo>>('install_custom_prerequisite', {
        game_dir: gameInfo.value.dir,
        name: customPrerequisiteForm.value.name.trim(),
        source_paths: customPrerequisiteForm.value.sourcePaths,
        target_dir: customPrerequisiteForm.value.targetDir
      });

      if (response?.success) {
        showSuccess('自定义前置安装成功');
        showCustomPrerequisiteDialog.value = false;
        customPrerequisiteForm.value = {
          name: '',
          sourcePaths: [],
          targetDir: 'plugins'
        };
        await checkGameDirectories();
        await loadCustomPrerequisites();
        await loadModStatus();
      } else {
        showError('安装失败', { detail: response?.error || '未知错误' });
      }
    } catch (error: any) {
      console.error('安装自定义前置失败:', error);
      showError('安装失败', { detail: error?.message || '未知错误' });
    }
  };

  // 删除自定义前置
  const handleDeleteCustomPrerequisite = async (name: string) => {
    if (!gameInfo?.value || !gameInfo.value.dir) {
      showError('游戏信息不完整');
      return;
    }

    try {
      const response = await tauriInvoke<ApiResponse<void>>('delete_custom_prerequisite', {
        gameDir: gameInfo.value.dir,
        name: name
      });

      if (response?.success) {
        showSuccess('自定义前置删除成功');
        await loadCustomPrerequisites();
        await loadModStatus();
      } else {
        showError('删除失败', { detail: response?.error || '未知错误' });
      }
    } catch (error: any) {
      console.error('删除自定义前置失败:', error);
      showError('删除失败', { detail: error?.message || '未知错误' });
    }
  };

  // 获取自定义前置的安装状态
  const getCustomPrerequisiteStatus = (name: string) => {
    const found = modLoaderDetails.value.found_loaders?.find((loader: string) =>
      loader.includes(name)
    );
    return !!found;
  };

  // 初始化：当游戏信息变化时自动加载
  watch(() => gameInfo?.value, (newGameInfo) => {
    if (newGameInfo) {
      loadModStatus();
      checkGameDirectories();
      loadCustomPrerequisites();
    }
  }, { immediate: true });

  // 监听对话框打开，检查目录
  watch(() => showCustomPrerequisiteDialog.value, (isOpen) => {
    if (isOpen) {
      checkGameDirectories();
    }
  });

  return {
    // 状态
    modStatus,
    modLoaderDetails,
    isLoading,
    selectedComponents,
    isInstalling,
    installResult,
    showResult,
    customPrerequisites,
    showCustomPrerequisiteDialog,
    customPrerequisiteForm,
    selectingCustomPrerequisiteFiles,
    availableTargetDirs,

    // 计算属性
    availableComponents,
    selectedCount,
    allComponentsInstalled,

    // 方法
    toggleComponent,
    getComponentName,
    getComponentLocation,
    loadModStatus,
    handleInstall,
    handleInstallSingle,
    closeResult,
    handleManualSelect,
    handleUnmarkManual,
    isManualBinding,
    checkGameDirectories,
    loadCustomPrerequisites,
    selectCustomPrerequisiteFiles,
    handleInstallCustomPrerequisite,
    handleDeleteCustomPrerequisite,
    getCustomPrerequisiteStatus
  };
}

