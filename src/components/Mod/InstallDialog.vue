<script setup>
import { ref, watch } from 'vue';
import { useModApi } from '@/composables/api/useModApi';
import { useMessage } from '@/composables/ui/useMessage';
import { formatPath } from '@/utils/format';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  gameDir: {
    type: String,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  initialPath: {
    type: String,
    default: ''
  },
  initialName: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:visible', 'success', 'cancel']);

const modApi = useModApi();
const { showError, showWarning } = useMessage();

const installModName = ref('');
const installModPath = ref('');
const selectingMod = ref(false);
const isDragging = ref(false);

// 监听visible变化，重置表单或填充初始值
watch(() => props.visible, (newVal) => {
  if (newVal) {
    // 对话框打开时，如果有初始值则填充
    if (props.initialPath) {
      installModPath.value = props.initialPath;
    }
    if (props.initialName) {
      installModName.value = props.initialName;
    }
  } else {
    // 对话框关闭时，清空表单
    installModName.value = '';
    installModPath.value = '';
  }
});

// 监听初始值变化
watch(() => props.initialPath, (newVal) => {
  if (newVal && props.visible) {
    installModPath.value = newVal;
  }
});

watch(() => props.initialName, (newVal) => {
  if (newVal && props.visible) {
    installModName.value = newVal;
  }
});

// 选择MOD文件
const handleSelectMod = async () => {
  selectingMod.value = true;
  try {
    // 默认选择文件夹，因为MOD通常是文件夹
    const selectedPath = await modApi.selectModFiles(true);
    if (selectedPath) {
      installModPath.value = selectedPath;
      // 从路径中提取MOD名称（文件名或文件夹名）
      const pathParts = selectedPath.replace(/\\/g, '/').split('/');
      const name = pathParts[pathParts.length - 1] || '未命名MOD';
      installModName.value = name.replace(/\.(zip|rar|7z|exe)$/i, '');
    }
  } catch (error) {
    showError('选择MOD文件失败');
  } finally {
    selectingMod.value = false;
  }
};

// 安装MOD
const handleInstall = async () => {
  if (!props.gameDir) {
    showError('游戏目录不存在');
    return;
  }

  if (!installModPath.value) {
    showError('请选择MOD文件');
    return;
  }

  const modName = installModName.value.trim();
  if (!modName) {
    showWarning('请输入MOD名称');
    return;
  }

  try {
    const result = await modApi.installUserMod({
      game_dir: props.gameDir,
      mod_source_path: installModPath.value,
      mod_name: modName,
      overwrite: false
    });

    if (result) {
      emit('update:visible', false);
      emit('success', result);
    }
  } catch (error) {
    showError('安装MOD失败');
  }
};

// 取消安装
const handleCancel = () => {
  emit('update:visible', false);
  emit('cancel');
};

// 处理拖拽进入
const handleDragEnter = (e) => {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = true;
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
  }
};

// 处理文件拖拽放置
const handleDrop = async (e) => {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = false;

  try {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const fileName = file.name.toLowerCase();

      // 检查是否是zip文件
      if (fileName.endsWith('.zip')) {
        // 在Tauri环境中，File对象可能包含path属性
        // 尝试获取文件路径
        let filePath = null;

        // 尝试从File对象获取路径（Tauri可能支持）
        if (file.path) {
          filePath = file.path;
        } else if (file.webkitRelativePath && file.webkitRelativePath !== file.name) {
          // 使用webkitRelativePath（如果可用且不是文件名）
          filePath = file.webkitRelativePath;
        }

        if (filePath) {
          installModPath.value = filePath;
          // 从文件名提取MOD名称
          const name = file.name.replace(/\.zip$/i, '');
          installModName.value = name;
        } else {
          // 无法获取完整路径，提示用户使用文件选择器
          showWarning('无法从拖拽获取文件完整路径，请使用"选择MOD文件"按钮选择zip文件');
        }
      } else {
        showWarning('请拖拽zip格式的MOD文件');
      }
    }
  } catch (error) {
    console.error('处理文件拖拽失败:', error);
    showError('处理文件拖拽失败，请使用"选择MOD文件"按钮');
  }
};
</script>

<template>
  <a-modal :open="visible" title="安装MOD" :confirm-loading="loading" @ok="handleInstall" @cancel="handleCancel"
    @update:open="(val) => emit('update:visible', val)">
    <div class="drop-zone" :class="{ 'dragging': isDragging }" @dragenter="handleDragEnter" @dragover="handleDragOver"
      @dragleave="handleDragLeave" @drop="handleDrop">
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="MOD名称" required>
          <a-input v-model:value="installModName" placeholder="请输入MOD名称" :maxlength="50" />
        </a-form-item>
        <a-form-item label="MOD路径">
          <a-input :value="formatPath(installModPath, 60)" disabled placeholder="请选择MOD文件或文件夹" />
        </a-form-item>
        <a-form-item>
          <a-button @click="handleSelectMod" :loading="selectingMod">
            选择MOD文件
          </a-button>
        </a-form-item>
      </a-form>
      <a-alert message="提示" description="系统将自动识别MOD文件类型并安装到相应目录（CLEO脚本、ModLoader资源等）。支持拖拽zip文件到此处。" type="info"
        show-icon style="margin-top: 16px;" />
    </div>
  </a-modal>
</template>

<style scoped>
.drop-zone {
  position: relative;
  transition: all 0.3s ease;
  border-radius: 4px;
  padding: 8px;
  margin: -8px;
}

.drop-zone.dragging {
  background-color: #e6f7ff;
  border: 2px dashed #1890ff;
}

.drop-zone.dragging::before {
  content: '释放以安装MOD';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 16px;
  font-weight: 600;
  color: #1890ff;
  z-index: 10;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.9);
  padding: 12px 24px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>
