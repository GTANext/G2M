export const MESSAGE_STYLE = {
  marginTop: '10vh'
} as const

export const NOTIFICATION_STYLE = {
  marginTop: '8vh'
} as const

export const LOADING_MESSAGES = {
  LOADING_GAME: '正在加载游戏信息...',
  LAUNCHING_GAME: '正在启动游戏...',
  SAVING_GAME: '正在保存游戏信息...',
  DETECTING_GAME: '正在检测游戏类型...'
} as const

export const ERROR_MESSAGES = {
  GAME_NOT_FOUND: '游戏未找到',
  INVALID_GAME_ID: '游戏ID不能为空',
  LAUNCH_FAILED: '启动游戏失败',
  SAVE_FAILED: '保存游戏信息失败',
  LOAD_FAILED: '加载游戏信息失败',
  PERMISSION_DENIED: '权限不足，请以管理员身份运行',
  NETWORK_ERROR: '网络连接失败，请检查网络设置'
} as const