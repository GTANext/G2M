G2M（GTAModxManager）

项目定位

一个专为 GTA 三部曲（III、VC、SA）设计的现代化 Mod 管理器。

核心功能：

导入 Mod

自动识别 Mod 类型

启用 Mod

禁用 Mod

管理 Mod 冲突


不负责：

Mod 下载

Mod 商店

Mod 社区

GTAMODX 联动



---

技术栈

Frontend

React
TypeScript
Vite
shadcn/ui
TailwindCSS

Backend

Tauri 2
Rust

Database

SQLite


---

核心原则

不要复制文件

全部使用软链接

Mods
    ↓
Symlink
    ↓
Game


---

目录结构

程序目录

g2m.exe
assets/
└── custom/
config/
└── database.db


---

游戏目录

GTA SA/

├── G2M/
│   └── mods/
├── modloader/
├── cleo/
├── plugins/
└── CLEO/


---

Mod存储格式

用户导入：

HD Cars.zip

解压后：

GTA SA/

└── G2M/
    └── mods/
        └── HD Cars/


---

数据库记录：

{
  "id": "hdcars",
  "name": "HD Cars",
  "enabled": true
}


---

Mod类型识别

自动扫描扩展名。

ModLoader

.dff
.txd
.col
.ifp
.ide
.ipl
.dat

目标：

modloader/


---

CLEO

.cs
.cleo

目标：

cleo/


---

CLEO Redux

.js
.ts

目标：

CLEO/


---

ASI

.asi
.dll

目标：

plugins/


---

安装逻辑

例如：

GTA SA/

└── G2M/
    └── mods/
        └── Teleport/
            └── teleport.cs

启用时：

cleo/teleport.cs
    ↓
symlink
    ↓
G2M/mods/Teleport/teleport.cs


---

禁用时：

删除软链接

即可。


---

不需要让用户选目录

AI最容易写的方案：

扫描全部文件。

例如：

SuperPack/

├── teleport.cs
├── SilentPatch.asi
├── infernus.dff
└── infernus.txd

自动分析：

teleport.cs
    ↓
cleo

SilentPatch.asi
    ↓
plugins

infernus.dff
    ↓
modloader

infernus.txd
    ↓
modloader

用户只点：

导入

即可。


---

数据库

当前先用三张表。

games

CREATE TABLE games (
    id TEXT PRIMARY KEY,
    game_type TEXT,
    name TEXT,
    path TEXT,
    exe_name TEXT,
    version TEXT,
    image_path TEXT,
    created_at INTEGER,
    updated_at INTEGER
);


---

游戏配置也直接放数据库。

不再使用 settings.json。

封面图：

默认使用：

/images/gta3.jpg
/images/gtasa.jpg
/images/gtavc.jpg

自定义封面：

复制到 assets/custom/

命名：

{type}-随机字符串.后缀

games 表还要记录：

created_at
updated_at


---

mods

CREATE TABLE mods (
    id TEXT PRIMARY KEY,
    name TEXT,
    enabled INTEGER
);


---

files

CREATE TABLE files (
    id INTEGER PRIMARY KEY,
    mod_id TEXT,
    source_path TEXT,
    target_path TEXT
);

例如：

source:
G2M/mods/Teleport/teleport.cs

target:
cleo/teleport.cs


---

UI页面

侧边栏

游戏

GTA SA
GTA VC
GTA III


---

主界面

Mods

☑ HD Cars

☑ SilentPatch

☒ Teleport


---

顶部按钮

导入Mod

刷新

打开游戏目录


---

详情面板

名称

类型

文件数量

冲突数量


---

冲突系统（第一版）

不要做优先级。

太复杂。

只提示，但提示内容要细化到文件级。

例如：

HD Cars

infernus.dff

发现：

Real Cars

infernus.dff

提示：

发现冲突

文件名:
infernus.dff

目标路径:
modloader/infernus.dff

当前 Mod:
HD Cars

冲突 Mod:
Real Cars

让用户自己决定。


---

MVP开发顺序

第一周：

游戏目录设置
SQLite
Mod列表


---

第二周：

ZIP导入
RAR导入
7Z导入


---

第三周：

文件扫描
类型识别
数据库写入


---

第四周：

软链接部署
启用
禁用


---

第五周：

冲突检测
搜索
排序
