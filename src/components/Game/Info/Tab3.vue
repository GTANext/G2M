<script setup lang="ts">
import { InboxOutlined, ReloadOutlined, FolderOutlined, FileOutlined } from '@ant-design/icons-vue';
import { useModApi } from '@/composables/api/useModApi';
import { useMessage } from '@/composables/ui/useMessage';

const props = defineProps({
  gameInfo: {
    type: Object,
    default: null
  }
});

const modApi = useModApi();
const { showError, showWarning } = useMessage();

// MOD列表
const mods = ref([]);
const loading = computed(() => modApi.loadingState.loading);

// 拖拽状态
const isDragging = ref(false);
const dragOverZone = ref(null); // 'left' | 'right' | null

const normalizePath = (path?: string | null) => {
  if (!path) return '';
  return path.replace(/\\/g, '/').toLowerCase();
};

const isDirectoryPath = (path?: string | null) => {
  if (!path) return false;
  return !/\.[^/\\]+$/.test(path);
};

const CATEGORY_LABELS: Record<string, string> = {
  cleo: 'CLEO 脚本',
  cleo_redux: 'CLEO Redux',
  modloader: 'ModLoader 资源',
  asi: 'ASI 插件',
  dll: 'DLL 插件'
};

const getModType = (mod: any) => {
  if (mod?.type) {
    return CATEGORY_LABELS[mod.type] || mod.type;
  }

  const normalized = normalizePath(mod?.install_path);
  if (!normalized) {
    return '未知类型';
  }

  const extMatch = normalized.match(/\.([^.\\/]+)$/);
  const ext = extMatch ? extMatch[1] : '';

  if (normalized.includes('cleoredux') || normalized.includes('plugins/cleo')) {
    return 'CLEO Redux';
  }

  if (normalized.includes('/cleo/') || ext === 'cs') {
    return 'CLEO 脚本';
  }

  if (normalized.includes('modloader')) {
    return 'ModLoader 资源';
  }

  if (ext === 'asi') {
    return 'ASI 插件';
  }

  if (ext === 'dll') {
    return 'DLL 插件';
  }

  if (['zip', 'rar', '7z'].includes(ext)) {
    return '压缩包';
  }

  if (isDirectoryPath(mod?.install_path)) {
    return '目录';
  }

  if (ext) {
    return `${ext.toUpperCase()} 文件`;
  }

  return '文件';
};

const getModTagColor = (type: string) => {
  switch (type) {
    case 'CLEO 脚本':
      return 'green';
    case 'CLEO Redux':
      return 'cyan';
    case 'ModLoader 资源':
      return 'gold';
    case 'ASI 插件':
      return 'orange';
    case 'DLL 插件':
      return 'purple';
    case '压缩包':
      return 'magenta';
    case '目录':
      return 'blue';
    default:
      return 'default';
  }
};

// 加载MOD列表
const loadMods = async () => {
  if (!props.gameInfo?.dir) return;

  const modList = await modApi.getGameMods(props.gameInfo.dir);
  mods.value = modList;
};

// 处理拖拽进入
const handleDragEnter = (e, zone) => {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = true;
  dragOverZone.value = zone;
};

// 处理拖拽悬停
const handleDragOver = (e) => {
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = 'copy';
};

// 处理拖拽离开
const handleDragLeave = (e) => {
  e.preventDefault();
  e.stopPropagation();
  // 只有当离开整个拖拽区域时才取消高亮
  if (!e.currentTarget.contains(e.relatedTarget)) {
    isDragging.value = false;
    dragOverZone.value = null;
  }
};

