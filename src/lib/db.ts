import type { Provider, QuickTask, TerminalData, AppSettings, Profile } from '../../shared/types'
import { DB_FILES } from '../../shared/types'

interface DbResult<T = unknown> {
    success: boolean
    data?: T
    error?: string
}

// ---- 模型商 ----

export async function getProviders(): Promise<(Provider & { id: string })[]> {
    const res = await window.electronAPI.invoke<DbResult>('db:read', DB_FILES.PROVIDERS)
    if (!res.success) throw new Error(res.error)
    return res.data as (Provider & { id: string })[]
}

export async function saveProviders(providers: Provider[]): Promise<void> {
    const res = await window.electronAPI.invoke<DbResult>('db:write', DB_FILES.PROVIDERS, providers)
    if (!res.success) throw new Error(res.error)
}

export async function addProvider(provider: Provider & { id: string }): Promise<void> {
    const providers = await getProviders()
    providers.push(provider)
    await saveProviders(providers)
}

export async function updateProvider(id: string, updates: Partial<Provider>): Promise<void> {
    const providers = await getProviders()
    const idx = providers.findIndex((p) => p.id === id)
    if (idx !== -1) {
        providers[idx] = { ...providers[idx], ...updates }
        await saveProviders(providers)
    }
}

export async function deleteProvider(id: string): Promise<void> {
    const res = await window.electronAPI.invoke<DbResult>('db:delete', DB_FILES.PROVIDERS, id)
    if (!res.success) throw new Error(res.error)
}

// ---- 任务 ----

export async function getTasks(): Promise<(QuickTask & { id: string })[]> {
    const res = await window.electronAPI.invoke<DbResult>('db:read', DB_FILES.TASKS)
    if (!res.success) throw new Error(res.error)
    return res.data as (QuickTask & { id: string })[]
}

export async function saveTasks(tasks: QuickTask[]): Promise<void> {
    const res = await window.electronAPI.invoke<DbResult>('db:write', DB_FILES.TASKS, tasks)
    if (!res.success) throw new Error(res.error)
}

// ---- 终端状态 ----

export async function getTerminalData(): Promise<TerminalData> {
    const res = await window.electronAPI.invoke<DbResult>('db:read', DB_FILES.TERMINAL)
    if (!res.success) throw new Error(res.error)
    return res.data as TerminalData
}

export async function saveTerminalData(data: TerminalData): Promise<void> {
    const res = await window.electronAPI.invoke<DbResult>('db:write', DB_FILES.TERMINAL, data)
    if (!res.success) throw new Error(res.error)
}

// ---- 应用设置 ----

export async function getSettings(): Promise<AppSettings> {
    const res = await window.electronAPI.invoke<DbResult>('db:read', DB_FILES.SETTINGS)
    if (!res.success) throw new Error(res.error)
    return res.data as AppSettings
}

export async function saveSettings(settings: AppSettings): Promise<void> {
    const res = await window.electronAPI.invoke<DbResult>('db:write', DB_FILES.SETTINGS, settings)
    if (!res.success) throw new Error(res.error)
}

// ---- 环境变量 ----

export async function getEnv(): Promise<Record<string, string>> {
    const res = await window.electronAPI.invoke<DbResult>('db:read', DB_FILES.ENV)
    if (!res.success) throw new Error(res.error)
    return (res.data as Record<string, string>) || {}
}

export async function saveEnv(env: Record<string, string>): Promise<void> {
    const res = await window.electronAPI.invoke<DbResult>('db:write', DB_FILES.ENV, env)
    if (!res.success) throw new Error(res.error)
}

// ---- 配置集 ----

export async function getProfiles(): Promise<Profile[]> {
    const res = await window.electronAPI.invoke<DbResult>('db:read', DB_FILES.PROFILES)
    if (!res.success) throw new Error(res.error)
    return res.data as Profile[]
}

export async function saveProfiles(profiles: Profile[]): Promise<void> {
    const res = await window.electronAPI.invoke<DbResult>('db:write', DB_FILES.PROFILES, profiles)
    if (!res.success) throw new Error(res.error)
}

// ---- 通用 ----

export async function dbRead(file: string): Promise<unknown> {
    const res = await window.electronAPI.invoke<DbResult>('db:read', file)
    if (!res.success) throw new Error(res.error)
    return res.data
}

export async function dbWrite(file: string, data: unknown): Promise<void> {
    const res = await window.electronAPI.invoke<DbResult>('db:write', file, data)
    if (!res.success) throw new Error(res.error)
}

export async function dbDelete(file: string, key?: string): Promise<void> {
    const res = await window.electronAPI.invoke<DbResult>('db:delete', file, key)
    if (!res.success) throw new Error(res.error)
}
