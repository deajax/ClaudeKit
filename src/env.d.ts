/// <reference types="vite/client" />

declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<object, object, unknown>
    export default component
}

type AllowedChannel =
    | 'db:read'
    | 'db:write'
    | 'db:delete'
    | 'db:list'
    | 'terminal:create'
    | 'terminal:destroy'
    | 'terminal:resize'
    | 'terminal:input'
    | 'terminal:list'
    | 'env:read'
    | 'env:write'
    | 'env:list'
    | 'env:read-profile'
    | 'env:write-profile'
    | 'env:export-vars'
    | 'config:read'
    | 'config:write'
    | 'config:read-help'
    | 'provider:list'
    | 'provider:create'
    | 'provider:update'
    | 'provider:delete'
    | 'provider:reset'
    | 'task:list'
    | 'task:create'
    | 'task:update'
    | 'task:delete'
    | 'task:reset'
    | 'system:get-os'
    | 'system:check-claude'
    | 'system:check-node'
    | 'system:check-npm'
    | 'system:install-claude'
    | 'system:check-update'
    | 'system:balance-query'
    | 'system:check-git'
    | 'system:test-provider'

interface ElectronAPI {
    invoke: <T = unknown>(channel: AllowedChannel, ...args: unknown[]) => Promise<T>
    on: (
        channel: string,
        callback: (...args: unknown[]) => void
    ) => () => void
}

interface Window {
    electronAPI: ElectronAPI
}
