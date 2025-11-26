---
title: 后端 API (Tauri Commands)
---

# 后端 API (Tauri Commands)

所有后端 API 都是 Tauri 命令，通过 `tauriInvoke` 调用。

## 应用信息

### get_app_info

获取应用程序信息（版本号、标识符等）。

**调用方式：**
```typescript
const response = await tauriInvoke('get_app_info')
```

**返回类型：**
```typescript
ApiResponse<{
  name: string           // 应用名称
  version: string        // 版本号
  identifier: string     // 应用标识符
  description?: string  // 应用描述
}>
```

## 游戏管理

### get_games

获取所有游戏列表。

**调用方式：**
```typescript
const response = await tauriInvoke('get_games')
```

**返回类型：**
```typescript
ApiResponse<GameInfo[]>
```

**GameInfo 结构：**
```typescript
interface GameInfo {
  id: number
  name: string
  time: string
  dir: string
  exe: string
  img?: string
  type?: string        // 游戏类型: gta3, gtavc, gtasa
  version?: string      // 游戏版本: 1.0, 1.1, steam, diy
  md5?: string          // 主程序文件的MD5值
  deleted: boolean      // 软删除标记
}
```

### get_game_by_id

根据 ID 获取游戏信息。

**调用方式：**
```typescript
const response = await tauriInvoke('get_game_by_id', { id: 1 })
```

**参数：**
- `id: number` - 游戏 ID

**返回类型：**
```typescript
ApiResponse<GameInfo>
```

### save_game

保存游戏信息。

**调用方式：**
```typescript
const response = await tauriInvoke('save_game', {
  name: string
  dir: string
  exe: string
  img?: string
  type?: string
  version?: string
})
```

**返回类型：**
```typescript
ApiResponse<GameInfo>
```

### update_game

更新游戏信息。

**调用方式：**
```typescript
const response = await tauriInvoke('update_game', {
  id: number
  name?: string
  dir?: string
  exe?: string
  img?: string
  type?: string
  deleted?: boolean
})
```

**返回类型：**
```typescript
ApiResponse<GameInfo>
```

### delete_game

删除游戏（软删除）。

**调用方式：**
```typescript
const response = await tauriInvoke('delete_game', { id: 1 })
```

**参数：**
- `id: number` - 游戏 ID

**返回类型：**
```typescript
ApiResponse<()>
```

### launch_game

启动游戏。

**调用方式：**
```typescript
const response = await tauriInvoke('launch_game', {
  gameDir: string
  executable: string
  runAsAdmin?: boolean
})
```

**参数：**
- `gameDir: string` - 游戏目录路径
- `executable: string` - 可执行文件名
- `runAsAdmin?: boolean` - 是否以管理员权限运行

**返回类型：**
```typescript
ApiResponse<()>
```

### open_game_folder

在文件管理器中打开游戏目录。

**调用方式：**
```typescript
const response = await tauriInvoke('open_game_folder', { gameDir: string })
```

**参数：**
- `gameDir: string` - 游戏目录路径

**返回类型：**
```typescript
ApiResponse<()>
```

### select_game_folder

选择游戏文件夹。

**调用方式：**
```typescript
const response = await tauriInvoke('select_game_folder')
```

**返回类型：**
```typescript
ApiResponse<string | null>  // 返回选中的文件夹路径，取消则返回 null
```

### detect_game

检测游戏信息。

**调用方式：**
```typescript
const response = await tauriInvoke('detect_game', { path: string })
```

**参数：**
- `path: string` - 游戏目录路径

**返回类型：**
```typescript
ApiResponse<{
  success: boolean
  type?: string        // 游戏类型
  executable?: string  // 可执行文件名
  game_name?: string   // 游戏名称
  version?: string     // 游戏版本
  md5?: string         // MD5值
  error?: string
}>
```

### check_duplicate_directory

检查目录是否已被其他游戏使用。

**调用方式：**
```typescript
const response = await tauriInvoke('check_duplicate_directory', {
  dir: string
  excludeGameId?: number
})
```

**参数：**
- `dir: string` - 要检查的目录路径
- `excludeGameId?: number` - 排除的游戏 ID（用于更新时检查）

**返回类型：**
```typescript
ApiResponse<{
  is_duplicate: boolean
  existing_game_id?: number
  existing_game_name?: string
}>
```

