import { contextBridge, ipcRenderer } from 'electron'

const ALLOWED_CHANNELS = [
    // 数据库操作
    'db:read',
    'db:write',
    'db:delete',
    'db:list',
    // 终端操作（Phase 3）
    'terminal:create',
    'terminal:destroy',
    'terminal:resize',
    'terminal:input',
    'terminal:list',
    // 环境变量操作（Phase 4）
    'env:read',
    'env:write',
    'env:list',
    'env:read-profile',
    'env:write-profile',
    'env:export-vars',
    'env:save-user-vars',
    // 配置操作（Phase 4）
    'config:read',
    'config:write',
    'config:read-help',
    'dialog:open-folder',
    // 模型商操作（Phase 2）
    'provider:list',
    'provider:create',
    'provider:update',
    'provider:delete',
    'provider:reset',
    // 任务操作（Phase 3）
    'task:list',
    'task:create',
    'task:update',
    'task:delete',
    'task:reset',
    // 窗口控制
    'window:minimize',
    'window:maximize',
    'window:close',
    // 系统操作
    'system:get-os',
    'system:check-claude',
    'system:check-node',
    'system:check-npm',
    'system:check-git',
    'system:install-claude',
    'system:config-git-env',
    'system:check-update',
    'system:balance-query',
    'system:test-provider'
] as const

type AllowedChannel = (typeof ALLOWED_CHANNELS)[number]

const api = {
    invoke: <T = unknown>(channel: AllowedChannel, ...args: unknown[]): Promise<T> => {
        if (ALLOWED_CHANNELS.includes(channel)) {
            return ipcRenderer.invoke(channel, ...args) as Promise<T>
        }
        return Promise.reject(new Error(`不允许的 IPC 通道: ${channel}`))
    },

    on: (channel: string, callback: (...args: unknown[]) => void) => {
        const validChannels = ['terminal:output', 'terminal:exit']
        if (validChannels.includes(channel)) {
            const subscription = (
                _event: Electron.IpcRendererEvent,
                ...args: unknown[]
            ): void => callback(...args)
            ipcRenderer.on(channel, subscription)
            return () => {
                ipcRenderer.removeListener(channel, subscription)
            }
        }
        return () => {}
    }
}

contextBridge.exposeInMainWorld('electronAPI', api)
