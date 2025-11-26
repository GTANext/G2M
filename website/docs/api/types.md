---
title: 类型定义
---

# 类型定义

## 通用类型

### ApiResponse

所有 API 调用的统一响应格式。

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
```

## 游戏相关类型

### GameInfo

游戏信息。

```typescript
interface GameInfo {
  id: number              // 游戏唯一ID
  name: string            // 游戏名称
  time: string            // 添加时间
  dir: string             // 游戏目录路径
  exe: string             // 可执行文件名
  img?: string            // 游戏图片路径
  type?: string           // 游戏类型: "gta3", "gtavc", "gtasa"
  version?: string        // 游戏版本: "1.0", "1.1", "steam", "diy"
  md5?: string            // 主程序文件的MD5值
  deleted: boolean         // 软删除标记
}
```

### GameDetectionResult

游戏检测结果。

```typescript
interface GameDetectionResult {
  success: boolean
  type?: string           // 游戏类型
  executable?: string     // 可执行文件名
  game_name?: string      // 游戏名称
  version?: string        // 游戏版本
  md5?: string            // MD5值
  error?: string          // 错误信息
}
```

## MOD 相关类型

### G2MModInfo

已安装的 MOD 信息。

```typescript
interface G2MModInfo {
  id: number              // MOD唯一ID（数字）
  name: string            // MOD名称
  author?: string | null  // 作者信息
  type?: string | null    // 安装类型: "cleo", "cleo_redux", "modloader", "asi", "dll"
  install_path?: string | null  // 安装路径（变量格式或直接文件名）
}
```

**install_path 格式说明：**

使用变量格式表示安装路径，规则如下：

**需要变量格式的情况：**

- `"${cleo}/无限金钱.cs"` - 安装在 CLEO 目录
- `"${cleo_redux}/脚本.js"` - 安装在 CLEO Redux 目录
- `"${modloader}/模型.dff"` - 安装在 ModLoader 目录
- `"${plugins}/插件.asi"` - 安装在 plugins 目录
- `"${scripts}/插件.asi"` - 安装在 scripts 目录

**直接文件名（游戏根目录）：**

- `"插件.asi"` - 安装在游戏根目录（ASI 文件，不需要变量）
- `"插件.dll"` - 安装在游戏根目录（DLL 文件，不需要变量）

### UserModInstallRequest

MOD 安装请求。

```typescript
interface UserModInstallRequest {
  game_dir: string                    // 游戏目录
  mod_source_path: string             // MOD源路径（文件或文件夹）
  mod_name: string                    // MOD名称
  overwrite?: boolean                  // 是否覆盖冲突文件
  target_directory?: string            // 目标安装目录（相对游戏目录的路径）
}
```

### UserModInstallResult

MOD 安装结果。

```typescript
interface UserModInstallResult {
  installed_files: string[]           // 已安装的文件列表（相对游戏目录）
  created_directories: string[]       // 创建的目录列表（相对游戏目录）
}
```

### G2MModConfig

MOD 配置文件结构（`g2m.json`）。

```typescript
interface G2MModConfig {
  name: string                        // MOD名称
  author?: string                     // 作者
  version?: string                    // 版本
  description?: string                // 描述
  modfile: Array<{                    // 文件列表
    source: string                     // 源文件路径（相对MOD根目录）
    target: string                     // 目标路径（相对游戏目录）
  }>
}
```

## 应用信息类型

### AppInfo

应用信息。

```typescript
interface AppInfo {
  name: string            // 应用名称
  version: string        // 版本号
  identifier: string      // 应用标识符
  description?: string    // 应用描述
}
```

## MOD 加载器类型

### ModLoaderStatus

MOD 加载器状态。

```typescript
interface ModLoaderStatus {
  has_dinput8: boolean
  has_cleo: boolean
  has_modloader: boolean
  cleo_path?: string
  modloader_path?: string
}
```

## 图片相关类型

### CopyImageResponse

复制图片响应。

```typescript
interface CopyImageResponse {
  image_path: string      // 图片路径
}
```

## 下载相关类型

### DownloadRecord

下载记录。

```typescript
interface DownloadRecord {
  id: string
  url: string
  save_path: string
  game_name: string
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled'
  progress?: number
  error?: string
  created_at: string
  updated_at: string
}
```

### ExtractRecord

解压记录。

```typescript
interface ExtractRecord {
  id: string
  archive_path: string
  extract_path: string
  game_name: string
  status: 'pending' | 'extracting' | 'completed' | 'failed'
  progress?: number
  error?: string
  created_at: string
  updated_at: string
}
```

## 目录检查类型

### DuplicateCheckResult

目录重复检查结果。

```typescript
interface DuplicateCheckResult {
  is_duplicate: boolean
  existing_game_id?: number
  existing_game_name?: string
}
```