## MOD 管理

### get_game_mods

获取游戏目录下的已安装 MOD 列表。

**调用方式：**
```typescript
const response = await tauriInvoke('get_game_mods', { gameDir: string })
```

**参数：**
- `gameDir: string` - 游戏目录路径

**返回类型：**
```typescript
ApiResponse<G2MModInfo[]>
```

**G2MModInfo 结构：**
```typescript
interface G2MModInfo {
  id: number              // MOD唯一ID（数字）
  name: string            // MOD名称
  author?: string         // 作者信息
  type?: string           // 安装类型: cleo, cleo_redux, modloader, asi, dll
  install_path?: string   // 安装路径（变量格式或直接文件名，如 "${cleo}/文件名.cs" 或 "插件.asi"）
}
```

### install_user_mod

安装用户 MOD。

**调用方式：**
```typescript
const response = await tauriInvoke('install_user_mod', {
  request: {
    game_dir: string
    mod_source_path: string
    mod_name: string
    overwrite?: boolean
    target_directory?: string  // 目标安装目录（相对游戏目录的路径）
  }
})
```

**参数：**
- `request.game_dir: string` - 游戏目录路径
- `request.mod_source_path: string` - MOD 源路径（文件或文件夹）
- `request.mod_name: string` - MOD 名称
- `request.overwrite?: boolean` - 是否覆盖冲突文件
- `request.target_directory?: string` - 用户手动选择的安装目录（相对游戏目录）

**返回类型：**
```typescript
ApiResponse<{
  installed_files: string[]        // 已安装的文件列表（相对游戏目录）
  created_directories: string[]    // 创建的目录列表（相对游戏目录）
}>
```

**安装逻辑：**
1. 如果 MOD 包含 `g2m.json` 配置文件，按照配置安装
2. 如果用户指定了 `target_directory`，安装到指定目录
3. 否则自动检测文件类型并安装：
   - `.cs` 文件 → `CLEO/` 或 `cleo/` 目录
   - `.js/.ts` 文件 → `plugins/CLEO/` 目录（CLEO Redux）
   - 贴图/模型文件 → `modloader/[MOD名称]/` 目录
   - 其他文件 → `modloader/[MOD名称]/` 目录

### read_g2m_mod_config

读取 MOD 的 `g2m.json` 配置文件。

**调用方式：**
```typescript
const response = await tauriInvoke('read_g2m_mod_config', { modDir: string })
```

**参数：**
- `modDir: string` - MOD 目录路径

**返回类型：**
```typescript
ApiResponse<G2MModConfig | null>
```

### save_g2m_mod_config

保存 MOD 的 `g2m.json` 配置文件。

**调用方式：**
```typescript
const response = await tauriInvoke('save_g2m_mod_config', {
  modDir: string
  config: G2MModConfig
})
```

### get_mod_file_tree

获取 MOD 文件树结构。

**调用方式：**
```typescript
const response = await tauriInvoke('get_mod_file_tree', { modDir: string })
```

### select_mod_files

选择 MOD 文件或文件夹。

**调用方式：**
```typescript
const response = await tauriInvoke('select_mod_files', {
  defaultDir?: string | null
  isDirectory: boolean
})
```

**参数：**
- `defaultDir?: string | null` - 默认目录
- `isDirectory: boolean` - 是否选择文件夹（true）或文件（false）

**返回类型：**
```typescript
ApiResponse<string[]>  // 返回选中的文件/文件夹路径数组
```

### select_game_install_directory

选择游戏目录中的安装目录（返回相对游戏目录的路径）。

**调用方式：**
```typescript
const response = await tauriInvoke('select_game_install_directory', {
  gameDir: string
})
```

**参数：**
- `gameDir: string` - 游戏目录路径

**返回类型：**
```typescript
ApiResponse<string | null>  // 返回相对游戏目录的路径
```

## 游戏图片管理

### select_image_file

选择图片文件。

**调用方式：**
```typescript
const response = await tauriInvoke('select_image_file')
```

**返回类型：**
```typescript
ApiResponse<string | null>  // 返回选中的图片文件路径
```

### copy_game_image

复制游戏图片到配置目录。

**调用方式：**
```typescript
const response = await tauriInvoke('copy_game_image', {
  gameDir: string
  imagePath: string
})
```

