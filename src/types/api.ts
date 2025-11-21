// API 响应通用接口
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Tauri 命令调用的通用类型
export type TauriCommand<T = any> = (...args: any[]) => Promise<T>;

// 错误处理类型
export interface AppError {
  code?: string;
  message: string;
  details?: any;
}

// 加载状态类型
export interface LoadingState {
  loading: boolean;
  error: AppError | null;
}

// 分页参数接口
export interface PaginationParams {
  page: number;
  pageSize: number;
}

// 分页响应接口
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 排序参数接口
export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

// 筛选参数接口
export interface FilterParams {
  [key: string]: any;
}

// MOD 加载器状态接口
export interface ModLoaderStatus {
  has_dinput8: boolean;
  has_modloader: boolean;
  has_cleo: boolean;
  has_cleo_redux: boolean;
  missing_loaders: string[];
  found_loaders: string[];
}

// MOD 安装请求接口
export interface ModInstallRequest {
  game_dir: string;
  game_type: string;
  components?: string[]; // 可选的组件列表，如果不提供则安装所有必需组件
}

// MOD 安装结果接口
export interface ModInstallResult {
  installed_files: string[];
  created_directories: string[];
}