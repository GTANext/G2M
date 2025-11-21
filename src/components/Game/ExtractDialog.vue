<script setup>
import { ref, watch, computed } from 'vue'
import { FileZipOutlined, FolderOpenOutlined } from '@ant-design/icons-vue'
import { Modal, Button, Space, Typography, Alert, Form, Input, FormItem } from 'ant-design-vue'
import { invoke } from '@tauri-apps/api/core'
import { useMessage } from '@/composables/ui/useMessage'
import { useGameApi } from '@/composables/api/useGameApi'

const { Text } = Typography
const { showError, showSuccess } = useMessage()
const { saveGame } = useGameApi()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  gameType: {
    type: String,
    default: null
  },
  downloadRecord: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'success', 'cancel'])

const gameNames = {
  gta3: 'Grand Theft Auto III',
  gtavc: 'Grand Theft Auto Vice City',
  gtasa: 'Grand Theft Auto San Andreas'
}

const gameExeMap = {
  gta3: 'gta3.exe',
  gtavc: 'gtavc.exe',
  gtasa: 'gta_sa.exe'
}

const extractPath = ref('')
const gameName = ref('')
const gameDir = ref('')
const gameExe = ref('')
const isExtracting = ref(false)
const extractFormRef = ref()

// 初始化表单数据
const initFormData = () => {
  if (props.downloadRecord) {
    // 如果已有解压记录，使用之前的设置
    gameName.value = props.downloadRecord.game_name || gameNames[props.gameType] || ''
    gameDir.value = props.downloadRecord.game_dir || ''
    gameExe.value = props.downloadRecord.game_exe || gameExeMap[props.gameType] || ''
  } else {
    // 否则使用默认值
    gameName.value = gameNames[props.gameType] || ''
    gameExe.value = gameExeMap[props.gameType] || ''
    gameDir.value = ''
  }
}

// 选择解压目录
const selectExtractFolder = async () => {
  try {
    const response = await invoke('select_extract_folder')
    if (response?.success && response?.data) {
      extractPath.value = response.data
      // 自动设置游戏目录
      if (!gameDir.value) {
        gameDir.value = response.data
      }
    } else {
      if (response?.error) {
        showError('选择文件夹失败', { detail: response.error })
      }
    }
  } catch (error) {
    showError('选择文件夹失败', { detail: error })
  }
}

// 开始解压
const startExtract = async () => {
  try {
    await extractFormRef.value?.validate()
    
    if (!props.downloadRecord || !props.downloadRecord.zip_path) {
      showError('下载记录不存在')
      return
    }
    
    isExtracting.value = true

    // 调用解压命令
    const extractResponse = await invoke('extract_game', {
      request: {
        zip_path: props.downloadRecord.zip_path,
        extract_to: extractPath.value,
        game_name: gameName.value,
        game_dir: gameDir.value,
        game_exe: gameExe.value
      }
    })

    if (extractResponse?.success) {
      // 解压成功后，自动添加游戏到列表
      try {
        const gameType = props.gameType
        const saveResponse = await saveGame({
          name: gameName.value,
          dir: gameDir.value,
          exe: gameExe.value,
          img: '',
          type: gameType
        })

        if (saveResponse?.success) {
          showSuccess('游戏解压并添加成功！')
          emit('success')
          emit('update:visible', false)
          resetDialog()
        } else {
          showError('游戏解压成功，但添加到列表失败', { detail: saveResponse?.error })
        }
      } catch (error) {
        showError('游戏解压成功，但添加到列表失败', { detail: error })
      }
    } else {
      throw new Error(extractResponse?.error || '解压失败')
    }
  } catch (error) {
    console.error('解压失败:', error)
    if (error?.errorFields) {
      // 表单验证错误
      return
    }
    showError('解压失败', { detail: error.message || error })
  } finally {
    isExtracting.value = false
  }
}

// 取消
const handleCancel = () => {
  if (isExtracting.value) {
    showError('解压进行中，无法取消')
    return
  }
  emit('cancel')
  emit('update:visible', false)
  resetDialog()
}

// 重置对话框
const resetDialog = () => {
  extractPath.value = ''
  gameName.value = ''
  gameDir.value = ''
  gameExe.value = ''
}

// 监听 visible 和 downloadRecord 变化
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    initFormData()
  } else {
    resetDialog()
  }
})

watch(() => props.downloadRecord, () => {
  if (props.visible) {
    initFormData()
  }
})
</script>

<template>
  <Modal
    :open="visible"
    @update:open="$emit('update:visible', $event)"
    :title="`解压 ${gameNames[gameType] || '游戏'}`"
    :width="600"
    :maskClosable="false"
    :keyboard="false"
    :footer="null"
  >
    <div class="extract-dialog-content">
      <Alert
        v-if="downloadRecord"
        type="info"
        :message="`ZIP 文件: ${downloadRecord.zip_path.split(/[/\\]/).pop()}`"
        :description="`下载日期: ${new Date(downloadRecord.download_date).toLocaleString()}`"
        show-icon
        style="margin-bottom: 16px;"
      />

      <Form
        ref="extractFormRef"
        :model="{ extractPath, gameName, gameDir, gameExe }"
        layout="vertical"
      >
        <FormItem
          label="解压位置"
          name="extractPath"
          :rules="[{ required: true, message: '请选择解压位置' }]"
        >
          <div class="path-selector">
            <Input
              v-model:value="extractPath"
              placeholder="请选择解压位置"
              readonly
              style="flex: 1"
            />
            <Button @click="selectExtractFolder" :disabled="isExtracting">
              <template #icon>
                <FolderOpenOutlined />
              </template>
              选择位置
            </Button>
          </div>
        </FormItem>

        <FormItem
          label="游戏名称"
          name="gameName"
          :rules="[{ required: true, message: '请输入游戏名称' }]"
        >
          <Input v-model:value="gameName" placeholder="请输入游戏名称" />
        </FormItem>

        <FormItem
          label="游戏目录"
          name="gameDir"
          :rules="[{ required: true, message: '请输入游戏目录' }]"
        >
          <Input v-model:value="gameDir" placeholder="游戏目录路径" />
          <Text type="secondary" style="font-size: 12px; display: block; margin-top: 4px;">
            通常与解压位置相同
          </Text>
        </FormItem>

        <FormItem
          label="启动程序"
          name="gameExe"
          :rules="[{ required: true, message: '请输入启动程序' }]"
        >
          <Input v-model:value="gameExe" placeholder="例如: gta3.exe" />
        </FormItem>
      </Form>

      <Alert
        v-if="isExtracting"
        type="info"
        message="正在解压游戏文件..."
        show-icon
        style="margin-top: 16px;"
      />

      <div class="dialog-footer">
        <Space>
          <Button @click="handleCancel" :disabled="isExtracting">
            取消
          </Button>
          <Button
            type="primary"
            @click="startExtract"
            :loading="isExtracting"
            :disabled="!extractPath || !gameName || !gameDir || !gameExe"
          >
            <template #icon>
              <FileZipOutlined />
            </template>
            解压并添加游戏
          </Button>
        </Space>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.extract-dialog-content {
  padding: 8px 0;
}

.path-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  margin-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>

