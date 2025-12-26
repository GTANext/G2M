/**
 * 统一的类型定义文件
 * 与 Rust 后端的类型定义保持一致
 */

// ==================== API 响应类型 ====================

/**
 * API 响应通用接口
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ==================== 游戏相关类型 ====================

/**
 * 游戏类型枚举
 */
export type GameType = 'gta3' | 'gtavc' | 'gtasa' | 'unknown' | 'other';

/**
 * 游戏信息接口
 */
export interface GameInfo {
  id: number;
  name: string;
  time: string;
  dir: string;
  exe: string;
  img?: string | null;
  type?: GameType | null;
  version?: string | null;
  md5?: string | null;
  deleted?: boolean;
}

/**
 * 游戏检测结果接口
 */
export interface GameDetectionResult {
  success: boolean;
  game_type?: GameType;
  executable?: string;
  game_name?: string;
  version?: string;
  md5?: string;
  error?: string;
}

/**
 * 保存游戏请求接口
 */
export interface SaveGameRequest {
  name: string;
  dir: string;
  exe: string;
  img?: string | null;
  type?: GameType | null;
}

/**
 * 更新游戏请求接口
 */
export interface UpdateGameRequest {
  id: number;
  name?: string;
  dir?: string;
  exe?: string;
  img?: string | null;
  type?: GameType | null;
  deleted?: boolean;
}

// ==================== MOD 相关类型 ====================

/**
 * MOD 加载器状态接口
 */
export interface ModLoaderStatus {
  has_dinput8: boolean;
  has_modloader: boolean;
  has_cleo: boolean;
  has_cleo_redux: boolean;
  missing_loaders: string[];
  found_loaders: string[];
  manual_bindings?: string[];
}

/**
 * MOD 安装请求接口
 */
export interface ModInstallRequest {
  game_dir: string;
  game_type: string;
  components?: string[];
}

/**
 * MOD 安装结果接口
 */
export interface ModInstallResult {
  installed_files: string[];
  created_directories: string[];
}

/**
 * G2M MOD 配置接口
 */
export interface G2MModConfig {
  name: string;
  author?: string | null;
  modfile: ModFileEntry[];
}

/**
 * MOD 文件条目接口
 */
export interface ModFileEntry {
  source: string;
  target: string;
  is_directory: boolean;
}

/**
 * G2M MOD 信息接口
 */
export interface G2MModInfo {
  id: number;
  name: string;
  author?: string | null;
  type?: string | null;
  install_path?: string | null;
}

/**
 * 用户 MOD 安装请求接口
 */
export interface UserModInstallRequest {
  game_dir: string;
  mod_source_path: string;
  mod_name: string;
  overwrite?: boolean;
  target_directory?: string | null;
}

/**
 * 用户 MOD 安装结果接口
 */
export interface UserModInstallResult {
  installed_files: string[];
  created_directories: string[];
}

// ==================== 下载相关类型 ====================

/**
 * 下载记录接口
 */
export interface DownloadRecord {
  id: number;
  url: string;
  file_name: string;
  file_path: string;
  file_size: number;
  download_time: string;
}

// ==================== 前置相关类型 ====================

/**
 * 自定义前置信息接口
 */
export interface CustomPrerequisiteInfo {
  name: string;
  files: CustomPrerequisiteFile[];
  target_dir: string;
}

/**
 * 自定义前置文件接口
 */
export interface CustomPrerequisiteFile {
  file_name: string;
  source_path: string;
  target_path: string;
  is_directory: boolean;
}

/**
 * 自定义前置安装请求接口
 */
export interface CustomPrerequisiteInstallRequest {
  game_dir: string;
  name: string;
  source_paths: string[];
  target_dir: string;
}

// ==================== 应用信息类型 ====================

/**
 * 应用信息接口
 */
export interface AppInfo {
  name: string;
  version: string;
  identifier: string;
  description?: string;
}
