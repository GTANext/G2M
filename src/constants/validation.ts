export const FORM_RULES = {
  GAME_NAME: [
    { required: true, message: '请输入游戏名称', trigger: 'blur' },
    { min: 1, max: 100, message: '游戏名称长度应在1-100个字符之间', trigger: 'blur' }
  ],
  GAME_DIR: [
    { required: true, message: '请选择游戏目录', trigger: 'blur' }
  ],
  GAME_EXE: [
    { required: true, message: '请输入启动程序', trigger: 'blur' },
    { pattern: /\.(exe|EXE)$/, message: '启动程序必须是.exe文件', trigger: 'blur' }
  ]
} as const