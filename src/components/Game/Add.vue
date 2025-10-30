<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { 
  FolderOpenOutlined, 
  AppstoreOutlined, 
  CheckCircleOutlined,
  LoadingOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons-vue'
import { useGameForm } from '@/composables'

const router = useRouter()
const {
  formData,
  rules,
  formRef,
  isDetecting,
  detectionResult,
  isAutoDetected,
  loadingState,
  selectFolder,
  submitForm,
  resetForm,
  getGameTypeName
} = useGameForm()

// 提交表单并返回列表页
const handleSubmit = async () => {
  const success = await submitForm()
  if (success) {
    router.push('/')
  }
}

// 返回游戏列表
const goBack = () => {
  router.push('/')
}
</script>

<template>
  <div class="add-game-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <a-button 
        type="text" 
        @click="goBack"
        class="back-button"
      >
        <template #icon>
          <ArrowLeftOutlined />
        </template>
        返回游戏列表
      </a-button>
      <h1 class="page-title">
         <AppstoreOutlined class="title-icon" />
         添加游戏
       </h1>
      <p class="page-description">
        选择游戏文件夹，系统将自动检测支持的 GTA 游戏并填充信息
      </p>
    </div>

    <!-- 表单卡片 -->
    <div class="form-card">
      <a-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        layout="vertical"
        @finish="handleSubmit"
      >
        <!-- 游戏目录选择 -->
        <a-form-item label="游戏目录" name="dir" class="form-item">
          <a-input-group compact>
            <a-input
              v-model:value="formData.dir"
              placeholder="请选择游戏安装目录"
              readonly
              class="folder-input"
            />
            <a-button 
              type="primary" 
              @click="selectFolder"
              :loading="loadingState.loading"
              class="folder-button"
            >
              <template #icon>
                <FolderOpenOutlined />
              </template>
              选择文件夹
            </a-button>
          </a-input-group>
        </a-form-item>

        <!-- 游戏检测结果 -->
        <div v-if="formData.dir" class="detection-section">
          <a-spin :spinning="isDetecting" tip="正在检测游戏...">
            <a-alert
              v-if="isAutoDetected"
              type="success"
              show-icon
              class="detection-alert"
            >
              <template #icon>
                <CheckCircleOutlined />
              </template>
              <template #message>
                <span class="detection-title">自动检测成功</span>
              </template>
              <template #description>
                <div class="detection-info">
                  <p><strong>游戏类型:</strong> {{ getGameTypeName(detectionResult?.game_type || '') }}</p>
                  <p><strong>主程序:</strong> {{ detectionResult?.executable }}</p>
                  <p class="detection-note">系统已自动填充游戏信息，您可以根据需要进行修改</p>
                </div>
              </template>
            </a-alert>

            <a-alert
              v-else-if="detectionResult && !isAutoDetected"
              type="info"
              show-icon
              class="detection-alert"
            >
              <template #message>
                <span class="detection-title">未检测到支持的游戏</span>
              </template>
              <template #description>
                <div class="detection-info">
                  <p>在选择的目录中未找到 GTA3、GTA Vice City 或 GTA San Andreas 的主程序文件</p>
                  <p class="detection-note">请手动填写游戏信息</p>
                </div>
              </template>
            </a-alert>
          </a-spin>
        </div>

        <!-- 游戏名称 -->
        <a-form-item label="游戏名称" name="name" class="form-item">
          <a-input
            v-model:value="formData.name"
            placeholder="请输入游戏名称，如：Grand Theft Auto III"
            size="large"
          />
        </a-form-item>

        <!-- 启动程序 -->
        <a-form-item label="启动程序" name="exe" class="form-item">
          <a-input
            v-model:value="formData.exe"
            placeholder="请输入游戏主程序文件名，如：gta3.exe"
            size="large"
          />
          <div class="form-help">
            <p>支持的游戏主程序：</p>
            <ul>
              <li><code>gta3.exe</code> - Grand Theft Auto III</li>
              <li><code>gta-vc.exe</code> - Grand Theft Auto: Vice City</li>
              <li><code>gtasa.exe</code> - Grand Theft Auto: San Andreas</li>
            </ul>
          </div>
        </a-form-item>

        <!-- 游戏图标 -->
        <a-form-item label="游戏图标" name="img" class="form-item">
          <a-input
            v-model:value="formData.img"
            placeholder="游戏图标路径（可选）"
            size="large"
          />
          <div class="form-help">
            <p>可以指定自定义游戏图标的路径，留空将使用默认图标</p>
          </div>
        </a-form-item>

        <!-- 表单操作按钮 -->
        <div class="form-actions">
          <a-space size="large">
            <a-button 
              size="large" 
              @click="resetForm"
              :disabled="loadingState.loading"
            >
              重置表单
            </a-button>
            <a-button 
              type="primary" 
              size="large" 
              html-type="submit"
              :loading="loadingState.loading"
              class="submit-button"
            >
              <template #icon v-if="!loadingState.loading">
                <CheckCircleOutlined />
              </template>
              {{ loadingState.loading ? '保存中...' : '保存游戏' }}
            </a-button>
          </a-space>
        </div>
      </a-form>
    </div>

    <!-- 错误提示 -->
    <a-alert
      v-if="loadingState.error"
      type="error"
      show-icon
      :message="loadingState.error.message"
      closable
      class="error-alert"
    />
  </div>
</template>

<style scoped>
.add-game-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
}

.back-button {
  position: absolute;
  left: 0;
  top: 0;
  color: #1890ff;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #1890ff;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.title-icon {
  font-size: 32px;
}

.page-description {
  color: #666;
  font-size: 16px;
  margin: 0;
}

.form-card {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #f0f0f0;
}

.form-item {
  margin-bottom: 24px;
}

.folder-input {
  flex: 1;
}

.folder-button {
  border-radius: 0 6px 6px 0;
}

.detection-section {
  margin: 24px 0;
}

.detection-alert {
  border-radius: 8px;
}

.detection-title {
  font-weight: 600;
  font-size: 16px;
}

.detection-info {
  margin-top: 8px;
}

.detection-info p {
  margin: 4px 0;
}

.detection-note {
  color: #666;
  font-style: italic;
}

.form-help {
  margin-top: 8px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 6px;
  border-left: 4px solid #1890ff;
}

.form-help p {
  margin: 0 0 8px 0;
  color: #666;
  font-size: 14px;
}

.form-help ul {
  margin: 0;
  padding-left: 20px;
}

.form-help li {
  margin: 4px 0;
  color: #666;
  font-size: 14px;
}

.form-help code {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  color: #1890ff;
}

.form-actions {
  text-align: center;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.submit-button {
  min-width: 140px;
}

.error-alert {
  margin-top: 24px;
  border-radius: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .add-game-container {
    padding: 16px;
  }
  
  .form-card {
    padding: 24px 16px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .form-actions {
    text-align: center;
  }
  
  .form-actions .ant-space {
    flex-direction: column;
    width: 100%;
  }
  
  .form-actions .ant-btn {
    width: 100%;
  }
}
</style>