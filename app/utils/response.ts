/**
 * API 响应处理工具函数
 */

import type { ApiResponse } from '~/types';

/**
 * 从 API 响应中安全地获取数据
 * @param response API 响应
 * @param defaultValue 默认值（当响应失败时返回）
 * @returns 响应数据或默认值
 */
export function getResponseData<T>(response: ApiResponse<T>, defaultValue: T): T {
  if (response.success && response.data !== undefined && response.data !== null) {
    return response.data;
  }
  return defaultValue;
}

/**
 * 从 API 响应中获取数据，失败时返回 null
 */
export function getResponseDataOrNull<T>(response: ApiResponse<T>): T | null {
  if (response.success && response.data !== undefined && response.data !== null) {
    return response.data;
  }
  return null;
}

/**
 * 检查响应是否成功
 */
export function isResponseSuccess<T>(response: ApiResponse<T>): boolean {
  return response.success === true;
}

/**
 * 获取响应错误消息
 */
export function getResponseError(response: ApiResponse<unknown>, defaultMessage = '操作失败'): string {
  return response.error || defaultMessage;
}
