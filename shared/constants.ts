import type { Provider, QuickTask, AppSettings } from './types'

export const DATA_DIR = '~/.ClaudeCLI'

export const BUILTIN_PROVIDERS: Omit<Provider, 'AUTH_TOKEN'>[] = [
    {
        name: '阿里云百炼',
        icon: '',
        BASE_URL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        model: 'qwen-plus',
        opusModel: 'qwen-max',
        sonnetModel: 'qwen-plus',
        haikuModel: 'qwen-turbo'
    },
    {
        name: 'DeepSeek',
        icon: '',
        BASE_URL: 'https://api.deepseek.com/anthropic',
        model: 'deepseek-v4-pro',
        opusModel: 'deepseek-v4-pro',
        sonnetModel: 'deepseek-v4',
        haikuModel: 'deepseek-chat',
        thinkingSupported: true,
        balanceApi: 'https://api.deepseek.com/user/balance'
    },
    {
        name: 'OpenRouter',
        icon: '',
        BASE_URL: 'https://openrouter.ai/api',
        model: 'anthropic/claude-sonnet-4',
        opusModel: 'anthropic/claude-opus-4',
        sonnetModel: 'anthropic/claude-sonnet-4',
        haikuModel: 'anthropic/claude-haiku-4'
    },
    {
        name: '硅基流动',
        icon: '',
        BASE_URL: 'https://api.siliconflow.cn/v1',
        model: 'Pro/deepseek-ai/DeepSeek-V4-Pro',
        opusModel: 'Pro/deepseek-ai/DeepSeek-V4-Pro',
        sonnetModel: 'Pro/deepseek-ai/DeepSeek-V4',
        haikuModel: 'Pro/deepseek-ai/DeepSeek-V3'
    }
]

export const BUILTIN_TASKS: Omit<QuickTask, 'id'>[] = [
    { name: 'npm run dev', command: 'npm run dev', cwd: '', providerId: '' },
    { name: 'npm run build', command: 'npm run build', cwd: '', providerId: '' },
    { name: 'npm run lint', command: 'npm run lint', cwd: '', providerId: '' },
    { name: 'npm run test', command: 'npm run test', cwd: '', providerId: '' }
]

export const DEFAULT_SETTINGS: AppSettings = {
    theme: 'dark',
    scrollback: 1000,
    shell: '',
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    loginMode: ''
}
