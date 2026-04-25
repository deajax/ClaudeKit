import { ipcMain } from 'electron'
import { existsSync, readFileSync, writeFileSync, writeSync, openSync, closeSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { app } from 'electron'
import sudo from 'sudo-prompt'

function writeWithSudo(filePath: string, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const tmpPath = filePath + '.tmp'
        const fd = openSync(tmpPath, 'w')
        writeSync(fd, content)
        closeSync(fd)

        const cmd = process.platform === 'win32'
            ? `powershell.exe -Command "Move-Item -Force '${tmpPath}' '${filePath}'"`
            : `mv "${tmpPath}" "${filePath}"`

        sudo.exec(cmd, {
            name: 'Claude CLI Desktop — 写入配置文件',
            icns: undefined
        }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr || error.message || '提权操作失败'))
            } else {
                resolve()
            }
        })
    })
}

export function registerConfigIPC(): void {
    // ---- config:read — 读取 ~/.claude.json ----
    ipcMain.handle('config:read', async () => {
        try {
            const configPath = join(homedir(), '.claude.json')
            if (!existsSync(configPath)) {
                return { success: true, data: {} }
            }
            const raw = readFileSync(configPath, 'utf-8')
            const data = JSON.parse(raw)
            return { success: true, data }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })

    // ---- config:write — 写入 ~/.claude.json（需提权确认） ----
    ipcMain.handle('config:write', async (_event, updates: Record<string, unknown>, useSudo = false) => {
        try {
            const configPath = join(homedir(), '.claude.json')
            let data: Record<string, unknown> = {}
            if (existsSync(configPath)) {
                const raw = readFileSync(configPath, 'utf-8')
                data = JSON.parse(raw)
            }
            // 合并更新，保留原有字段
            Object.assign(data, updates)
            const jsonContent = JSON.stringify(data, null, 2)

            if (useSudo) {
                await writeWithSudo(configPath, jsonContent)
            } else {
                try {
                    writeFileSync(configPath, jsonContent, 'utf-8')
                } catch (e) {
                    if ((e as NodeJS.ErrnoException).code === 'EACCES') {
                        await writeWithSudo(configPath, jsonContent)
                    } else {
                        throw e
                    }
                }
            }
            return { success: true }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })

    // ---- config:read-help — 读取项目内置 help.md ----
    ipcMain.handle('config:read-help', async () => {
        try {
            const isDev = !app.isPackaged
            const helpPath = isDev
                ? join(app.getAppPath(), 'src', 'help.md')
                : join(process.resourcesPath, 'help.md')

            if (!existsSync(helpPath)) {
                return { success: false, error: '帮助文档不存在' }
            }
            const content = readFileSync(helpPath, 'utf-8')
            return { success: true, data: content }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })
}