// 处理文件拖拽放置
const handleDrop = async (e, zone) => {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = false;
  dragOverZone.value = null;

  if (!props.gameInfo?.dir) {
    showError('游戏目录不存在');
    return;
  }

    try {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        const fileName = file.name.toLowerCase();

        // 检查是否是zip文件、文件夹或单个文件
        const isZip = fileName.endsWith('.zip') || fileName.endsWith('.rar') || fileName.endsWith('.7z');
        const isFolder = !file.name.includes('.') || file.webkitRelativePath;
        // 支持常见的MOD文件类型：.cs, .js, .ts, .asi, .dll 等
        const isModFile = fileName.endsWith('.cs') || fileName.endsWith('.js') || fileName.endsWith('.ts') 
          || fileName.endsWith('.asi') || fileName.endsWith('.dll') || fileName.endsWith('.dff')
          || fileName.endsWith('.txd') || fileName.endsWith('.ifp') || fileName.endsWith('.col');

        if (isZip || isFolder || isModFile) {
          // 尝试获取文件路径
          let filePath = null;

          // 在Tauri环境中，尝试多种方式获取路径
          if (file.path) {
            // Tauri可能提供path属性
            filePath = file.path;
          } else if (file.webkitRelativePath && file.webkitRelativePath !== file.name) {
            // webkitRelativePath（通常不可靠）
            filePath = file.webkitRelativePath;
          }

          if (filePath) {
            // 从文件名提取MOD名称（对于单个文件，使用文件名作为MOD名称）
            const modName = file.name.replace(/\.(zip|rar|7z|exe|cs|js|ts|asi|dll|dff|txd|ifp|col)$/i, '');

            // 对于单个文件，直接使用自动检测安装（后端会根据文件后缀自动安装到相应目录）
            if (isModFile && !isZip && !isFolder) {
              // 单个文件：直接自动安装，后端会根据文件后缀自动识别安装位置
              const result = await modApi.installUserMod({
                game_dir: props.gameInfo.dir,
                mod_source_path: filePath,
                mod_name: modName,
                overwrite: false
              });

              if (result) {
                await loadMods();
              }
            } else {
              // ZIP文件或文件夹：检查是否有g2m.json配置文件
              const hasConfig = await modApi.checkModConfig(filePath);
              
              if (hasConfig) {
                // 有g2m.json：直接安装（后端会读取配置并复制文件）
                const result = await modApi.installUserMod({
                  game_dir: props.gameInfo.dir,
                  mod_source_path: filePath,
                  mod_name: modName,
                  overwrite: false
                });

                if (result) {
                  await loadMods();
                }
              } else {
                // 没有g2m.json：先尝试自动检测，如果失败则让用户选择安装目录
                try {
                  const result = await modApi.installUserMod({
                    game_dir: props.gameInfo.dir,
                    mod_source_path: filePath,
                    mod_name: modName,
                    overwrite: false
                  });

                  if (result) {
                    await loadMods();
                  }
                } catch (error) {
                  // 自动检测失败，让用户选择安装目录
                  const targetDir = await modApi.selectGameInstallDirectory(props.gameInfo.dir);
                  if (targetDir) {
                    const result = await modApi.installUserMod({
                      game_dir: props.gameInfo.dir,
                      mod_source_path: filePath,
                      mod_name: modName,
                      overwrite: false,
                      target_directory: targetDir
                    });

                    if (result) {
                      await loadMods();
                    }
                  }
                }
              }
            }
          } else if (isFolder) {
          // 如果是文件夹且无法获取路径，自动打开文件选择器
          showWarning('无法从拖拽获取文件夹路径', {
            detail: `文件夹: ${file.name}\n\n正在打开文件选择器，请选择该文件夹...`
          });

          // 自动打开文件选择器让用户选择文件夹
          const selectedPath = await modApi.selectModFiles(true);
          if (selectedPath) {
            const pathParts = selectedPath.replace(/\\/g, '/').split('/');
            const name = pathParts[pathParts.length - 1] || '未命名MOD';
            const modName = name.replace(/\.(zip|rar|7z|exe)$/i, '');

            // 检查是否有g2m.json配置文件
            const hasConfig = await modApi.checkModConfig(selectedPath);
            
            if (hasConfig) {
              // 有g2m.json：直接安装
              const result = await modApi.installUserMod({
                game_dir: props.gameInfo.dir,
                mod_source_path: selectedPath,
                mod_name: modName,
                overwrite: false
              });

              if (result) {
                await loadMods();
              }
            } else {
              // 没有g2m.json：先尝试自动检测，如果失败则让用户选择安装目录
              try {
                const result = await modApi.installUserMod({
                  game_dir: props.gameInfo.dir,
                  mod_source_path: selectedPath,
                  mod_name: modName,
                  overwrite: false
                });

                if (result) {
                  await loadMods();
                }
              } catch (error) {
                // 自动检测失败，让用户选择安装目录
                const targetDir = await modApi.selectGameInstallDirectory(props.gameInfo.dir);
                if (targetDir) {
                  const result = await modApi.installUserMod({
                    game_dir: props.gameInfo.dir,
                    mod_source_path: selectedPath,
                    mod_name: modName,
                    overwrite: false,
                    target_directory: targetDir
                  });

                  if (result) {
                    await loadMods();
                  }
                }
              }
            }
          }
        } else if (isZip || isModFile) {
          // ZIP文件或单个MOD文件也无法获取路径，自动打开文件选择器
          showWarning('无法从拖拽获取文件路径', {
            detail: `文件: ${file.name}\n\n正在打开文件选择器，请选择该文件...`
          });

          // 自动打开文件选择器让用户选择文件（isDirectory=false表示选择文件）
          const selectedPath = await modApi.selectModFiles(false);
          if (selectedPath) {
            const pathParts = selectedPath.replace(/\\/g, '/').split('/');
            const name = pathParts[pathParts.length - 1] || '未命名MOD';
            const modName = name.replace(/\.(zip|rar|7z|exe|cs|js|ts|asi|dll|dff|txd|ifp|col)$/i, '');

            // 对于单个文件，直接使用自动检测安装
            if (isModFile && !isZip) {
              const result = await modApi.installUserMod({
                game_dir: props.gameInfo.dir,
                mod_source_path: selectedPath,
                mod_name: modName,
                overwrite: false
              });

              if (result) {
                await loadMods();
              }
            } else {
              // ZIP文件：检查是否有g2m.json配置文件
              const hasConfig = await modApi.checkModConfig(selectedPath);
              
              if (hasConfig) {
                const result = await modApi.installUserMod({
                  game_dir: props.gameInfo.dir,
                  mod_source_path: selectedPath,
                  mod_name: modName,
                  overwrite: false
                });

                if (result) {
                  await loadMods();
                }
              } else {
                try {
                  const result = await modApi.installUserMod({
                    game_dir: props.gameInfo.dir,
                    mod_source_path: selectedPath,
                    mod_name: modName,
                    overwrite: false
                  });

                  if (result) {
                    await loadMods();
                  }
                } catch (error) {
                  const targetDir = await modApi.selectGameInstallDirectory(props.gameInfo.dir);
                  if (targetDir) {
                    const result = await modApi.installUserMod({
                      game_dir: props.gameInfo.dir,
                      mod_source_path: selectedPath,
                      mod_name: modName,
                      overwrite: false,
                      target_directory: targetDir
                    });

                    if (result) {
                      await loadMods();
                    }
                  }
                }
              }
            }
          } else {
            showWarning('未选择文件，安装已取消');
          }
        }
      } else {
        const detailMsg = `文件名: ${file.name}\n文件类型: ${file.type || '未知'}\n说明: 支持拖拽 ZIP 压缩包、文件夹或单个MOD文件（.cs, .js, .ts, .asi, .dll 等）`;
        showWarning('不支持的文件类型', { detail: detailMsg });
      }
    } else {
      showWarning('未检测到文件', { detail: '请确保拖拽了有效的文件或文件夹' });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const detailMsg = `错误详情: ${errorMsg}\n说明: 处理文件拖拽时发生异常`;
    console.error('处理文件拖拽失败:', error);
    showError('处理文件拖拽失败', { detail: detailMsg });
  }
};

