/**
 * 格式化时间字符串
 */
export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '未知'
  
  try {
    const date = new Date(timeStr)
    if (isNaN(date.getTime())) return timeStr
    
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return timeStr
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