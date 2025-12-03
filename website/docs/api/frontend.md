---
title: 前端 API (Composables)
---

# 前端 API (Composables)

前端提供了多个 Vue Composables，封装了 API 调用逻辑，提供更好的类型安全和错误处理。

## 导入路径

所有 composables 使用 Nuxt 的自动导入，也可以手动导入：

```typescript
// 自动导入（推荐）
const gameApi = useGameApi()

// 或手动导入
import { useGameApi } from '~/composables/api/useGameApi'
```

## useGameApi

游戏管理相关的 API。

### 导入

```typescript
import { useGameApi } from '~/composables/api/useGameApi'
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
// 或传入字符串，会自动转换为数字
const response = await gameApi.getGameById('1')
```

**参数：**
- `id: number | string` - 游戏 ID（会自动转换为 u32 类型）

**返回类型：**
```typescript
Promise<ApiResponse<GameInfo>>
```

**注意：** ID 会自动转换为数字类型，如果转换失败会抛出错误。

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
  1,  // 或 '1'，会自动转换为数字
  'GTA San Andreas',
  'C:/Games/GTA_SA',
  'gta_sa.exe',
  null,
  'gtasa',
  false
)
```

**参数：**
- `id: number | string` - 游戏 ID（会自动转换为 u32 类型）
- `name: string` - 游戏名称
- `dir: string` - 游戏目录
- `exe: string` - 启动程序
- `img: string | null` - 游戏图片
- `type: string` - 游戏类型
- `deleted: boolean` - 是否已删除

#### deleteGame(id)

删除游戏。

```typescript
const response = await gameApi.deleteGame(1)
// 或传入字符串
const response = await gameApi.deleteGame('1')
```

**参数：**
- `id: number | string` - 游戏 ID（会自动转换为 u32 类型）

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

**参数：**
- `dir: string` - 要检查的目录路径
- `excludeGameId?: number` - 排除的游戏 ID（用于编辑游戏时检查）

**返回类型：**
```typescript
Promise<ApiResponse<boolean>>
```

## useGameList

游戏列表管理相关的 Composable，提供更便捷的游戏列表操作。

### 导入

```typescript
import { useGameList } from '~/composables/ui/useGameList'
```

### 使用

```typescript
const { games, isLoading, error, fetchGames, refreshGames, launchGame, openGameFolder } = useGameList()
```

### API 方法

#### fetchGames()

获取游戏列表。

```typescript
await fetchGames()
// games.value 会自动更新
```

#### refreshGames()

刷新游戏列表（与 fetchGames 相同）。

```typescript
await refreshGames()
```

#### launchGame(game)

启动游戏。

```typescript
await launchGame(game)
// game 对象需要包含 dir 和 exe 属性
```

#### openGameFolder(game)

打开游戏文件夹。

```typescript
await openGameFolder(game)
// game 对象需要包含 dir 属性
```

### 状态

- `games` - 游戏列表（响应式 ref）
- `isLoading` - 加载状态（computed）
- `error` - 错误信息（computed）

## useGameForm

游戏表单管理相关的 Composable，用于添加/编辑游戏表单。

### 导入

```typescript
import { useGameForm } from '~/composables/ui/useGameForm'
```

### 使用

```typescript
const {
  formData,
  rules,
  formRef,
  isDetecting,
  detectionResult,
  isAutoDetected,
  imagePreview,
  uploadingImage,
  selectFolder,
  selectImage,
  clearImage,
  submitForm,
  resetForm,
  getGameTypeName
} = useGameForm()
```

### 状态

- `formData` - 表单数据（reactive）
  - `name: string` - 游戏名称
  - `dir: string` - 游戏目录
  - `exe: string` - 启动程序
  - `img: string` - 游戏图片
  - `type: string | undefined` - 游戏类型
- `rules` - 表单验证规则
- `formRef` - 表单引用（用于表单验证）
- `isDetecting` - 是否正在检测游戏
- `detectionResult` - 检测结果
- `isAutoDetected` - 是否自动检测到游戏（computed）
- `imagePreview` - 图片预览 URL
- `uploadingImage` - 是否正在上传图片

### API 方法

#### selectFolder()

选择游戏文件夹，会自动检测游戏信息。

```typescript
await selectFolder()
// 选择后会自动调用 detectGameInFolder
// 如果检测成功，会自动填充 formData
```

#### detectGameInFolder(folderPath)

检测文件夹中的游戏信息。

```typescript
await detectGameInFolder('C:/Games/GTA_SA')
// detectionResult 会自动更新
```

#### selectImage()

选择游戏图片。

```typescript
await selectImage()
// imagePreview 和 formData.img 会自动更新
```

#### clearImage()

清除选中的图片。

```typescript
clearImage()
```

#### submitForm()

提交表单。

```typescript
const success = await submitForm()
if (success) {
  // 提交成功
}
```

**返回类型：**
```typescript
Promise<boolean>
```

**注意：** 成功消息由调用方显示，避免重复消息。

#### resetForm()

重置表单。

```typescript
resetForm()
```

#### getGameTypeName(gameType)

获取游戏类型显示名称。

```typescript
const name = getGameTypeName('gtasa')
// 返回 'GTA San Andreas'
```

## useModApi

MOD 管理相关的 API。

### 导入

```typescript
import { useModApi } from '~/composables/api/useModApi'
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

