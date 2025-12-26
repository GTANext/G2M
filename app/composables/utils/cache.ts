interface CacheItem<T> {
  value: T
  timestamp: number
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>()

  set<T>(key: string, value: T, duration: number = 5 * 60 * 1000): void {
    const timestamp = Date.now() + duration
    this.cache.set(key, { value, timestamp })
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    if (Date.now() > cached.timestamp) {
      this.cache.delete(key)
      return null
    }

    return cached.value as T
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }
}

export const memoryCache = new MemoryCache()

