import { ipcMain } from 'electron'
import { existsSync, readFileSync, writeFileSync, writeSync, openSync, closeSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
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
            name: 'Claude CLI Desktop — 写入 Shell 配置文件',
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

function getDefaultShellConfigPath(): string {
    if (process.platform === 'win32') {
        return join(homedir(), 'Documents', 'WindowsPowerShell', 'Microsoft.PowerShell_profile.ps1')
    }
    const zshrc = join(homedir(), '.zshrc')
    if (existsSync(zshrc)) return zshrc
    const bashProfile = join(homedir(), '.bash_profile')
    if (existsSync(bashProfile)) return bashProfile
    return join(homedir(), '.bashrc')
}

export function registerEnvIPC(): void {
    // ---- env:read — 读取 shell 配置文件 ----
    ipcMain.handle('env:read', async () => {
        try {
            const shellPath = getDefaultShellConfigPath()
            if (!existsSync(shellPath)) {
                return { success: true, data: `# ${shellPath}\n# 文件不存在，保存后将自动创建`, path: shellPath }
            }
            const content = readFileSync(shellPath, 'utf-8')
            return { success: true, data: content, path: shellPath }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })

    // ---- env:write — 写入 shell 配置文件（可提权） ----
    ipcMain.handle('env:write', async (_event, content: string, filePath?: string, useSudo = false) => {
        try {
            const targetPath = filePath || getDefaultShellConfigPath()

            if (useSudo) {
                await writeWithSudo(targetPath, content)
            } else {
                try {
                    writeFileSync(targetPath, content, 'utf-8')
                } catch (e) {
                    if ((e as NodeJS.ErrnoException).code === 'EACCES') {
                        await writeWithSudo(targetPath, content)
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

    // ---- env:read-profile — 读取多 shell 配置文件选择 ----
    ipcMain.handle('env:read-profile', async () => {
        try {
            const path = getDefaultShellConfigPath()
            let content = ''
            if (existsSync(path)) {
                content = readFileSync(path, 'utf-8')
            }
            return { success: true, data: content, path }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })

    // ---- env:write-profile — 写入指定 shell 配置文件（可提权） ----
    ipcMain.handle('env:write-profile', async (_event, opts: { path: string; content: string; useSudo?: boolean }) => {
        try {
            if (opts.useSudo) {
                await writeWithSudo(opts.path, opts.content)
            } else {
                try {
                    writeFileSync(opts.path, opts.content, 'utf-8')
                } catch (e) {
                    if ((e as NodeJS.ErrnoException).code === 'EACCES') {
                        await writeWithSudo(opts.path, opts.content)
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

    // ---- env:list — 列出当前进程环境变量 ----
    ipcMain.handle('env:list', async () => {
        try {
            return { success: true, data: { ...process.env } }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })

    // ---- system:get-os ----
    ipcMain.handle('system:get-os', async () => {
        return { success: true, platform: process.platform }
    })

    // ---- system:check-claude ----
    ipcMain.handle('system:check-claude', async () => {
        try {
            const { execSync } = await import('child_process')
            const version = execSync('claude --version', { encoding: 'utf-8', timeout: 5000 }).trim()
            return { success: true, version }
        } catch {
            return { success: true, version: '未安装' }
        }
    })

    // ---- system:check-update ----
    ipcMain.handle('system:check-update', async (_event, currentVersion: string) => {
        try {
            const repo = process.env.GITHUB_REPO || 'user/claude-cli-desktop'
            const resp = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
                headers: {
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            })
            if (!resp.ok) {
                return { success: true, latest: currentVersion, body: '' }
            }
            const release = await resp.json() as { tag_name: string; body: string }
            const latestTag = release.tag_name?.replace(/^v/, '') ?? currentVersion
            return {
                success: true,
                latest: latestTag,
                body: release.body ?? ''
            }
        } catch {
            return {
                success: true,
                latest: currentVersion,
                body: ''
            }
        }
    })

    // ---- system:check-node ----
    ipcMain.handle('system:check-node', async () => {
        try {
            const { execSync } = await import('child_process')
            const version = execSync('node --version', { encoding: 'utf-8', timeout: 5000 }).trim()
            return { success: true, version }
        } catch {
            return { success: false, version: '未安装' }
        }
    })

    // ---- system:check-npm ----
    ipcMain.handle('system:check-npm', async () => {
        try {
            const { execSync } = await import('child_process')
            const version = execSync('npm --version', { encoding: 'utf-8', timeout: 5000 }).trim()
            return { success: true, version }
        } catch {
            return { success: false, version: '未安装' }
        }
    })

    // ---- system:check-git ----
    ipcMain.handle('system:check-git', async () => {
        try {
            const { execSync } = await import('child_process')
            const version = execSync('git --version', { encoding: 'utf-8', timeout: 5000 }).trim()
            return { success: true, version }
        } catch {
            return { success: false, version: '未安装' }
        }
    })

    // ---- system:install-claude ----
    ipcMain.handle('system:install-claude', async () => {
        try {
            const { execSync } = await import('child_process')
            const output = execSync('npm install -g @anthropic-ai/claude-code', {
                encoding: 'utf-8',
                timeout: 120000,
                stdio: 'pipe'
            })
            return { success: true, output }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })

    // ---- system:test-provider — 测试模型商连通性 ----
    ipcMain.handle('system:test-provider', async (_event, baseUrl: string, authToken: string, model: string, balanceApi?: string) => {
        try {
            if (balanceApi) {
                const resp = await fetch(balanceApi, {
                    headers: { Authorization: `Bearer ${authToken}` },
                    signal: AbortSignal.timeout(10000)
                })
                if (resp.status === 401 || resp.status === 403) {
                    return { success: false, error: '认证失败（401/403），请检查 AUTH_TOKEN' }
                }
                if (!resp.ok) {
                    return { success: false, error: `余额接口返回 ${resp.status}，请检查 network` }
                }
                return { success: true }
            }

            const apiUrl = baseUrl.replace(/\/+$/, '') + '/v1/messages'
            const resp = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                    'x-api-key': authToken
                },
                body: JSON.stringify({
                    model: model || 'claude-sonnet-4-6',
                    max_tokens: 1,
                    messages: [{ role: 'user', content: '.' }]
                }),
                signal: AbortSignal.timeout(15000)
            })

            // Anthropic API 语义：200/400 表示 auth 已通过（400 是 body 参数问题）
            if (resp.status === 200 || resp.status === 400) {
                return { success: true }
            }
            if (resp.status === 401 || resp.status === 403) {
                return { success: false, error: '认证失败（401/403），请检查 AUTH_TOKEN' }
            }
            return { success: false, error: `服务器返回 ${resp.status}，请检查 BASE_URL 和网络连接` }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })

    // ---- system:balance-query ----
    ipcMain.handle('system:balance-query', async (_event, apiUrl: string, token: string) => {
        try {
            const resp = await fetch(apiUrl, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await resp.json()
            return { success: true, data }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })
}
