import { ipcMain, BrowserWindow } from 'electron'
import { spawn, IPty } from 'node-pty'
import { homedir } from 'os'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { DB_FILES } from '../../shared/types'

// sessionId → pty instance
const sessions = new Map<string, IPty>()

const DATA_DIR = join(homedir(), '.ClaudeCLI')

function getShell(): string {
    if (process.platform === 'win32') {
        return process.env.COMSPEC || 'powershell.exe'
    }
    const shell = process.env.SHELL || '/bin/zsh'
    if (shell && existsSync(shell)) return shell
    return '/bin/bash'
}

function getCwd(): string {
    return process.env.HOME ?? homedir()
}

function buildEnv(extraEnv?: Record<string, string>): Record<string, string> {
    const env: Record<string, string> = {}
    // Inherit current process env, filter out undefined values
    for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined) {
            env[key] = value
        }
    }
    // Apply extra env vars (e.g., ANTHROPIC_BASE_URL, etc.)
    if (extraEnv) {
        Object.assign(env, extraEnv)
    }
    // Ensure PATH is set (posix_spawnp requires it when resolving bare filenames)
    if (!env.PATH) {
        env.PATH = '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
    }
    return env
}

function sendToRenderer(channel: string, sessionId: string, data: unknown): void {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
        if (!win.isDestroyed()) {
            win.webContents.send(channel, sessionId, data)
        }
    }
}

export function registerTerminalIPC(): void {
    // ---- terminal:create ----
    ipcMain.handle(
        'terminal:create',
        async (
            _event,
            opts?: { cwd?: string; envVars?: Record<string, string>; cols?: number; rows?: number; shell?: string }
        ) => {
            try {
                const sessionId = `pty-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
                const cols = opts?.cols ?? 120
                const rows = opts?.rows ?? 30
                const cwd = opts?.cwd ?? getCwd()
                const env = buildEnv(opts?.envVars)
                let shell = opts?.shell || getShell()
                if (!existsSync(shell)) {
                    console.warn(`[terminal] shell not found: ${shell}, fallback to default`)
                    shell = getShell()
                }

                const pty = spawn(shell, [], {
                    name: 'xterm-256color',
                    cols,
                    rows,
                    cwd,
                    env
                })

                sessions.set(sessionId, pty)

                // Forward pty output to renderer
                pty.onData((data: string) => {
                    sendToRenderer('terminal:output', sessionId, data)
                })

                // Notify renderer when pty exits
                pty.onExit(({ exitCode, signal }: { exitCode: number; signal: number }) => {
                    sendToRenderer('terminal:exit', sessionId, { exitCode, signal })
                    sessions.delete(sessionId)
                })

                return { success: true, sessionId }
            } catch (e) {
                return { success: false, error: (e as Error).message, sessionId: '' }
            }
        }
    )

    // ---- terminal:destroy ----
    ipcMain.handle('terminal:destroy', async (_event, sessionId: string) => {
        try {
            const pty = sessions.get(sessionId)
            if (pty) {
                pty.kill()
                sessions.delete(sessionId)
            }
            return { success: true }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })

    // ---- terminal:resize ----
    ipcMain.handle(
        'terminal:resize',
        async (_event, sessionId: string, cols: number, rows: number) => {
            try {
                const pty = sessions.get(sessionId)
                if (pty) {
                    pty.resize(cols, rows)
                }
                return { success: true }
            } catch (e) {
                return { success: false, error: (e as Error).message }
            }
        }
    )

    // ---- terminal:input ----
    ipcMain.handle('terminal:input', async (_event, sessionId: string, data: string) => {
        try {
            const pty = sessions.get(sessionId)
            if (pty) {
                pty.write(data)
            }
            return { success: true }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })

    // ---- terminal:list ----
    ipcMain.handle('terminal:list', async () => {
        return { success: true, sessions: Array.from(sessions.keys()) }
    })
}

export function destroyAllTerminals(): void {
    for (const [id, pty] of sessions) {
        pty.kill()
    }
    sessions.clear()
}
