/**
 * 格式化时间字符串（支持时间戳和日期字符串）
 */
export function formatTime(timeStr: string | number | null | undefined): string {
  if (!timeStr) return '未知'

  try {
    // 如果是数字或数字字符串，作为时间戳处理
    let timestamp: number
    if (typeof timeStr === 'number') {
      timestamp = timeStr
    } else {
      // 尝试解析为数字（时间戳）
      const parsed = parseInt(timeStr, 10)
      if (!isNaN(parsed) && parsed > 0) {
        // 如果是秒级时间戳（小于 13 位），转换为毫秒
        timestamp = parsed.toString().length < 13 ? parsed * 1000 : parsed
      } else {
        // 否则作为日期字符串处理
        timestamp = new Date(timeStr).getTime()
      }
    }

    if (isNaN(timestamp) || timestamp <= 0) return String(timeStr)

    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return String(timeStr)

    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return String(timeStr)
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 格式化路径显示
 */
export function formatPath(path: string, maxLength: number = 50): string {
  if (!path || path.length <= maxLength) return path

  const start = path.substring(0, 15)
  const end = path.substring(path.length - (maxLength - 18))
  return `${start}...${end}`
}