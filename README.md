
# G2M
GTA Mod Manager，给 III、VC、SA 用的

## 功能
- 导入 Mod（.zip / .rar / .7z）
- 启用/禁用 Mod
- 自动识别 Mod 类型（ModLoader / CLEO / ASI）
- 冲突检测（到文件级）
- 自定义游戏封面
- 支持黑白主题

## 目录结构
程序目录：
```
g2m.exe
assets/
└── custom/
config/
└── database.db
```

游戏目录：
```
GTA SA/
├── G2M/
│   └── mods/
├── modloader/
├── cleo/
├── plugins/
└── CLEO/
```

## 开发
前置：
- Node 20+
- Rust 1.80+
- pnpm

```bash
# 安装前端依赖
pnpm install

# 开发模式（Tauri 窗口）
pnpm g2m:dev

# 打包构建
pnpm g2m:build
```

## 技术栈
- 前端：React + TypeScript + Vite + shadcn/ui + TailwindCSS
- 后端：Tauri 2 + Rust
- 数据库：SQLite (rusqlite)

## 使用说明
1. 添加游戏：选目录，自动识别 EXE 和类型
2. 导入 Mod：把压缩包拖进去或选文件
3. 启用/禁用：开关控制，用软链接，不复制原文件
4. 冲突：会提示哪两个 Mod 的哪几个文件冲突
5. 封面：可以用默认的，也可以自己选图

