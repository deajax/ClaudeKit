import { ipcMain } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { IPC_CHANNELS, DB_FILES } from '../../shared/types'
import { BUILTIN_PROVIDERS, BUILTIN_TASKS, DEFAULT_SETTINGS } from '../../shared/constants'

const DATA_DIR = join(homedir(), '.ClaudeKit')

function dataPath(file: string): string {
    return join(DATA_DIR, file)
}

function ensureDataDir(): void {
    if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true })
    }
}

function ensureFile(file: string, defaultContent: unknown = {}): void {
    const filePath = dataPath(file)
    if (!existsSync(filePath)) {
        writeFileSync(filePath, JSON.stringify(defaultContent, null, 2), 'utf-8')
    }
}

function readJSON(file: string): unknown {
    const filePath = dataPath(file)
    if (!existsSync(filePath)) {
        throw new Error(`文件不存在: ${filePath}`)
    }
    try {
        const raw = readFileSync(filePath, 'utf-8')
        return JSON.parse(raw)
    } catch (e) {
        if (e instanceof SyntaxError) {
            throw new Error(`JSON 解析失败: ${filePath} — ${e.message}`)
        }
        throw e
    }
}

function writeJSON(file: string, data: unknown): void {
    const filePath = dataPath(file)
    try {
        writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (e) {
        throw new Error(`写入文件失败: ${filePath} — ${(e as Error).message}`)
    }
}

export function initDataDir(): void {
    ensureDataDir()

    // 内置 providers 数据 —— 首次初始化时写入
    const providersPath = dataPath(DB_FILES.PROVIDERS)
    if (!existsSync(providersPath)) {
        const providers = BUILTIN_PROVIDERS.map((p, i) => ({
            id: `builtin-${i}`,
            ...p
        }))
        writeJSON(DB_FILES.PROVIDERS, providers)
    }

    // 内置 tasks 数据
    const tasksPath = dataPath(DB_FILES.TASKS)
    if (!existsSync(tasksPath)) {
        const tasks = BUILTIN_TASKS.map((t, i) => ({
            id: `builtin-task-${i}`,
            ...t
        }))
        writeJSON(DB_FILES.TASKS, tasks)
    }

    ensureFile(DB_FILES.PROFILES, [])
    ensureFile(DB_FILES.ENV, {})
    ensureFile(DB_FILES.TERMINAL, { tabs: [], activeTabId: '' })
    ensureFile(DB_FILES.SETTINGS, DEFAULT_SETTINGS)
}

export function registerDbIPC(): void {
    ensureDataDir()

    // ---- db:read ----
    ipcMain.handle(IPC_CHANNELS.DB_READ, async (_event, file: string) => {
        try {
            const data = readJSON(file)
            return { success: true, data }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })

    // ---- db:write ----
    ipcMain.handle(IPC_CHANNELS.DB_WRITE, async (_event, file: string, data: unknown) => {
        try {
            writeJSON(file, data)
            return { success: true }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })

    // ---- db:delete ----
    ipcMain.handle(IPC_CHANNELS.DB_DELETE, async (_event, file: string, key?: string) => {
        try {
            if (key !== undefined && key !== '') {
                // 删除数组中匹配 id 的条目，或删除对象中的 key
                const data = readJSON(file) as Record<string, unknown>
                if (Array.isArray(data)) {
                    const filtered = data.filter(
                        (item: Record<string, unknown>) => item.id !== key
                    )
                    writeJSON(file, filtered)
                } else {
                    delete data[key]
                    writeJSON(file, data)
                }
            }
            return { success: true }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })

    // ---- db:list ----
    ipcMain.handle(IPC_CHANNELS.DB_LIST, async (_event, file: string) => {
        try {
            const data = readJSON(file)
            if (Array.isArray(data)) {
                return { success: true, data }
            }
            return { success: true, data: Object.keys(data as Record<string, unknown>) }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })
}
