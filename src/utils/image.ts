import { DEFAULT_GAME_IMAGE } from '@/constants/game'

/**
 * 处理图片加载错误
 */
export function handleImageError(event: Event): void {
  const target = event.target as HTMLImageElement
  
  // 避免无限循环
  if (!target.dataset.errorHandled) {
    target.dataset.errorHandled = 'true'
    target.src = DEFAULT_GAME_IMAGE
    console.warn('图片加载失败，使用默认图片:', target.src)
  }
}

/**
 * 预加载图片
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = src
  })
}

/**
 * 检查图片是否存在
 */
export async function checkImageExists(src: string): Promise<boolean> {
  try {
    await preloadImage(src)
    return true
  } catch {
    return false
  }
}