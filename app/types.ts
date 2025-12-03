// 简化的类型定义，不需要太严格

// API 响应通用接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 游戏信息接口
export interface GameInfo {
  id: number;
  name: string;
  time: string;
  dir: string;
  exe: string;
  img?: string;
  type?: string;
}

// 游戏检测结果接口
export interface GameDetectionResult {
  success: boolean;
  game_type?: string;
  executable?: string;
  game_name?: string;
  error?: string;
}

// MOD 加载器状态接口
export interface ModLoaderStatus {
  has_dinput8?: boolean;
  has_modloader?: boolean;
  has_cleo?: boolean;
  has_cleo_redux?: boolean;
  missing_loaders?: string[];
  found_loaders?: string[];
  [key: string]: any;
}

// MOD 安装请求接口
export interface ModInstallRequest {
  game_dir: string;
  game_type: string;
  components?: string[];
  [key: string]: any;
}

// MOD 安装结果接口
export interface ModInstallResult {
  installed_files?: string[];
  created_directories?: string[];
  [key: string]: any;
}

// 下载记录接口
export interface DownloadRecord {
  id?: number;
  url?: string;
  file_name?: string;
  file_path?: string;
  file_size?: number;
  download_time?: string;
  [key: string]: any;
}

// 自定义前置信息接口
export interface CustomPrerequisiteInfo {
  name: string;
  files?: any[];
  target_dir?: string;
  [key: string]: any;
}
