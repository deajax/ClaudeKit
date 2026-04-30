# Changelog

## v0.1.2-beta (2026-04-30)

- fix: extract only first match for gh-pages version update — 修复 Release 工作流中 `grep -oP` 匹配多行导致 sed 报错的问题
- Add Vitest tests & fix env IPC error flag — 添加单元测试框架，修复环境变量 IPC 错误标志位

## v0.1.1-beta

- 初始版本发布
- 应用 Windows 图标并更新打包配置
- 多平台打包支持（macOS x64 + arm64，Windows x64）
- 新增 DeepSeek 余额查询功能
- 新增首次启动引导向导
- 多项 CI 和打包配置修复

## v0.1.0

- Electron + Vue 3 + TypeScript 技术栈
- 模型商快速切换（阿里云百炼、DeepSeek、OpenRouter、硅基流动）
- 基于 node-pty + xterm.js 的终端模拟
- 环境变量管理（macOS 代码编辑器模式 / Windows 表格编辑模式）
- 快速任务管理
- 亮暗主题切换
- 一键免登录配置
