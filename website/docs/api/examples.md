---
title: 使用示例
---

# 使用示例

## 基本使用

### 使用 useGameForm 添加游戏（推荐方式）

这是最推荐的方式，提供了完整的表单管理功能。

```typescript
import { useGameForm } from '~/composables/ui/useGameForm'
import { useGameList } from '~/composables/ui/useGameList'
import { useMessage } from '~/composables/ui/useMessage'
import { useNotification } from 'naive-ui'

const { refreshGames } = useGameList()
const { showSuccess, showError } = useMessage()
const notification = useNotification()

const {
  formData,
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

// 1. 选择游戏文件夹（会自动检测游戏信息）
await selectFolder()

// 2. 如果需要，选择游戏图片
if (!imagePreview.value) {
  await selectImage()
}

// 3. 提交表单
try {
  const success = await submitForm()
  if (success) {
    showSuccess('游戏添加成功！')
    await refreshGames() // 刷新游戏列表
    resetForm()
  }
} catch (error) {
  showError('添加游戏失败')
  // 显示详细错误信息（右下角）
  notification.error({
    title: '添加游戏失败',
    content: error instanceof Error ? error.message : String(error),
    duration: 5000,
    placement: 'bottom-right'
  })
}
```

### 获取游戏列表

**方式 1：使用 useGameList（推荐）**

```typescript
import { useGameList } from '~/composables/ui/useGameList'

const { games, isLoading, fetchGames, refreshGames } = useGameList()

// 获取所有游戏
await fetchGames()

// 访问游戏列表
console.log(games.value)
```

**方式 2：使用 useGameApi**

```typescript
import { useGameApi } from '~/composables/api/useGameApi'

const gameApi = useGameApi()

// 获取所有游戏
await gameApi.getGames()

// 访问游戏列表
console.log(gameApi.games.value)
```

### 添加新游戏

**方式 1：使用 useGameForm（推荐）**

```typescript
import { useGameForm } from '~/composables/ui/useGameForm'
import { useGameList } from '~/composables/ui/useGameList'
import { useMessage } from '~/composables/ui/useMessage'
import { useNotification } from 'naive-ui'

const { refreshGames } = useGameList()
const { showSuccess, showError } = useMessage()
const notification = useNotification()

const {
  formData,
  selectFolder,
  submitForm,
  resetForm
} = useGameForm()

// 1. 选择游戏文件夹（会自动检测游戏信息）
await selectFolder()

// 2. 提交表单
try {
  const success = await submitForm()
  if (success) {
    showSuccess('游戏添加成功！')
    await refreshGames() // 刷新游戏列表
    resetForm()
  }
} catch (error) {
  showError('添加游戏失败')
  // 显示详细错误
  notification.error({
    title: '添加游戏失败',
    content: error instanceof Error ? error.message : String(error),
    duration: 5000,
    placement: 'bottom-right'
  })
}
```

**方式 2：使用 useGameApi（手动控制）**

```typescript
import { useGameApi } from '~/composables/api/useGameApi'

const gameApi = useGameApi()

// 1. 选择游戏文件夹
const folderResponse = await gameApi.selectGameFolder()
if (!folderResponse?.success || !folderResponse.data) {
  console.log('用户取消了选择')
  return
}

// 2. 检测游戏信息
const detectResponse = await gameApi.detectGame(folderResponse.data)
if (!detectResponse.success) {
  console.error('检测失败:', detectResponse.error)
  return
}

// 3. 检查目录是否重复
const checkResponse = await gameApi.checkDuplicateDirectory(folderResponse.data)
if (!checkResponse.success) {
  console.error('目录已被使用:', checkResponse.error)
  return
}

// 4. 保存游戏
const saveResponse = await gameApi.saveGame({
  name: detectResponse.data.game_name || 'GTA Game',
  dir: folderResponse.data,
  exe: detectResponse.data.executable || '',
  type: detectResponse.data.type
})

if (saveResponse.success) {
  console.log('游戏添加成功')
  // 刷新游戏列表
  await gameApi.getGames()
}
```

### 启动游戏

**方式 1：使用 useGameList（推荐）**

```typescript
import { useGameList } from '~/composables/ui/useGameList'

const { games, launchGame } = useGameList()

const game = games.value[0]

try {
  await launchGame(game)
  console.log('游戏启动成功')
} catch (error) {
  console.error('启动失败:', error)
}
```

**方式 2：使用 useGameApi**

```typescript
import { useGameApi } from '~/composables/api/useGameApi'

const gameApi = useGameApi()

const game = gameApi.games.value[0]

const response = await gameApi.launchGame(game.dir, game.exe)

if (response.success) {
  console.log('游戏启动成功')
} else {
  console.error('启动失败:', response.error)
}
```

## MOD 管理

### 获取已安装的 MOD 列表

```typescript
import { useModApi } from '~/composables/api/useModApi'

const modApi = useModApi()

const gameDir = 'C:/Games/GTA_SA'
const mods = await modApi.getGameMods(gameDir)

console.log('已安装的 MOD:', mods)
mods.forEach(mod => {
  console.log(`- ${mod.name} (${mod.type})`)
  if (mod.install_path) {
    console.log(`  安装路径: ${mod.install_path}`)
  }
})
```

**注意：** 如果获取失败，`getGameMods` 会返回空数组 `[]`，并自动显示错误消息。

### 安装单个 MOD 文件

