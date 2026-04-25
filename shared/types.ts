// ---------- 模型商 ----------
// Claude Code 最多支持 4 个模型：1 个默认 + 3 个分级覆盖
// 分别对应 ANTHROPIC_MODEL / ANTHROPIC_DEFAULT_OPUS_MODEL / ANTHROPIC_DEFAULT_SONNET_MODEL / ANTHROPIC_DEFAULT_HAIKU_MODEL

export interface Provider {
    name: string
    icon: string // base64
    BASE_URL: string
    AUTH_TOKEN: string
    model: string           // ANTHROPIC_MODEL — 默认模型（必填）
    opusModel?: string      // ANTHROPIC_DEFAULT_OPUS_MODEL — 覆盖旗舰模型
    sonnetModel?: string    // ANTHROPIC_DEFAULT_SONNET_MODEL — 覆盖高级模型
    haikuModel?: string     // ANTHROPIC_DEFAULT_HAIKU_MODEL — 覆盖初级模型
    thinkingSupported?: boolean
    balanceApi?: string
}

// ---------- 配置集 ----------
export interface Profile {
    id: string
    name: string
    providerId: string
    model: string
    envVars: Record<string, string>
    active: boolean
}

// ---------- 环境变量条目 ----------
export interface EnvEntry {
    key: string
    value: string
    source: string
    autoWrite: boolean
}

// ---------- 快速任务 ----------
export interface QuickTask {
    id: string
    name: string
    command: string
    cwd: string
    providerId: string
}

// ---------- 终端标签页 ----------
export interface TerminalTab {
    id: string
    title: string
    cwd: string
    createdAt: string
}

export interface TerminalData {
    tabs: TerminalTab[]
    activeTabId: string
}

// ---------- 应用设置 ----------
export interface AppSettings {
    theme: 'dark' | 'light'
    scrollback: number
    shell: string
    fontSize: number
    fontFamily: string
    loginMode: string
}

// ---------- 余额信息 ----------
export interface BalanceInfo {
    is_available: boolean
    balance_infos: {
        currency: string
        balance: string
    }[]
}

// ---------- IPC 通道名称 ----------
export const IPC_CHANNELS = {
    DB_READ: 'db:read',
    DB_WRITE: 'db:write',
    DB_DELETE: 'db:delete',
    DB_LIST: 'db:list'
} as const

// ---------- JSON 数据库文件名 ----------
export const DB_FILES = {
    PROVIDERS: 'providers.json',
    PROFILES: 'profiles.json',
    ENV: 'env.json',
    TASKS: 'tasks.json',
    TERMINAL: 'terminal.json',
    SETTINGS: 'settings.json'
} as const
