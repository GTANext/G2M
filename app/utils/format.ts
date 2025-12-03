/**
 * 格式化时间字符串
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

    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const isThisYear = date.getFullYear() === now.getFullYear()

    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')

    // 如果是今天，只显示时间
    if (isToday) {
      return `今天 ${hour}:${minute}`
    }

    // 如果是今年，不显示年份
    if (isThisYear) {
      return `${month}月${day}日 ${hour}:${minute}`
    }

    // 其他情况显示完整日期
    return `${year}年${month}月${day}日 ${hour}:${minute}`
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