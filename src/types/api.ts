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