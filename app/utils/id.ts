/**
 * ID 转换工具函数
 * 统一处理字符串和数字 ID 之间的转换
 */

/**
 * 将 ID 转换为数字类型（用于 Rust u32）
 * @param id 可能是字符串或数字的 ID
 * @returns 数字类型的 ID
 * @throws 如果 ID 无效则抛出错误
 */
export function toNumericId(id: unknown): number {
  if (typeof id === 'number') {
    if (isNaN(id) || id < 0 || !Number.isInteger(id)) {
      throw new Error('无效的游戏ID: 必须是正整数');
    }
    return id;
  }

  if (typeof id === 'string') {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId < 0) {
      throw new Error(`无效的游戏ID: "${id}"`);
    }
    return numericId;
  }

  throw new Error(`无效的游戏ID类型: ${typeof id}`);
}

/**
 * 安全地将 ID 转换为数字，失败时返回 null
 */
export function toNumericIdSafe(id: unknown): number | null {
  try {
    return toNumericId(id);
  } catch {
    return null;
  }
}

/**
 * 验证 ID 是否有效
 */
export function isValidId(id: unknown): id is number {
  try {
    toNumericId(id);
    return true;
  } catch {
    return false;
  }
}
