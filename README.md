[English](./README_EN.md) | 中文

# ClaudeKit

> 内置终端，切换即开工。不只是切换工具，是 Claude Code 桌面工作台。

![](/images/ScreenShot_2026-04-29_080137_521.png)

## 这是什么

ClaudeKit 是一个 **Claude Code 桌面工作台**。和其他切换工具最大的不同在于：它内置了完整的多标签终端环境，把「切换模型商」和「启动 Claude」合二为一，你不需要跳出应用就能开工。

## 和其他工具有什么不同？

大多数 Claude Code 切换工具做的是环境变量注入——选好模型商，写入环境变量，然后你需要自己打开终端去跑 `claude`。

ClaudeKit 不止于此：**帮你切，也给你一个能直接干活的地方。**

| | 普通切换工具 | ClaudeKit |
|---|---|---|
| 一键切换模型商 | ✅ | ✅ |
| 内置终端，切换即开工 | ❌ 需跳出到外部终端 | ✅ 应用内一键启动 Claude |
| 多标签终端并行工作 | ❌ | ✅ Claude + dev server + test 同时跑 |
| 环境变量隔离 | ❌ 全局生效，易冲突 | ✅ 终端进程级注入，干净隔离 |
| 可视化配置管理 | 部分支持 | ✅ 完整 GUI 配置面板 |
| 新手引导 | ❌ | ✅ 5 步向导，从安装到开工 |
| 余额查询 | 部分支持 | 部分支持 |
| 一键免登录 | 部分支持 | ✅ 自动配置，跳过 Claude Code 登录 |

## 核心原理

Claude Code 通过读取以下环境变量来决定使用哪个模型商和模型：

| 环境变量 | 用途 |
|---|---|
| `ANTHROPIC_BASE_URL` | 模型商 API 端点 |
| `ANTHROPIC_AUTH_TOKEN` | API 认证令牌 |
| `ANTHROPIC_MODEL` | 默认模型 |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | 覆盖 Opus 模型 |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | 覆盖 Sonnet 模型 |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | 覆盖 Haiku 模型 |

ClaudeKit 通过 **node-pty 创建终端进程时注入环境变量**，而不是直接写入 `settings.json`。这样做的好处是：

1. **不污染系统配置** — 环境变量仅在 ClaudeKit 创建的终端会话中生效
2. **避免配置冲突** — settings.json 的 `env` 字段优先级高于 shell 环境变量，两者共存可能互相覆盖
3. **即时生效** — 切换模型商后重启终端即可，无需手动修改文件

另外，ClaudeKit 也支持一键完成 Claude Code 免登录配置（修改 `~/.claude.json` 中的 `hasCompletedOnboarding`），让首次使用更顺畅。

## 技术架构