## useMessage

消息提示相关的 Composable，使用 notyf 显示消息。

### 导入

```typescript
import { useMessage } from '~/composables/ui/useMessage'
```

### 使用

```typescript
const { showError, showSuccess, showWarning, showInfo, showLoading } = useMessage()
```

### API 方法

#### showError(content, options?)

显示错误消息。

```typescript
showError('操作失败')
// 带详细错误信息
showError('操作失败', { detail: '详细错误信息' })
```

#### showSuccess(content, options?)

显示成功消息。

```typescript
showSuccess('操作成功')
```

#### showWarning(content, options?)

显示警告消息。

```typescript
showWarning('请注意')
```

#### showInfo(content, options?)

显示信息消息。

```typescript
showInfo('提示信息')
```

#### showLoading(content, duration?, key?)

显示加载消息。

```typescript
const loading = showLoading('正在处理...', 0)
// 关闭
loading.close()
```

### 选项

```typescript
interface MessageOptions {
  duration?: number  // 显示时长（毫秒），默认 3000
  onClose?: () => void  // 关闭回调
  detail?: unknown  // 详细信息（会追加到消息内容中）
}
```

## useNotification

详细错误通知，使用 Naive UI 的 notification 在右下角显示。

### 导入

```typescript
import { useNotification } from 'naive-ui'
```

### 使用

```typescript
const notification = useNotification()

// 显示错误通知
notification.error({
  title: '操作失败',
  content: '详细错误信息',
  duration: 5000,
  placement: 'bottom-right'
})
```

**注意：** 需要在 `app.vue` 中配置 `NNotificationProvider`。

### 使用示例

```typescript
import { useNotification } from 'naive-ui'

const notification = useNotification()

// 显示错误通知
notification.error({
  title: '操作失败',
  content: '详细错误信息',
  duration: 5000,
  placement: 'bottom-right'
})

// 显示成功通知
notification.success({
  title: '操作成功',
  content: '操作已完成',
  duration: 3000,
  placement: 'bottom-right'
})

// 显示警告通知
notification.warning({
  title: '警告',
  content: '请注意',
  duration: 4000,
  placement: 'bottom-right'
})

// 显示信息通知
notification.info({
  title: '提示',
  content: '这是一条信息',
  duration: 3000,
  placement: 'bottom-right'
})
```

## useAppInfo

应用信息相关的 API。

### 导入

```typescript
import { useAppInfo } from '~/composables/api/useApp'
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
import { useWindowControl } from '~/composables/api/useApp'
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

### 自动错误处理

所有 composable 都集成了错误处理，会自动显示错误消息（使用 `useMessage` 的 `showError`）。

### 自定义错误处理

如果需要自定义错误处理，可以捕获异常并使用 `useNotification` 显示详细错误：

```typescript
import { useMessage } from '~/composables/ui/useMessage'
import { useNotification } from 'naive-ui'

const { showError } = useMessage()
const notification = useNotification()

try {
  const result = await modApi.installUserMod(request)
  if (!result) {
    // 安装失败（内部已显示错误消息）
  }
} catch (error) {
  // 显示简短错误提示
  showError('安装失败')
  
  // 显示详细错误信息（右下角）
  notification.error({
    title: '安装失败',
    content: error instanceof Error ? error.message : String(error),
    duration: 5000,
    placement: 'bottom-right'
  })
}
```

### 错误处理最佳实践

1. **简短错误**：使用 `useMessage` 的 `showError` 显示简短错误提示
2. **详细错误**：使用 `useNotification` 的 `notification.error` 在右下角显示详细错误信息
3. **成功消息**：使用 `useMessage` 的 `showSuccess` 显示成功提示
4. **避免重复**：确保不在多个地方显示相同的消息

