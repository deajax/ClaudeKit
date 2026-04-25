<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getOs } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const emit = defineEmits<{
    close: []
    complete: []
}>()

const os = getOs()

// ---- Steps ----
const steps = [
    { key: 'env-check', title: '环境检测', icon: '🔍' },
    { key: 'install-claude', title: '安装 Claude Code', icon: '📦' },
    { key: 'config-provider', title: '配置模型商', icon: '⚙️' },
    { key: 'login-config', title: '免登录配置', icon: '🔑' },
    { key: 'done', title: '完成', icon: '✅' }
]
const currentStep = ref(0)

// Step 1 — 环境检测
const shellType = ref('')
const nodeVersion = ref('')
const npmReady = ref(false)
const envCheckDone = ref(false)

async function runEnvCheck(): Promise<void> {
    try {
        const result = await window.electronAPI.invoke<{
            success: boolean
            platform: string
        }>('system:get-os')
        shellType.value = os === 'mac' ? 'zsh' : os === 'win' ? 'powershell' : 'bash'
    } catch {
        shellType.value = '未知'
    }

    try {
        const result = await window.electronAPI.invoke<{ success: boolean; version: string }>('system:check-node')
        nodeVersion.value = result.success ? result.version : '未安装'
    } catch {
        nodeVersion.value = '未安装'
    }

    try {
        const result = await window.electronAPI.invoke<{ success: boolean; version: string }>('system:check-npm')
        npmReady.value = result.success
    } catch {
        npmReady.value = false
    }

    envCheckDone.value = true
}

// Step 2 — 安装 Claude Code
const claudeInstalled = ref(false)
const claudeVersion = ref('')
const installingClaude = ref(false)
const claudeInstallLog = ref('')

async function checkClaudeInstall(): Promise<void> {
    try {
        const result = await window.electronAPI.invoke<{ success: boolean; version: string }>('system:check-claude')
        claudeInstalled.value = result.success && result.version !== '未安装'
        claudeVersion.value = result.version ?? ''
    } catch {
        claudeInstalled.value = false
    }
}

async function installClaude(): Promise<void> {
    installingClaude.value = true
    claudeInstallLog.value = '正在安装 Claude Code CLI...\n'
    try {
        const result = await window.electronAPI.invoke<{ success: boolean; output?: string; error?: string }>(
            'system:install-claude'
        )
        if (result.success) {
            claudeInstallLog.value += result.output ?? '安装完成！'
            await checkClaudeInstall()
        } else {
            claudeInstallLog.value += '安装失败: ' + (result.error ?? '未知错误')
        }
    } catch (e) {
        claudeInstallLog.value += '安装失败: ' + (e as Error).message
    }
    installingClaude.value = false
}

// Step 3 — 配置模型商
// (handled by existing ProviderConfig, placeholder in wizard)

// Step 4 — 免登录配置
const loginConfigured = ref(false)
const loginConfiguring = ref(false)

async function checkLoginStatus(): Promise<void> {
    try {
        const result = await window.electronAPI.invoke<{ success: boolean; data?: { hasCompletedOnboarding?: boolean } }>('config:read')
        loginConfigured.value = result.data?.hasCompletedOnboarding === true
    } catch {
        loginConfigured.value = false
    }
}

async function setupLogin(): Promise<void> {
    const confirmed = confirm(
        '即将在 ~/.claude.json 中设置 hasCompletedOnboarding = true。\n\n此操作可能需要系统权限授权，是否继续？'
    )
    if (!confirmed) return

    loginConfiguring.value = true
    try {
        const result = await window.electronAPI.invoke<{ success: boolean; error?: string }>('config:write', {
            hasCompletedOnboarding: true
        }, true)
        if (result.success) {
            loginConfigured.value = true
        } else {
            alert('配置失败: ' + (result.error ?? '未知错误'))
        }
    } catch (e) {
        alert('配置失败: ' + (e as Error).message)
    }
    loginConfiguring.value = false
}

// Navigation
function nextStep(): void {
    if (currentStep.value < steps.length - 1) {
        currentStep.value++
    }
}

function prevStep(): void {
    if (currentStep.value > 0) {
        currentStep.value--
    }
}

function skipWizard(): void {
    emit('close')
}

function finishWizard(): void {
    emit('complete')
}

const skipWizardPermanently = ref(false)

function toggleSkip(): void {
    skipWizardPermanently.value = !skipWizardPermanently.value
    // Save preference to settings
}

onMounted(() => {
    runEnvCheck()
    checkClaudeInstall()
    checkLoginStatus()
})
</script>