```
┌──────────────────────────────────────────────────────┐
│                  macOS / Windows                     │
├──────────────────────────────────────────────────────┤
│              Electron Main Process                   │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐         │
│  │  node-pty │  │  fs-extra │  │sudo-prompt│         │
│  │ (终端进程) │  │ (文件操作)  │  │  (提权)   │         │
│  └───────────┘  └───────────┘  └───────────┘         │
│        │               │               │             │
│        └───────────────┼───────────────┘             │
│                        │ IPC Bridge                  │
├────────────────────────┼─────────────────────────────┤
│                        ▼                             │
│            Electron Preload (contextBridge)          │
├────────────────────────┼─────────────────────────────┤
│                        ▼                             │
│                Renderer Process (Vue 3)              │
│  ┌──────────────────────────────────────────────┐    │
│  │  App.vue                                     │    │
│  │  ┌──────┬──────┬──────────────────┐          │    │
│  │  │ Tab1 │ Tab2 │  [+ New Tab]     │          │    │
│  │  ├──────┴──────┴──────────────────┤          │    │
│  │  │ Provider ▼ │ 应用 │ 运行任务     │          │    │
│  │  ├────────────────────────────────┤          │    │
│  │  │     TerminalTab (xterm.js)     │          │    │
│  │  │                                │          │    │
│  │  ├────────────────────────────────┤          │    │
│  │  │ claude 2.x.x         v0.1.0   │           │    │
│  │  └───────────────────────────────────────────┘    │
│  └───────────────────────────────────────────────────┘
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │ xterm.js │  │  Pinia   │  │  Ant Design Vue  │    │
│  │(终端渲染) │  │(状态管理) │  │    (UI 组件)     │     │
│  └──────────┘  └──────────┘  └──────────────────┘    │
└──────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 | 说明 |
|---|---|---|
| 桌面框架 | Electron 33+ | 跨平台桌面应用 |
| 构建工具 | electron-vite 3.x | Vite + Electron 构建 |
| 前端框架 | Vue 3 + TypeScript | 组合式 API |
| UI 组件库 | Ant Design Vue 4.x | 企业级 Vue 组件库 |
| 图标库 | Remix Icons | SVG 图标 |
| CSS 方案 | Tailwind CSS 4 + Less | 原子类为主 |
| 终端模拟 | xterm.js 5.x | VS Code 同款渲染器 |
| 终端进程 | node-pty 1.x | 真正的 TTY 进程 |
| 状态管理 | Pinia 2.x | Vue 3 官方推荐 |
| 数据持久化 | JSON 文件 | `~/.ClaudeKit/` 目录 |
| 提权工具 | sudo-prompt 9.x | 跨平台提权操作 |

### 项目结构

```
ClaudeKit/
├── electron/                    # Electron 主进程
│   ├── main.ts                  # 主进程入口，窗口创建
│   ├── preload.ts               # contextBridge 暴露 API
│   └── ipc/                     # IPC 处理模块
│       ├── db.ts                # JSON 数据库读写
│       ├── terminal.ts          # node-pty 终端管理
│       ├── env.ts               # 环境变量操作
│       ├── config.ts            # 配置文件读写
│       ├── provider.ts          # 模型商管理
│       └── task.ts              # 任务管理
├── src/                         # 渲染进程 (Vue 3)
│   ├── main.ts                  # 入口
│   ├── App.vue                  # 根布局
│   ├── components/              # 核心组件
│   │   ├── Toolbar.vue          # 工具栏
│   │   └── TerminalTab.vue      # 终端标签页
│   ├── views/                   # 功能面板
│   │   ├── SetupWizard.vue      # 首次启动引导
│   │   ├── ProviderConfig.vue   # 模型商配置
│   │   ├── Settings.vue         # 应用设置
│   │   ├── EnvManager.vue       # 环境变量管理
│   │   ├── HelpDocs.vue         # 帮助文档
│   │   ├── TaskDrawer.vue       # 任务抽屉
│   │   └── About.vue            # 关于
│   ├── stores/                  # Pinia 状态
│   │   ├── providers.ts         # 模型商状态
│   │   ├── terminal.ts          # 终端多标签状态
│   │   └── settings.ts          # 应用设置状态
│   ├── lib/                     # 工具函数
│   │   ├── db.ts                # 数据库访问封装
│   │   └── utils.ts             # 通用工具
│   └── help.md                  # 帮助文档源文件
├── shared/                      # 共享类型与常量
│   ├── types.ts
│   └── constants.ts
├── resources/                   # 静态资源
├── package.json
└── electron.vite.config.ts      # 构建配置
```

### 数据持久化

不使用传统数据库，所有数据以 JSON 文件形式存储在 `~/.ClaudeKit/` 目录下：

| 文件 | 用途 |
|---|---|
| `providers.json` | 模型商配置（名称、URL、API Key、模型列表等） |
| `tasks.json` | 快速任务（命令、工作目录等） |
| `settings.json` | 应用设置（主题、字体、Shell 类型等） |
| `terminal.json` | 终端标签页状态 |
| `env.json` | 环境变量管理 |
| `profiles.json` | 快速切换配置集 |

## 功能概览

- **多标签终端** — 基于 xterm.js + node-pty，每个标签页独立会话，支持持久化
- **模型商快速切换** — 工具栏下拉框一键选择模型商和模型，点击「应用」即时生效
- **内置 4 家模型商** — 阿里云百炼、DeepSeek、OpenRouter、硅基流动，开箱即用
- **运行任务** — 预设常用命令（npm dev/build/lint/test），支持自定义增删改查
- **环境变量管理** — macOS 代码编辑器模式 / Windows 表格编辑模式
- **一键免登录** — 自动配置 `~/.claude.json` 跳过 Claude Code 登录向导
- **首次启动引导** — 5 步向导（环境检测 → 安装 Claude → 配置模型商 → 免登录 → 完成）
- **DeepSeek 余额查询** — 手动刷新，显示在底部状态栏
- **版本检查** — 对接 GitHub Releases API，手动检测更新
- **亮暗主题** — 支持 dark / light 切换

## 安装与构建

### 前置要求

- Node.js 18+
- npm 9+
- Claude Code CLI（可选，未安装时可通过引导向导安装）

### 开发模式

```bash
# 克隆仓库
git clone https://github.com/deajax/claudekit.git
cd claudekit

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 构建安装包

