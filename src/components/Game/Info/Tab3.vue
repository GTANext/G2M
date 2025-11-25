<script setup>
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

      // 检查是否是zip文件或文件夹
      const isZip = fileName.endsWith('.zip');
      const isFolder = !file.name.includes('.') || file.webkitRelativePath;

      if (isZip || isFolder) {
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
          // 从文件名提取MOD名称
          const modName = file.name.replace(/\.(zip|rar|7z|exe)$/i, '');

          // 直接安装MOD（后端会自动检查是否有g2m.json并使用配置安装）
          const result = await modApi.installUserMod({
            game_dir: props.gameInfo.dir,
            mod_source_path: filePath,
            mod_name: modName,
            overwrite: false
          });

          if (result) {
            // 重新加载MOD列表
            await loadMods();
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

            // 安装MOD（后端会自动检查是否有g2m.json并使用配置安装）
            const result = await modApi.installUserMod({
              game_dir: props.gameInfo.dir,
              mod_source_path: selectedPath,
              mod_name: modName,
              overwrite: false
            });

            if (result) {
              await loadMods();
            }
          }
        } else if (isZip) {
          // ZIP文件也无法获取路径，提示使用文件选择器
          showWarning('无法从拖拽获取文件路径', {
            detail: `文件: ${file.name}\n\n请点击"选择MOD文件安装"按钮来选择文件。`
          });
        }
      } else {
        const detailMsg = `文件名: ${file.name}\n文件类型: ${file.type || '未知'}\n说明: 仅支持拖拽 ZIP 压缩包或文件夹`;
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

// 选择并安装MOD文件
const handleSelectAndInstall = async () => {
  if (!props.gameInfo?.dir) {
    showError('游戏目录不存在');
    return;
  }

  try {
    const selectedPath = await modApi.selectModFiles(true);
    if (selectedPath) {
      // 从路径中提取MOD名称
      const pathParts = selectedPath.replace(/\\/g, '/').split('/');
      const name = pathParts[pathParts.length - 1] || '未命名MOD';
      const modName = name.replace(/\.(zip|rar|7z|exe)$/i, '');

      // 直接安装MOD
      const result = await modApi.installUserMod({
        game_dir: props.gameInfo.dir,
        mod_source_path: selectedPath,
        mod_name: modName,
        overwrite: false
      });

      if (result) {
        // 重新加载MOD列表
        await loadMods();
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
        <a-list :data-source="mods" :bordered="true">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta>
                <template #title>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <FolderOutlined />
                    <span style="font-weight: 600;">{{ item.name }}</span>
                    <a-tag v-if="item.author" color="blue" size="small">
                      {{ item.author }}
                    </a-tag>
                  </div>
                </template>
                <template #description>
                  <div v-if="item.author" style="color: #666; font-size: 13px;">
                    <div>作者: {{ item.author }}</div>
                  </div>
                </template>
              </a-list-item-meta>
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
              <span>拖拽ZIP文件或文件夹到此处</span>
            </template>
            <div class="drop-zone-content">
              <InboxOutlined class="drop-icon" />
              <p class="drop-text">拖拽MOD文件到此处安装</p>
              <p class="drop-hint">支持 ZIP 压缩包和文件夹</p>
            </div>
          </a-card>
        </a-col>

        <!-- 右侧：操作按钮区域 -->
        <a-col :span="8">
          <a-card title="操作" style="height: 100%;">
            <a-space direction="vertical" style="width: 100%;" size="large">
              <a-button type="primary" block @click="handleSelectAndInstall" :loading="loading">
                <template #icon>
                  <InboxOutlined />
                </template>
                选择MOD文件安装
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

:deep(.ant-list-item-meta-title) {
  margin-bottom: 4px;
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
