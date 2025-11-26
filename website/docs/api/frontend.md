---
title: 前端 API (Composables)
---

# 前端 API (Composables)

前端提供了多个 Vue Composables，封装了 API 调用逻辑，提供更好的类型安全和错误处理。

## useGameApi

游戏管理相关的 API。

### 导入

```typescript
import { useGameApi } from '@/composables/api/useGameApi'
```

### 使用

```typescript
const gameApi = useGameApi()
```

### API 方法

#### getGames()

获取游戏列表。

```typescript
const response = await gameApi.getGames()
// response.data 包含 GameInfo[] 数组
// games.value 会自动更新
```

**返回类型：**
```typescript
Promise<ApiResponse<GameInfo[]>>
```

**状态：**
- `gameApi.games` - 游戏列表（响应式）
- `gameApi.loadingState.loading` - 加载状态
- `gameApi.loadingState.error` - 错误信息

#### getGameById(id)

根据 ID 获取游戏信息。

```typescript
const response = await gameApi.getGameById(1)
```

**参数：**
- `id: number` - 游戏 ID

**返回类型：**
```typescript
Promise<ApiResponse<GameInfo>>
```

#### saveGame(gameData)

保存游戏信息。

```typescript
const response = await gameApi.saveGame({
  name: 'GTA San Andreas',
  dir: 'C:/Games/GTA_SA',
  exe: 'gta_sa.exe',
  type: 'gtasa'
})
```

**参数：**
```typescript
{
  name: string
  dir: string
  exe: string
  img?: string
  type?: string
  version?: string
}
```

#### updateGame(id, name, dir, exe, img, type, deleted)

更新游戏信息。

```typescript
const response = await gameApi.updateGame(
  1,
  'GTA San Andreas',
  'C:/Games/GTA_SA',
  'gta_sa.exe',
  null,
  'gtasa',
  false
)
```

#### deleteGame(id)

删除游戏。

```typescript
const response = await gameApi.deleteGame(1)
```

#### launchGame(gameDir, executable)

启动游戏。

```typescript
const response = await gameApi.launchGame(
  'C:/Games/GTA_SA',
  'gta_sa.exe'
)
```

#### openGameFolder(dir)

在文件管理器中打开游戏目录。

```typescript
const response = await gameApi.openGameFolder('C:/Games/GTA_SA')
```

#### selectGameFolder()

选择游戏文件夹。

```typescript
const response = await gameApi.selectGameFolder()
// response.data 包含选中的文件夹路径
```

#### detectGame(folderPath)

检测游戏信息。

```typescript
const response = await gameApi.detectGame('C:/Games/GTA_SA')
```

#### checkDuplicateDirectory(dir, excludeGameId?)

检查目录是否重复。

```typescript
const response = await gameApi.checkDuplicateDirectory(
  'C:/Games/GTA_SA',
  1  // 排除的游戏 ID（可选）
)
```

## useModApi

MOD 管理相关的 API。

### 导入

```typescript
import { useModApi } from '@/composables/api/useModApi'
```

### 使用

```typescript
const modApi = useModApi()
```

### 类型定义

```typescript
interface G2MModInfo {
  id: number
  name: string
  author?: string | null
  type?: string | null  // cleo, cleo_redux, modloader, asi, dll
  install_path?: string | null  // 安装路径（变量格式或直接文件名，如 "${cleo}/文件名.cs" 或 "插件.asi"）
}

interface UserModInstallRequest {
  game_dir: string
  mod_source_path: string
  mod_name: string
  overwrite?: boolean
  target_directory?: string
}

interface UserModInstallResult {
  installed_files: string[]
  created_directories: string[]
}
```

### API 方法

#### getGameMods(gameDir)

获取游戏目录下的已安装 MOD 列表。

```typescript
const mods = await modApi.getGameMods('C:/Games/GTA_SA')
// 返回 G2MModInfo[] 数组
```

**参数：**
- `gameDir: string` - 游戏目录路径

**返回类型：**
```typescript
Promise<G2MModInfo[]>
```

#### installUserMod(request)

安装用户 MOD。

```typescript
const result = await modApi.installUserMod({
  game_dir: 'C:/Games/GTA_SA',
  mod_source_path: 'C:/Mods/infinite_money.cs',
  mod_name: '无限金钱',
  overwrite: false
})
```

**参数：**
- `request: UserModInstallRequest`

**返回类型：**
```typescript
Promise<UserModInstallResult | null>
```

**安装逻辑：**
1. 如果 MOD 包含 `g2m.json`，按照配置安装
2. 如果指定了 `target_directory`，安装到指定目录
3. 否则自动检测文件类型并安装

#### selectModFiles(isDirectory)

选择 MOD 文件或文件夹。

```typescript
// 选择文件
const filePath = await modApi.selectModFiles(false)

// 选择文件夹
const folderPath = await modApi.selectModFiles(true)
```

**参数：**
- `isDirectory: boolean` - true 选择文件夹，false 选择文件

**返回类型：**
```typescript
Promise<string | null>
```

#### selectGameInstallDirectory(gameDir)

选择游戏目录中的安装目录。

```typescript
const installDir = await modApi.selectGameInstallDirectory('C:/Games/GTA_SA')
// 返回相对游戏目录的路径，如 "cleo" 或 "modloader"
```

**参数：**
- `gameDir: string` - 游戏目录路径

**返回类型：**
```typescript
Promise<string | null>
```

#### checkModConfig(modDir)

检查 MOD 是否有 `g2m.json` 配置文件。

```typescript
const hasConfig = await modApi.checkModConfig('C:/Mods/my_mod')
```

**参数：**
- `modDir: string` - MOD 目录路径

**返回类型：**
```typescript
Promise<boolean>
```

### 状态

- `modApi.loadingState.loading` - 加载状态
- `modApi.loadingState.error` - 错误信息

## useAppInfo

应用信息相关的 API。

### 导入

```typescript
import { useAppInfo } from '@/composables/api/useApp'
```

### 使用

```typescript
const { appInfo, loading, getAppInfo } = useAppInfo()
```

### API 方法

#### getAppInfo()

获取应用信息。

```typescript
const info = await getAppInfo()
// info 包含 { name, version, identifier, description }
```

**返回类型：**
```typescript
Promise<AppInfo | null>
```

**AppInfo 结构：**
```typescript
interface AppInfo {
  name: string
  version: string
  identifier: string
  description?: string | null
}
```

### 状态

- `appInfo` - 应用信息（响应式）
- `loading` - 加载状态

## useWindowControl

窗口控制相关的功能。

### 导入

```typescript
import { useWindowControl } from '@/composables/api/useApp'
```

### 使用

```typescript
const {
  isMaximized,
  minimizeWindow,
  toggleMaximize,
  closeWindow,
  checkMaximizedState
} = useWindowControl()
```

### API 方法

#### minimizeWindow()

最小化窗口。

```typescript
await minimizeWindow()
```

#### toggleMaximize()

切换最大化/还原窗口。

```typescript
await toggleMaximize()
```

#### closeWindow()

关闭窗口。

```typescript
await closeWindow()
```

#### checkMaximizedState()

检查窗口最大化状态。

```typescript
await checkMaximizedState()
// isMaximized.value 会自动更新
```

### 状态

- `isMaximized` - 窗口是否最大化（响应式）

## 错误处理

所有 composable 都集成了错误处理，会自动显示错误消息。如果需要自定义错误处理，可以捕获异常：

```typescript
try {
  const result = await modApi.installUserMod(request)
  if (!result) {
    // 安装失败
  }
} catch (error) {
  // 处理错误
  console.error('安装失败:', error)
}
```