```bash
# 构建生产版本
npm run build

# 打包为可安装的应用（macOS .dmg / Windows .exe）
# 通过 electron-builder 完成
npx electron-builder
```

构建产物位于 `out/` 目录。

### 数据目录

用户数据存储在 `~/.ClaudeKit/`，卸载应用不会自动删除此目录，如需清理请手动删除。

## 使用方法

### 切换模型商

1. 在顶部工具栏下拉框中选择模型商
2. 在二级下拉框中选择模型
3. 点击「应用」按钮
4. 终端自动重启，新配置生效

### 启动 Claude Code

1. 确保已选择模型商并点击「应用」
2. 点击终端标签页内的 **▶ Claude** 按钮
3. Claude Code 在终端中启动，按钮变为 ⏹ 停止

### 运行任务

1. 点击「运行任务」按钮
2. 从任务列表中选择要执行的任务
3. 任务在新标签页中执行

### 首次启动引导

首次打开 ClaudeKit 会自动弹出引导向导：

1. **环境检测** — 自动检测 Shell、Node.js、npm
2. **安装 Claude Code** — 未安装则提供一键安装
3. **配置模型商** — 选择模型商并填入 API Key
4. **免登录配置** — 一键跳过 Claude Code 登录
5. **完成** — 进入主界面

之后可通过「设置 → 运行引导向导」重新触发。

### 配置模型商

大多数模型商在各自平台提供 API Key：

- **阿里云百炼** — 阿里云百炼控制台获取
- **DeepSeek** — DeepSeek 开放平台获取，支持余额查询
- **OpenRouter** — OpenRouter 平台获取，需额外设置 `ANTHROPIC_API_KEY=""`
- **硅基流动** — SiliconFlow 平台获取

## 常见问题

### 认证失败 (Authentication Failed)

API Key 未设置或已过期，请检查并重新填入正确的 Key。

### 模型不存在

当前模型商不支持该模型，请确认模型 ID 是否正确。

### 配置冲突

settings.json 和 shell 环境变量同时配置了相同变量，建议只使用 ClaudeKit 注入环境变量的方式，避免手动修改 settings.json 的 `env` 字段。

### Claude Code 未找到

运行 `npm install -g @anthropic-ai/claude-code` 安装，或在引导向导中一键安装。

## 赞赏

写这玩意花了不少Token，如果你觉得这个工具对你有帮助，可以帮我稍微回点血。

<img src="images/IMG_2844.JPG" width="240" />‌‌‌


## 反馈与贡献

- [GitHub Issues](https://github.com/deajax/claudekit/issues)
- [仓库地址](https://github.com/deajax/claudekit)

## License

MIT
