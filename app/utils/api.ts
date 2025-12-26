/**
 * API 调用工具函数
 * 提供统一的 API 调用封装和错误处理
 */

import { tauriInvoke } from './tauri';
import type { ApiResponse } from '~/types';

/**
 * API 调用选项
 */
export interface ApiCallOptions {
  /** 是否在失败时自动显示错误消息 */
  showError?: boolean;
  /** 自定义错误消息 */
  errorMessage?: string;
  /** 是否静默失败（不抛出错误） */
  silent?: boolean;
}

/**
 * 统一的 API 调用封装
 * @param command Tauri 命令名称
 * @param params 命令参数
 * @param options 调用选项
 * @returns API 响应
 */
export async function callApi<T = unknown>(
  command: string,
  params?: unknown,
  options: ApiCallOptions = {}
): Promise<ApiResponse<T>> {
  const { showError = false, errorMessage, silent = false } = options;

  try {
    const response = await tauriInvoke<ApiResponse<T>>(command, params);

    if (!response.success && !silent) {
      const error = response.error || errorMessage || `调用 ${command} 失败`;
      if (showError) {
        // 这里可以集成消息提示系统
        console.error(error);
      }
    }

    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const finalError = errorMessage || `调用 ${command} 失败: ${errorMsg}`;

    if (!silent) {
      if (showError) {
        console.error(finalError);
      }
      throw new Error(finalError);
    }

    return {
      success: false,
      error: finalError,
    };
  }
}

/**
 * 检查 API 响应是否成功
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined && response.data !== null;
}

/**
 * 从 API 响应中提取数据，失败时抛出错误
 */
export function extractApiData<T>(response: ApiResponse<T>): T {
  if (!isApiSuccess(response)) {
    throw new Error(response.error || 'API 调用失败');
  }
  return response.data;
}