```typescript
import { useModApi } from '~/composables/api/useModApi'

const modApi = useModApi()

// 方式1: 选择文件
const filePath = await modApi.selectModFiles(false)
if (!filePath) {
  console.log('用户取消了选择')
  return
}

// 方式2: 直接安装
const result = await modApi.installUserMod({
  game_dir: 'C:/Games/GTA_SA',
  mod_source_path: filePath,
  mod_name: '无限金钱',
  overwrite: false
})

if (result) {
  console.log('安装成功!')
  console.log('已安装文件:', result.installed_files)
  console.log('创建的目录:', result.created_directories)
  // installUserMod 内部已显示成功消息
} else {
  // installUserMod 内部已显示错误消息
  console.log('安装失败')
}
```

### 安装带配置的 MOD

```typescript
import { useModApi } from '~/composables/api/useModApi'

const modApi = useModApi()

// 1. 选择 MOD 文件夹
const modDir = await modApi.selectModFiles(true)
if (!modDir) return

// 2. 检查是否有配置文件
const hasConfig = await modApi.checkModConfig(modDir)
console.log('是否有配置文件:', hasConfig)

// 3. 安装 MOD（如果有 g2m.json，会自动按照配置安装）
const result = await modApi.installUserMod({
  game_dir: 'C:/Games/GTA_SA',
  mod_source_path: modDir,
  mod_name: '我的MOD',
  overwrite: false
})

if (result) {
  // 安装成功，内部已显示成功消息
  console.log('安装成功')
}
```

### 手动指定安装目录

```typescript
import { useModApi } from '~/composables/api/useModApi'

const modApi = useModApi()

// 1. 选择 MOD 文件/文件夹
const modPath = await modApi.selectModFiles(false)
if (!modPath) return

// 2. 选择安装目录
const installDir = await modApi.selectGameInstallDirectory('C:/Games/GTA_SA')
if (!installDir) {
  console.log('用户取消了选择')
  return
}

// 3. 安装到指定目录
const result = await modApi.installUserMod({
  game_dir: 'C:/Games/GTA_SA',
  mod_source_path: modPath,
  mod_name: '我的MOD',
  overwrite: false,
  target_directory: installDir  // 指定安装目录
})

if (result) {
  console.log('安装成功')
}
```

## 应用信息

### 获取应用版本信息

```typescript
import { useAppInfo } from '~/composables/api/useApp'

const { appInfo, getAppInfo } = useAppInfo()

await getAppInfo()

if (appInfo.value) {
  console.log('应用名称:', appInfo.value.name)
  console.log('版本号:', appInfo.value.version)
  console.log('标识符:', appInfo.value.identifier)
}
```

## 窗口控制

### 窗口操作

```typescript
import { useWindowControl } from '~/composables/api/useApp'

const {
  isMaximized,
  minimizeWindow,
  toggleMaximize,
  closeWindow
} = useWindowControl()

// 最小化窗口
await minimizeWindow()

// 切换最大化/还原
await toggleMaximize()

// 关闭窗口
await closeWindow()

// 检查是否最大化
console.log('窗口是否最大化:', isMaximized.value)
```

## 错误处理

### 完整的错误处理示例

```typescript
import { useModApi } from '~/composables/api/useModApi'
import { useMessage } from '~/composables/ui/useMessage'
import { useNotification } from 'naive-ui'

const modApi = useModApi()
const { showError, showSuccess } = useMessage()
const notification = useNotification()

try {
  const result = await modApi.installUserMod({
    game_dir: 'C:/Games/GTA_SA',
    mod_source_path: 'C:/Mods/my_mod.zip',
    mod_name: '我的MOD',
    overwrite: false
  })

  if (result) {
    // installUserMod 内部已显示成功消息，这里不需要重复显示
    // 刷新 MOD 列表
    await modApi.getGameMods('C:/Games/GTA_SA')
  } else {
    // installUserMod 内部已经显示了错误消息
    console.log('安装失败')
  }
} catch (error) {
  // 显示简短错误提示
  showError('安装失败')
  
  // 显示详细错误信息（右下角）
  notification.error({
    title: 'MOD 安装失败',
    content: error instanceof Error ? error.message : String(error),
    duration: 5000,
    placement: 'bottom-right'
  })
}
```

## 组合使用

### 完整的游戏和 MOD 管理流程

```typescript
import { useGameList } from '~/composables/ui/useGameList'
import { useModApi } from '~/composables/api/useModApi'

const { games, fetchGames } = useGameList()
const modApi = useModApi()

// 1. 获取游戏列表
await fetchGames()

// 2. 选择第一个游戏
const game = games.value[0]
if (!game) {
  console.log('没有游戏')
  return
}

// 3. 获取该游戏的 MOD 列表
const mods = await modApi.getGameMods(game.dir)
console.log(`游戏 "${game.name}" 已安装 ${mods.length} 个 MOD`)

// 4. 安装新 MOD
const modPath = await modApi.selectModFiles(false)
if (modPath) {
  const result = await modApi.installUserMod({
    game_dir: game.dir,
    mod_source_path: modPath,
    mod_name: '新MOD',
    overwrite: false
  })

  if (result) {
    // 重新获取 MOD 列表
    const updatedMods = await modApi.getGameMods(game.dir)
    console.log(`现在有 ${updatedMods.length} 个 MOD`)
  }
}
```