// 选择并安装MOD文件或文件夹
const handleSelectAndInstall = async (isDirectory: boolean = false) => {
  if (!props.gameInfo?.dir) {
    showError('游戏目录不存在');
    return;
  }

  try {
    const selectedPath = await modApi.selectModFiles(isDirectory);
    if (selectedPath) {
      // 从路径中提取MOD名称
      const pathParts = selectedPath.replace(/\\/g, '/').split('/');
      const name = pathParts[pathParts.length - 1] || '未命名MOD';
      const modName = name.replace(/\.(zip|rar|7z|exe|cs|js|ts|asi|dll|dff|txd|ifp|col)$/i, '');

      // 判断是否为单个文件（通过检查文件扩展名）
      const fileName = name.toLowerCase();
      const isModFile = fileName.endsWith('.cs') || fileName.endsWith('.js') || fileName.endsWith('.ts') 
        || fileName.endsWith('.asi') || fileName.endsWith('.dll') || fileName.endsWith('.dff')
        || fileName.endsWith('.txd') || fileName.endsWith('.ifp') || fileName.endsWith('.col')
        || fileName.endsWith('.zip') || fileName.endsWith('.rar') || fileName.endsWith('.7z');

      // 对于单个文件，直接使用自动检测安装
      if (isModFile && !isDirectory) {
        const result = await modApi.installUserMod({
          game_dir: props.gameInfo.dir,
          mod_source_path: selectedPath,
          mod_name: modName,
          overwrite: false
        });

        if (result) {
          await loadMods();
        }
      } else {
        // 文件夹或ZIP文件：检查是否有g2m.json配置文件
        const hasConfig = await modApi.checkModConfig(selectedPath);
        
        if (hasConfig) {
          // 有g2m.json：直接安装（后端会读取配置并复制文件）
          const result = await modApi.installUserMod({
            game_dir: props.gameInfo.dir,
            mod_source_path: selectedPath,
            mod_name: modName,
            overwrite: false
          });

          if (result) {
            await loadMods();
          }
        } else {
          // 没有g2m.json：先尝试自动检测，如果失败则让用户选择安装目录
          try {
            const result = await modApi.installUserMod({
              game_dir: props.gameInfo.dir,
              mod_source_path: selectedPath,
              mod_name: modName,
              overwrite: false
            });

            if (result) {
              await loadMods();
            }
          } catch (error) {
            // 自动检测失败，让用户选择安装目录
            const targetDir = await modApi.selectGameInstallDirectory(props.gameInfo.dir);
            if (targetDir) {
              const result = await modApi.installUserMod({
                game_dir: props.gameInfo.dir,
                mod_source_path: selectedPath,
                mod_name: modName,
                overwrite: false,
                target_directory: targetDir
              });

              if (result) {
                await loadMods();
              }
            }
          }
        }
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const detailMsg = `游戏目录: ${props.gameInfo?.dir || '未知'}\n错误: ${errorMsg}\n说明: 选择或安装MOD文件时发生异常`;
    showError('选择MOD文件失败', { detail: detailMsg });
  }
};

// 监听gameInfo变化
watch(() => props.gameInfo?.dir, () => {
  if (props.gameInfo?.dir) {
    loadMods();
  }
}, { immediate: true });

// 组件挂载时加载MOD列表
onMounted(() => {
  if (props.gameInfo?.dir) {
    loadMods();
  }
});
</script>

<template>
  <div style="display: flex; flex-direction: column; height: 100%;">
    <!-- 有MOD时显示列表 -->
    <div v-if="mods.length > 0" style="flex: 1;">
      <a-spin :spinning="loading">
        <a-list :data-source="mods" :bordered="true" class="mod-list">
          <template #renderItem="{ item }">
            <a-list-item class="mod-list-item">
              <div class="mod-item">
                <div class="mod-icon">
                  <FolderOutlined v-if="isDirectoryPath(item.install_path)" />
                  <FileOutlined v-else />
                </div>
                <div class="mod-body">
                  <div class="mod-header">
                    <div class="mod-header-left">
                      <span class="mod-name">{{ item.name }}</span>
                      <a-tag size="small" :color="getModTagColor(getModType(item))">
                        {{ getModType(item) }}
                      </a-tag>
                      <a-tag v-if="item.author" color="blue" size="small">
                        {{ item.author }}
                      </a-tag>
                    </div>
                  </div>
                </div>
              </div>
            </a-list-item>
          </template>
        </a-list>
      </a-spin>
    </div>

    <!-- 没有MOD时显示拖拽安装界面 -->
    <div v-else style="flex: 1; display: flex; flex-direction: column;">
      <a-row :gutter="16" style="flex: 1; min-height: 400px;">
        <!-- 左侧：拖拽区域 -->
        <a-col :span="16">
          <a-card class="drop-zone-card" :class="{ 'dragging': isDragging && dragOverZone === 'left' }"
            @dragenter="(e) => handleDragEnter(e, 'left')" @dragover="handleDragOver" @dragleave="handleDragLeave"
            @drop="(e) => handleDrop(e, 'left')" style="height: 100%;">
                    <template #title>
                      <span>拖拽MOD文件到此处</span>
                    </template>
                    <div class="drop-zone-content">
                      <InboxOutlined class="drop-icon" />
                      <p class="drop-text">拖拽MOD文件到此处安装</p>
                      <p class="drop-hint">支持 ZIP 压缩包、文件夹或单个文件（.cs, .js, .ts, .asi, .dll 等）</p>
                    </div>
          </a-card>
        </a-col>

        <!-- 右侧：操作按钮区域 -->
        <a-col :span="8">
          <a-card title="操作" style="height: 100%;">
            <a-space direction="vertical" style="width: 100%;" size="large">
              <a-button type="primary" block @click="() => handleSelectAndInstall(false)" :loading="loading">
                <template #icon>
                  <FileOutlined />
                </template>
                选择MOD文件
              </a-button>
              <a-button block @click="() => handleSelectAndInstall(true)" :loading="loading">
                <template #icon>
                  <FolderOutlined />
                </template>
                选择MOD文件夹
              </a-button>
              <a-button block @click="loadMods" :loading="loading">
                <template #icon>
                  <ReloadOutlined />
                </template>
                刷新MOD列表
              </a-button>
            </a-space>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<style scoped>
:deep(.ant-list-item) {
  padding: 12px 16px;
}

.mod-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.mod-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #1890ff;
  flex-shrink: 0;
}

.mod-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mod-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.mod-header-left {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.mod-name {
  font-weight: 600;
  font-size: 15px;
}

.drop-zone-card {
  transition: all 0.3s ease;
  border: 2px dashed #d9d9d9;
  position: relative;
}

.drop-zone-card.dragging {
  border-color: #1890ff;
  background-color: #e6f7ff;
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  padding: 40px;
}

.drop-icon {
  font-size: 64px;
  color: #1890ff;
  margin-bottom: 16px;
}

.drop-text {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.drop-hint {
  font-size: 14px;
  color: #999;
  margin: 0;
}
</style>