**返回类型：**
```typescript
ApiResponse<{
  image_path: string
}>
```

### process_image_upload

处理图片上传（Base64）。

**调用方式：**
```typescript
const response = await tauriInvoke('process_image_upload', {
  gameDir: string
  base64Data: string
  fileName: string
})
```

### save_base64_image

保存 Base64 图片。

**调用方式：**
```typescript
const response = await tauriInvoke('save_base64_image', {
  gameDir: string
  base64Data: string
  fileName: string
})
```

### copy_image_to_custom_dir

复制图片到自定义目录。

**调用方式：**
```typescript
const response = await tauriInvoke('copy_image_to_custom_dir', {
  sourcePath: string
  targetDir: string
  fileName: string
})
```

## MOD 前置组件管理

### check_mod_loaders

检查游戏目录中的 MOD 加载器状态。

**调用方式：**
```typescript
const response = await tauriInvoke('check_mod_loaders', { gameDir: string })
```

**返回类型：**
```typescript
ApiResponse<{
  has_dinput8: boolean
  has_cleo: boolean
  has_modloader: boolean
  cleo_path?: string
  modloader_path?: string
}>
```

### install_mod_prerequisites

安装 MOD 前置组件（CLEO、ModLoader 等）。

**调用方式：**
```typescript
const response = await tauriInvoke('install_mod_prerequisites', {
  gameDir: string
  gameType: string
  components?: string[]  // 可选: ["dinput8", "cleo", "modloader"]
})
```

**参数：**
- `gameDir: string` - 游戏目录路径
- `gameType: string` - 游戏类型: "gta3", "gtavc", "gtasa"
- `components?: string[]` - 要安装的组件列表

**返回类型：**
```typescript
ApiResponse<{
  installed_files: string[]
  created_directories: string[]
}>
```

### select_mod_loader_file

选择 MOD 加载器文件。

**调用方式：**
```typescript
const response = await tauriInvoke('select_mod_loader_file')
```

### mark_mod_loader_manual

标记 MOD 加载器为手动安装。

**调用方式：**
```typescript
const response = await tauriInvoke('mark_mod_loader_manual', {
  gameDir: string
  loaderType: string  // "cleo" 或 "modloader"
})
```

### unmark_mod_loader_manual

取消标记 MOD 加载器为手动安装。

**调用方式：**
```typescript
const response = await tauriInvoke('unmark_mod_loader_manual', {
  gameDir: string
  loaderType: string
})
```

### install_custom_prerequisite

安装自定义前置组件。

**调用方式：**
```typescript
const response = await tauriInvoke('install_custom_prerequisite', {
  gameDir: string
  name: string
  files: string[]
})
```

### get_custom_prerequisites

获取自定义前置组件列表。

**调用方式：**
```typescript
const response = await tauriInvoke('get_custom_prerequisites', { gameDir: string })
```

### delete_custom_prerequisite

删除自定义前置组件。

**调用方式：**
```typescript
const response = await tauriInvoke('delete_custom_prerequisite', {
  gameDir: string
  name: string
})
```

### select_custom_prerequisite_files

选择自定义前置组件文件。

**调用方式：**
```typescript
const response = await tauriInvoke('select_custom_prerequisite_files')
```

### check_game_directories

检查游戏目录结构。

**调用方式：**
```typescript
const response = await tauriInvoke('check_game_directories', { gameDir: string })
```

## 游戏下载与解压

### download_game

下载游戏文件。

**调用方式：**
```typescript
const response = await tauriInvoke('download_game', {
  url: string
  savePath: string
  gameName: string
})
```

### cancel_download

取消下载。

**调用方式：**
```typescript
const response = await tauriInvoke('cancel_download', { downloadId: string })
```

### extract_game

解压游戏文件。

**调用方式：**
```typescript
const response = await tauriInvoke('extract_game', {
  archivePath: string
  extractPath: string
  gameName: string
})
```

### get_download_records

获取下载记录。

**调用方式：**
```typescript
const response = await tauriInvoke('get_download_records')
```

### get_extract_records

获取解压记录。

**调用方式：**
```typescript
const response = await tauriInvoke('get_extract_records')
```

### select_extract_folder

选择解压文件夹。

**调用方式：**
```typescript
const response = await tauriInvoke('select_extract_folder')
```

