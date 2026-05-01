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
            name: 'ClaudeKit Shell Config Writer',
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

// ---- 获取用户 login shell 的完整 PATH（打包后 app 从 Finder 启动时 process.env.PATH 不完整） ----
// macOS 上 `zsh -l` (login shell) 会加载 .zprofile 但不会加载 .zshrc，
// 而很多用户（nvm、npm global 等）把 PATH 配置在 .zshrc/.bashrc 中，
// 因此需要显式 source rc 文件。
let shellPathCache: string | null = null

async function getShellPath(): Promise<string> {
    if (shellPathCache) return shellPathCache

    if (process.platform === 'win32') {
        shellPathCache = process.env.PATH || ''
        return shellPathCache
    }

    const shell = process.env.SHELL || '/bin/bash'
    const shellName = shell.split('/').pop() || 'bash'
    const home = homedir()
    try {
        const { execSync } = await import('child_process')
        // 先以 login shell 启动（加载 .zprofile/.bash_profile），再显式 source rc 文件
        // 因为 macOS 上 zsh -l 不会加载 .zshrc，而很多用户把 PATH 配置在 rc 文件中
        const userPath = execSync(
            `${shell} -l -c '. "${home}/.${shellName}rc" 2>/dev/null; echo "KITPATH=$PATH"'`,
            {
                encoding: 'utf-8',
                timeout: 5000
            }
        ).trim()
        const pathMatch = userPath.match(/^KITPATH=(.*)$/m)
        shellPathCache = pathMatch ? pathMatch[1] : (process.env.PATH || '')
    } catch {
        shellPathCache = process.env.PATH || ''
    }
    return shellPathCache
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

    // ---- env:export-vars — 将环境变量写入 shell 配置文件（去重追加） ----
    ipcMain.handle('env:export-vars', async (_event, vars: Record<string, string>) => {
        try {
            const targetPath = getDefaultShellConfigPath()
            const isPowershell = targetPath.endsWith('.ps1')
            let content = ''
            if (existsSync(targetPath)) {
                content = readFileSync(targetPath, 'utf-8')
            }

            // 去掉已有的 ClaudeKit 标记注释和 ANTHROPIC_ export 行
            const lines = content.split('\n').filter(line => {
                const trimmed = line.trim()
                if (trimmed === '# === ClaudeKit — 模型商环境变量 ===') return false
                if (isPowershell) {
                    return !/^\$env:ANTHROPIC_\w+\s*=/.test(trimmed)
                }
                return !/^export\s+ANTHROPIC_\w+=/.test(trimmed)
            })

            // 去掉末尾空行，追加新 export
            while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
                lines.pop()
            }
            lines.push('')
            lines.push('# === ClaudeKit — 模型商环境变量 ===')
            for (const [key, value] of Object.entries(vars)) {
                if (value) {
                    lines.push(isPowershell
                        ? `$env:${key} = "${value}"`
                        : `export ${key}="${value}"`)
                }
            }
            lines.push('')

            const newContent = lines.join('\n')

            try {
                writeFileSync(targetPath, newContent, 'utf-8')
            } catch (e) {
                if ((e as NodeJS.ErrnoException).code === 'EACCES') {
                    await writeWithSudo(targetPath, newContent)
                } else {
                    throw e
                }
            }

            return { success: true, path: targetPath }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })

    // ---- env:save-user-vars — 将用户变量写入 Windows 注册表 (HKCU\Environment) ----
    ipcMain.handle('env:save-user-vars', async (_event, vars: Record<string, string>) => {
        if (process.platform !== 'win32') {
            return { success: false, error: '仅 Windows 支持' }
        }
        try {
            const { execSync } = await import('child_process')

            function readUserVars(): Record<string, string> {
                try {
                    const output = execSync('reg query "HKCU\\Environment"', { encoding: 'utf-8', timeout: 5000 })
                    const result: Record<string, string> = {}
                    for (const line of output.split(/\r?\n/)) {
                        const parts = line.trim().split(/\s{2,}/)
                        if (parts.length >= 3 && parts[1].startsWith('REG_')) {
                            result[parts[0]] = parts.slice(2).join(' ')
                        }
                    }
                    return result
                } catch {
                    return {}
                }
            }

            const currentVars = readUserVars()
            const newKeys = new Set(Object.keys(vars))

            // 删除不再存在的变量
            for (const key of Object.keys(currentVars)) {
                if (!newKeys.has(key)) {
                    execSync(`reg delete "HKCU\\Environment" /v "${key}" /f`, { encoding: 'utf-8', timeout: 5000 })
                }
            }

            // 添加或更新变量
            for (const [key, value] of Object.entries(vars)) {
                if (currentVars[key] !== value) {
                    const escapedValue = value.replace(/"/g, '\\"')
                    execSync(`reg add "HKCU\\Environment" /v "${key}" /t REG_SZ /d "${escapedValue}" /f`, { encoding: 'utf-8', timeout: 5000 })
                }
            }

            // 通知系统环境变量已变更
            try {
                execSync(
                    `powershell.exe -NoProfile -Command "[System.Environment]::SetEnvironmentVariable('PATH', [System.Environment]::GetEnvironmentVariable('PATH', 'User'), 'User')"`,
                    { encoding: 'utf-8', timeout: 5000, windowsHide: true }
                )
            } catch { /* ignore */ }

            return { success: true }
        } catch (e) {
            return { success: false, error: (e as Error).message }
        }
    })

    // ---- env:list — 列出环境变量（Windows 区分系统/用户，macOS/Linux 用 process.env） ----
    ipcMain.handle('env:list', async () => {
        try {
            const sensitivePattern = /(?:secret|password|credential|private_key)/i

            if (process.platform === 'win32') {
                const { execSync } = await import('child_process')

                function readRegistry(key: string): Record<string, string> {
                    try {
                        const output = execSync(`reg query "${key}"`, { encoding: 'utf-8', timeout: 5000 })
                        const vars: Record<string, string> = {}
                        const lines = output.split(/\r?\n/)
                        for (const line of lines) {
                            const parts = line.trim().split(/\s{2,}/)
                            if (parts.length >= 3 && parts[1].startsWith('REG_')) {
                                const name = parts[0]
                                const value = parts.slice(2).join(' ')
                                if (!sensitivePattern.test(name)) {
                                    vars[name] = value
                                }
                            }
                        }
                        return vars
                    } catch {
                        return {}
                    }
                }

                const system = readRegistry('HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment')
                const user = readRegistry('HKCU\\Environment')
                return { success: true, data: { system, user } }
            }

            // macOS/Linux: process.env 包含完整环境变量（全部归为系统）
            const filtered: Record<string, string> = {}
            for (const [key, value] of Object.entries(process.env)) {
                if (value !== undefined && !sensitivePattern.test(key)) {
                    filtered[key] = value
                }
            }
            return { success: true, data: { system: filtered, user: {} } }
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
            const shellPath = await getShellPath()
            const version = execSync('claude --version', {
                encoding: 'utf-8',
                timeout: 5000,
                env: { ...process.env, PATH: shellPath }
            }).trim()
            return { success: true, version }
        } catch {
            return { success: false, version: '未安装' }
        }
    })

    // ---- system:check-update ----
    ipcMain.handle('system:check-update', async (_event, currentVersion: string) => {
        try {
            const repo = process.env.GITHUB_REPO || 'deajax/claudekit'
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
            const shellPath = await getShellPath()
            const version = execSync('node --version', {
                encoding: 'utf-8',
                timeout: 5000,
                env: { ...process.env, PATH: shellPath }
            }).trim()
            return { success: true, version }
        } catch {
            return { success: false, version: '未安装' }
        }
    })

    // ---- system:check-npm ----
    ipcMain.handle('system:check-npm', async () => {
        try {
            const { execSync } = await import('child_process')
            const shellPath = await getShellPath()
            const version = execSync('npm --version', {
                encoding: 'utf-8',
                timeout: 5000,
                env: { ...process.env, PATH: shellPath }
            }).trim()
            return { success: true, version }
        } catch {
            return { success: false, version: '未安装' }
        }
    })

    // ---- system:check-git ----
    ipcMain.handle('system:check-git', async () => {
        try {
            const { execSync } = await import('child_process')
            const { existsSync } = await import('fs')
            const shellPath = await getShellPath()
            const env = { ...process.env, PATH: shellPath }

            // 检测 git
            const gitVersion = execSync('git --version', {
                encoding: 'utf-8',
                timeout: 5000,
                env
            }).trim()

            // Windows 额外检测 bash 是否可用（Git for Windows 提供）
            if (process.platform === 'win32') {
                // 优先检查 CLAUDE_CODE_GIT_BASH_PATH 环境变量
                const claudeBashPath = process.env.CLAUDE_CODE_GIT_BASH_PATH
                if (claudeBashPath && existsSync(claudeBashPath)) {
                    return { success: true, version: gitVersion }
                }

                // 检查 bash 是否在 PATH 中可用
                try {
                    execSync('bash --version', {
                        encoding: 'utf-8',
                        timeout: 5000,
                        env,
                        windowsHide: true
                    })
                } catch {
                    return { success: false, version: `${gitVersion}（bash 不可用）` }
                }
            }

            return { success: true, version: gitVersion }
        } catch {
            return { success: false, version: '未安装' }
        }
    })

    // ---- system:install-claude ----
    ipcMain.handle('system:install-claude', async () => {
        try {
            const { exec } = await import('child_process')
            const { promisify } = await import('util')
            const execAsync = promisify(exec)
            const shellPath = await getShellPath()
            const { stdout } = await execAsync('npm install -g @anthropic-ai/claude-code', {
                encoding: 'utf-8',
                timeout: 120000,
                env: { ...process.env, PATH: shellPath }
            })
            return { success: true, output: stdout || '' }
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

    // ---- system:config-git-env — Windows 一键配置 Git bash 环境变量 ----
    ipcMain.handle('system:config-git-env', async () => {
        if (process.platform !== 'win32') {
            return { success: false, error: '仅 Windows 支持' }
        }
        try {
            const { execSync } = await import('child_process')
            const { existsSync } = await import('fs')
            const { join, dirname } = await import('path')

            // 通过 where git 查找 git.exe 实际路径，推断 bash.exe 位置
            let bashPath: string | null = null
            try {
                const gitPath = execSync('where git', {
                    encoding: 'utf-8', timeout: 5000, windowsHide: true
                }).trim().split(/\r?\n/)[0]

                if (gitPath) {
                    // git.exe 可能位于 Git/cmd/git.exe 或 Git/bin/git.exe
                    // bash.exe 通常位于 Git/bin/bash.exe
                    const gitDir = dirname(gitPath)
                    const parentDir = dirname(gitDir) // Git 安装根目录

                    const candidates = [
                        join(gitDir, 'bash.exe'),                     // Git/bin/bash.exe
                        join(parentDir, 'bin', 'bash.exe'),           // Git/bin/bash.exe
                        join(parentDir, 'usr', 'bin', 'bash.exe'),    // Git/usr/bin/bash.exe
                    ]
                    for (const p of candidates) {
                        if (existsSync(p)) { bashPath = p; break }
                    }
                }
            } catch { /* where git 失败，走下面常见路径兜底 */ }

            // 兜底：常见安装路径
            if (!bashPath) {
                const commonPaths = [
                    'C:\\Program Files\\Git\\bin\\bash.exe',
                    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
                    join(process.env.LOCALAPPDATA || 'C:\\Users\\Default', 'Programs\\Git\\bin\\bash.exe'),
                ]
                for (const p of commonPaths) {
                    if (existsSync(p)) { bashPath = p; break }
                }
            }

            if (!bashPath) {
                return { success: false, error: '未找到 bash.exe，请确认已安装 Git for Windows' }
            }

            // 写入用户环境变量（持久化，对新进程生效）
            execSync(
                `reg add "HKCU\\Environment" /v CLAUDE_CODE_GIT_BASH_PATH /t REG_SZ /d "${bashPath}" /f`,
                { encoding: 'utf-8', timeout: 5000, windowsHide: true }
            )

            // 同步设置当前进程环境变量，使后续检测立即生效
            process.env.CLAUDE_CODE_GIT_BASH_PATH = bashPath

            return { success: true, bashPath }
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
