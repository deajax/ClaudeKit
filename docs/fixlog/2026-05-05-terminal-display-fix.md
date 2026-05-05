---
title: 终端显示修复 — 错行与尺寸同步问题
date: 2026-05-05
scope: src/views/TerminalTab.vue
related: electron/ipc/terminal.ts
---

## 问题描述

终端在使用过程中出现错行、文本排版异常等问题，根源在于 xterm.js 与 node-pty 之间的尺寸同步存在三类缺陷：

## 修复内容

### 1. PTY 初始尺寸与实际容器不匹配

**改动前**：`terminal:create` 使用硬编码 `cols: 120, rows: 30`，与实际 DOM 容器尺寸无关。若在 `fitAddon.fit()` 之前有输出到达，排版即产生偏差。

**改动**：新增 `calculateDimensions()` 函数，根据容器 `clientWidth/clientHeight` 和当前 `fontSize` 估算可容纳的字符数，用估算值创建 PTY。

```
const dims = calculateDimensions()
// { cols: Math.floor(width / (fontSize * 0.6)), rows: Math.floor(height / (fontSize * 1.3)) }
```

### 2. 窗口缩放时 resize IPC 过载

**改动前**：`ResizeObserver` 每次触发都立即调用 `fit()` + 发送 `terminal:resize` IPC。窗口拖拽时每秒触发数十次，IPC 异步到达顺序无法保证，导致 PTY 和 xterm 尺寸不同步。

**改动**：ResizeObserver 回调添加 200ms 防抖，缩放停止后只发送一次最终尺寸。

```ts
let resizeTimer: ReturnType<typeof setTimeout> | null = null
resizeObserver = new ResizeObserver(() => {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => { /* fit + resize */ }, 200)
})
```

### 3. 缺少平台特定与排版参数

新增 xterm.js 配置项：

| 参数 | 值 | 作用 |
|------|-----|------|
| `windowsMode: true` | Windows 平台启用 | 优化 PowerShell 行尾处理 |
| `convertEol: true` | 始终启用 | 统一 `\r\n` / `\n` 行尾 |
| `letterSpacing: 0` | 始终 | 避免字符间额外间隙 |
| `lineHeight: 1.1` | 始终 | 稳定行高，减少文字抖动 |

## 改动文件

- [TerminalTab.vue](../../src/views/TerminalTab.vue) — 集中修改文件

## 验证

- [x] TypeScript 类型检查通过（`vue-tsc --noEmit` 无错误）
- [x] 构建通过（`electron-vite build` 成功）