<template>
    <div class="setup-wizard p-6 space-y-6">
        <h2 class="text-base font-medium text-slate-200 text-center">欢迎使用 Claude CLI Desktop</h2>

        <!-- 步骤条 -->
        <div class="flex items-center justify-center gap-1">
            <template v-for="(step, i) in steps" :key="step.key">
                <div class="flex items-center">
                    <div
                        class="w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors"
                        :class="i === currentStep
                            ? 'bg-blue-600 text-white'
                            : i < currentStep
                                ? 'bg-green-700 text-white'
                                : 'bg-slate-700 text-slate-500'"
                    >
                        {{ i < currentStep ? '✓' : step.icon }}
                    </div>
                    <span
                        v-if="i < steps.length - 1"
                        class="w-8 h-px"
                        :class="i < currentStep ? 'bg-green-700' : 'bg-slate-700'"
                    />
                </div>
            </template>
        </div>

        <!-- Step 内容 -->
        <div class="min-h-48 bg-slate-700/20 rounded p-4 text-sm">

            <!-- Step 1: 环境检测 -->
            <div v-if="currentStep === 0" class="space-y-3">
                <h3 class="text-sm font-medium text-slate-200">环境检测</h3>
                <div class="space-y-2 text-xs">
                    <div class="flex justify-between">
                        <span class="text-slate-400">Shell 类型</span>
                        <span class="text-slate-200">{{ shellType || '检测中...' }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400">Node.js 版本</span>
                        <span class="text-slate-200">{{ nodeVersion || '检测中...' }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400">npm</span>
                        <span :class="npmReady ? 'text-green-400' : 'text-red-400'">
                            {{ npmReady ? '可用' : '不可用' }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Step 2: 安装 Claude Code -->
            <div v-if="currentStep === 1" class="space-y-3">
                <h3 class="text-sm font-medium text-slate-200">Claude Code 安装</h3>
                <div v-if="claudeInstalled" class="text-xs text-green-400">
                    Claude Code 已安装 ({{ claudeVersion }})
                </div>
                <div v-else>
                    <p class="text-xs text-slate-400 mb-2">未检测到 Claude Code，请点击下方按钮安装</p>
                    <Button
                        size="sm"
                        :disabled="installingClaude"
                        @click="installClaude"
                    >
                        {{ installingClaude ? '安装中...' : '一键安装 Claude Code' }}
                    </Button>
                    <pre
                        v-if="claudeInstallLog"
                        class="mt-2 bg-slate-950 p-2 rounded text-xs text-slate-400 max-h-24 overflow-y-auto"
                    >{{ claudeInstallLog }}</pre>
                </div>
            </div>

            <!-- Step 3: 配置模型商 -->
            <div v-if="currentStep === 2" class="space-y-3">
                <h3 class="text-sm font-medium text-slate-200">配置模型商</h3>
                <p class="text-xs text-slate-400">
                    请前往「更多 → 模型商配置」添加模型商及 API Key。
                    已内置 4 家模型商：阿里云百炼、DeepSeek、OpenRouter、硅基流动
                </p>
                <p class="text-xs text-slate-500">此步骤可跳过，之后随时配置</p>
            </div>

            <!-- Step 4: 免登录配置 -->
            <div v-if="currentStep === 3" class="space-y-3">
                <h3 class="text-sm font-medium text-slate-200">免登录配置</h3>
                <div v-if="loginConfigured" class="text-xs text-green-400">
                    免登录已配置 (hasCompletedOnboarding = true)
                </div>
                <div v-else>
                    <p class="text-xs text-slate-400 mb-2">
                        将在 ~/.claude.json 中设置 hasCompletedOnboarding = true
                    </p>
                    <Button
                        size="sm"
                        :disabled="loginConfiguring"
                        @click="setupLogin"
                    >
                        {{ loginConfiguring ? '配置中...' : '一键配置免登录' }}
                    </Button>
                </div>
            </div>

            <!-- Step 5: 完成 -->
            <div v-if="currentStep === 4" class="space-y-3 text-center">
                <h3 class="text-sm font-medium text-slate-200">🎉 配置完成</h3>
                <p class="text-xs text-slate-400">
                    所有配置已完成，建议重启程序使配置生效
                </p>
                <label class="flex items-center justify-center gap-2 text-xs text-slate-500 cursor-pointer">
                    <input v-model="skipWizardPermanently" type="checkbox" @change="toggleSkip" />
                    不再显示引导
                </label>
            </div>
        </div>

        <!-- 导航按钮 -->
        <div class="flex justify-between">
            <Button variant="secondary" size="sm" class="text-xs" @click="skipWizard">
                跳过
            </Button>
            <div class="flex gap-2">
                <Button v-if="currentStep > 0" variant="secondary" size="sm" class="text-xs" @click="prevStep">
                    上一步
                </Button>
                <Button v-if="currentStep < steps.length - 1" size="sm" class="text-xs" @click="nextStep">
                    下一步
                </Button>
                <Button v-if="currentStep === steps.length - 1" size="sm" class="bg-green-600 text-white hover:bg-green-500 text-xs" @click="finishWizard">
                    完成
                </Button>
            </div>
        </div>
    </div>
</template>
