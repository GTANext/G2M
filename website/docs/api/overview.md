---
title: API 概览
---

# API 概览

GTAModx Manager (G2M) 提供了完整的 API 接口，用于管理 GTA III、VC、SA 的 MOD 和 CLEO 脚本。

## 架构

G2M 采用 Tauri 架构，包含：

- **后端 API (Rust)**: Tauri 命令，处理文件系统操作、游戏检测、MOD 安装等
- **前端 API (TypeScript)**: Vue Composables，提供类型安全的 API 调用封装

## API 分类

### 后端 Tauri 命令

所有后端命令都通过 `tauriInvoke` 调用，返回统一的 `ApiResponse<T>` 格式。

### 前端 Composables

前端提供了多个 composable 函数，封装了 API 调用逻辑，提供更好的类型安全和错误处理。

## 响应格式

所有 API 调用都返回统一的响应格式：

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
```

## 快速开始

### 使用前端 Composables

```typescript
import { useGameApi } from '@/composables/api/useGameApi'
import { useModApi } from '@/composables/api/useModApi'
import { useAppInfo } from '@/composables/api/useApp'

// 获取游戏列表
const gameApi = useGameApi()
const games = await gameApi.getGames()

// 获取 MOD 列表
const modApi = useModApi()
const mods = await modApi.getGameMods(gameDir)

// 获取应用信息
const { getAppInfo } = useAppInfo()
const appInfo = await getAppInfo()
```

### 直接调用 Tauri 命令

```typescript
import { tauriInvoke } from '@/utils/tauri'

const response = await tauriInvoke('get_games')
if (response.success) {
  console.log(response.data)
}
```

