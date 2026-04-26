"use strict";
const electron = require("electron");
const ALLOWED_CHANNELS = [
  // 数据库操作
  "db:read",
  "db:write",
  "db:delete",
  "db:list",
  // 终端操作（Phase 3）
  "terminal:create",
  "terminal:destroy",
  "terminal:resize",
  "terminal:input",
  "terminal:list",
  // 环境变量操作（Phase 4）
  "env:read",
  "env:write",
  "env:list",
  "env:read-profile",
  "env:write-profile",
  // 配置操作（Phase 4）
  "config:read",
  "config:write",
  "config:read-help",
  // 模型商操作（Phase 2）
  "provider:list",
  "provider:create",
  "provider:update",
  "provider:delete",
  "provider:reset",
  // 任务操作（Phase 3）
  "task:list",
  "task:create",
  "task:update",
  "task:delete",
  "task:reset",
  // 系统操作
  "system:get-os",
  "system:check-claude",
  "system:check-node",
  "system:check-npm",
  "system:check-git",
  "system:install-claude",
  "system:check-update",
  "system:balance-query",
  "system:test-provider"
];
const api = {
  invoke: (channel, ...args) => {
    if (ALLOWED_CHANNELS.includes(channel)) {
      return electron.ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`不允许的 IPC 通道: ${channel}`));
  },
  on: (channel, callback) => {
    const validChannels = ["terminal:output", "terminal:exit"];
    if (validChannels.includes(channel)) {
      const subscription = (_event, ...args) => callback(...args);
      electron.ipcRenderer.on(channel, subscription);
      return () => {
        electron.ipcRenderer.removeListener(channel, subscription);
      };
    }
    return () => {
    };
  }
};
electron.contextBridge.exposeInMainWorld("electronAPI", api);
