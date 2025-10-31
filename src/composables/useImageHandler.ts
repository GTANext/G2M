import { ref } from 'vue';

export interface ImageProcessResult {
  dataUrl: string;  // 完整的 data:image/xxx;base64,xxx 格式
  base64: string;   // 纯 base64 数据（保持向后兼容）
  fileName: string;
  size: number;
  type: string;
}

export function useImageHandler() {
  const isProcessing = ref(false);
  const error = ref<string | null>(null);

  // 支持的图片格式
  const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
  
  // 最大文件大小 (10MB)
  const maxFileSize = 10 * 1024 * 1024;

  /**
   * 将文件转换为Base64
   */
  const fileToBase64 = (file: File): Promise<ImageProcessResult> => {
    return new Promise((resolve, reject) => {
      // 验证文件类型
      if (!supportedFormats.includes(file.type)) {
        reject(new Error(`不支持的图片格式: ${file.type}。支持的格式: JPG, PNG, GIF, BMP, WebP`));
        return;
      }

      // 验证文件大小
      if (file.size > maxFileSize) {
        reject(new Error(`图片文件过大: ${(file.size / 1024 / 1024).toFixed(2)}MB。最大支持: 10MB`));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const result = reader.result as string;
          // 获取完整的 data URL 和纯 base64 数据
          const base64Data = result.split(',')[1];
          
          resolve({
            dataUrl: result,  // 完整的 data:image/xxx;base64,xxx 格式
            base64: base64Data,  // 纯 base64 数据
            fileName: file.name,
            size: file.size,
            type: file.type
          });
        } catch (err) {
          reject(new Error('读取文件失败'));
        }
      };

      reader.onerror = () => {
        reject(new Error('读取文件时发生错误'));
      };

      reader.readAsDataURL(file);
    });
  };

  /**
   * 处理图片文件选择
   */
  const processImageFile = async (file: File): Promise<ImageProcessResult> => {
    try {
      isProcessing.value = true;
      error.value = null;

      const result = await fileToBase64(file);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '处理图片时发生未知错误';
      error.value = errorMessage;
      throw new Error(errorMessage);
    } finally {
      isProcessing.value = false;
    }
  };

  /**
   * 创建文件选择器 - 返回Base64数据（保持向后兼容）
   */
  const selectImageFile = (): Promise<ImageProcessResult | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = supportedFormats.join(',');
      
      input.onchange = async (event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        
        if (file) {
          try {
            const result = await processImageFile(file);
            resolve(result);
          } catch (err) {
            console.error('处理图片失败:', err);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };

      input.oncancel = () => {
        resolve(null);
      };

      input.click();
    });
  };



  /**
   * 验证Base64图片数据
   */
  const validateBase64Image = (base64: string): boolean => {
    try {
      // 检查是否是有效的base64字符串
      const decoded = atob(base64);
      
      // 检查文件大小
      if (decoded.length > maxFileSize) {
        throw new Error('图片文件过大');
      }

      return true;
    } catch (err) {
      return false;
    }
  };

  /**
   * 生成图片预览URL
   */
  const createPreviewUrl = (base64: string, mimeType: string = 'image/jpeg'): string => {
    return `data:${mimeType};base64,${base64}`;
  };

  /**
   * 清除错误状态
   */
  const clearError = () => {
    error.value = null;
  };

  return {
    // 状态
    isProcessing,
    error,
    
    // 配置
    supportedFormats,
    maxFileSize,
    
    // 方法
    fileToBase64,
    processImageFile,
    selectImageFile,
    validateBase64Image,
    createPreviewUrl,
    clearError
  };
}