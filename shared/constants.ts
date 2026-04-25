import type { Provider, QuickTask, AppSettings } from './types'

export const DATA_DIR = '~/.ClaudeCLI'

export const BUILTIN_PROVIDERS: Omit<Provider, 'AUTH_TOKEN'>[] = [
    {
        name: '阿里云百炼',
        icon: '',
        BASE_URL: 'https://dashscope.aliyuncs.com/apps/anthropic',
        model: 'qwen3.6-plus',
        opusModel: 'qwen3.6-max-preview',
        sonnetModel: 'qwen3.6-flash',
        haikuModel: 'qwen3-coder-next'
    },
    {
        name: 'DeepSeek',
        icon: '',
        BASE_URL: 'https://api.deepseek.com/anthropic',
        model: 'deepseek-v4-pro',
        opusModel: 'deepseek-v4-pro',
        sonnetModel: 'deepseek-v4-flash',
        haikuModel: 'deepseek-chat',
        thinkingSupported: true,
        balanceApi: 'https://api.deepseek.com/user/balance'
    },
    {
        name: 'OpenRouter',
        icon: '',
        BASE_URL: 'https://openrouter.ai/api',
        model: 'openrouter/free',
        opusModel: 'anthropic/claude-opus-4.7',
        sonnetModel: 'openai/gpt-5.5',
        haikuModel: 'google/gemini-3.1-pro-preview'
    },
    {
        name: '硅基流动',
        icon: '',
        BASE_URL: 'https://api.siliconflow.cn/',
        model: 'Qwen/Qwen3-8B',
        opusModel: 'Pro/zai-org/GLM-5.1',
        sonnetModel: 'Pro/moonshotai/Kimi-K2.6',
        haikuModel: 'MiniMaxAI/MiniMax-M2.5'
    },
    {
        name: 'Kimi 月之暗面',
        icon: '',
        BASE_URL: 'https://api.moonshot.cn/anthropic',
        model: 'kimi-k2.6',
        opusModel: 'kimi-k2.6',
        sonnetModel: 'kimi-k2.5',
        haikuModel: ''
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
