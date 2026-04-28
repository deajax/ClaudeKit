import { ipcMain } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { DB_FILES } from '../../shared/types'
import { BUILTIN_PROVIDERS } from '../../shared/constants'

const DATA_DIR = join(homedir(), '.ClaudeKit')

function dataPath(file: string): string {
    return join(DATA_DIR, file)
}

function readProviders(): unknown[] {
    const fp = dataPath(DB_FILES.PROVIDERS)
    if (!existsSync(fp)) return []
    return JSON.parse(readFileSync(fp, 'utf-8'))
}

function writeProviders(data: unknown[]): void {
    const fp = dataPath(DB_FILES.PROVIDERS)
    writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export function registerProviderIPC(): void {
    ipcMain.handle('provider:list', async () => {
        try {
            return { success: true, data: readProviders() }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })

    ipcMain.handle('provider:create', async (_event, provider: AnyRecord) => {
        try {
            const providers = readProviders()
            providers.push(provider)
            writeProviders(providers)
            return { success: true }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })

    ipcMain.handle('provider:update', async (_event, id: string, updates: AnyRecord) => {
        try {
            const providers = readProviders()
            const idx = providers.findIndex(
                (p: unknown) => (p as AnyRecord).id === id
            )
            if (idx !== -1) {
                providers[idx] = { ...(providers[idx] as AnyRecord), ...updates }
                writeProviders(providers)
            }
            return { success: true }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })

    ipcMain.handle('provider:delete', async (_event, id: string) => {
        try {
            const filtered = (readProviders() as AnyRecord[]).filter(
                (p) => p.id !== id
            )
            writeProviders(filtered)
            return { success: true }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })

    ipcMain.handle('provider:reset', async () => {
        try {
            const providers = BUILTIN_PROVIDERS.map((p, i) => ({
                id: `builtin-${i}`,
                ...p
            }))
            writeProviders(providers)
            return { success: true, data: providers }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })
}
