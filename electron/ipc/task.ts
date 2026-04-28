import { ipcMain } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { DB_FILES } from '../../shared/types'
import { BUILTIN_TASKS } from '../../shared/constants'

const DATA_DIR = join(homedir(), '.ClaudeKit')

function dataPath(file: string): string {
    return join(DATA_DIR, file)
}

function readTasks(): unknown[] {
    const fp = dataPath(DB_FILES.TASKS)
    if (!existsSync(fp)) return []
    return JSON.parse(readFileSync(fp, 'utf-8'))
}

function writeTasks(data: unknown[]): void {
    const fp = dataPath(DB_FILES.TASKS)
    writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8')
}

type AnyRecord = Record<string, unknown>

export function registerTaskIPC(): void {
    ipcMain.handle('task:list', async () => {
        try {
            return { success: true, data: readTasks() }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })

    ipcMain.handle('task:create', async (_event, task: AnyRecord) => {
        try {
            const tasks = readTasks()
            tasks.push(task)
            writeTasks(tasks)
            return { success: true }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })

    ipcMain.handle('task:update', async (_event, id: string, updates: AnyRecord) => {
        try {
            const tasks = readTasks()
            const idx = tasks.findIndex((t: unknown) => (t as AnyRecord).id === id)
            if (idx !== -1) {
                tasks[idx] = { ...(tasks[idx] as AnyRecord), ...updates }
                writeTasks(tasks)
            }
            return { success: true }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })

    ipcMain.handle('task:delete', async (_event, id: string) => {
        try {
            const filtered = (readTasks() as AnyRecord[]).filter((t) => t.id !== id)
            writeTasks(filtered)
            return { success: true }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })

    ipcMain.handle('task:reset', async () => {
        try {
            const tasks = BUILTIN_TASKS.map((t, i) => ({
                id: `builtin-task-${i}`,
                ...t
            }))
            writeTasks(tasks)
            return { success: true, data: tasks }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })
}
