<script setup lang="ts">
import { ref, reactive, computed, onMounted, h, type VNode } from 'vue'
import { getOs } from '@/lib/utils'
import { useSettingsStore } from '@/stores/settings'
import { TypographyParagraph } from 'ant-design-vue'
import {
    RiTerminalBoxLine,
    RiStarLine,
    RiCodeLine,
    RiRobot2Line,
    RiSunLine,
    RiMoonLine,
    RiCheckboxCircleLine,
    RiAddLine,
} from '@remixicon/vue'
import { CheckCircleFilled } from '@ant-design/icons-vue'

const emit = defineEmits<{
    close: []
    complete: []
}>()

const os = getOs()
const settingsStore = useSettingsStore()

// ---- Steps ----
const steps = [
    { key: 'env-check', title: '环境检测' },
    { key: 'install-claude', title: '安装 Claude Code' },
    { key: 'config-provider', title: '配置模型商' },
    { key: 'login-config', title: '免登录配置' },
    { key: 'done', title: '完成' }
]
const currentStep = ref(0)

// ---- Step 1: 环境检测 ----
interface EnvCheckItem {
    name: string
    key: string
    version: string
    available: boolean
    checking: boolean
    installGuide: string | VNode
    icon: object
}

const envItems = reactive<EnvCheckItem[]>([
    { name: 'Node.js', key: 'node', version: '', available: false, checking: true, installGuide: h('p', null, ['请访问 ', h('a', { href: 'https://nodejs.org', target: '_blank' }, 'https://nodejs.org'), ' 下载安装 LTS 版本']), icon: RiCodeLine },
    { name: 'npm', key: 'npm', version: '', available: false, checking: true, installGuide: '安装 Node.js 后自动包含 npm，无需单独安装', icon: RiTerminalBoxLine },
    { name: 'Claude Code', key: 'claude', version: '', available: false, checking: true, installGuide: h('div', { class: 'paragraph-code' }, [h(TypographyParagraph, { copyable: { text: 'npm install -g @anthropic-ai/claude-code' } }, { default: () => h('pre', 'npm install -g @anthropic-ai/claude-code') }), h('p', { class: 'mt-2' }, '确保 Node.js 已安装后，在终端中执行以上命令。')]), icon: RiRobot2Line }
])
const envColumns = [
    { title: '检测项目', dataIndex: 'name', key: 'name' },
    { title: '版本', key: 'version', className: '' },
    { title: '状态', key: 'status', className: '' }
]

const shellType = ref('')
const installGuideItem = ref<EnvCheckItem | null>(null)
const showGuideModal = ref(false)

function showInstallGuide(item: EnvCheckItem): void {
    installGuideItem.value = item
    showGuideModal.value = true
}

function closeInstallGuide(): void {
    showGuideModal.value = false
}

async function runEnvCheck(): Promise<void> {
    shellType.value = os === 'mac' ? 'zsh' : os === 'win' ? 'powershell' : 'bash'

    async function checkOne(key: string, channel: string): Promise<{ key: string; success: boolean; version: string }> {
        try {
            const r = await window.electronAPI.invoke<{ success: boolean; version: string }>(channel as any)
            return { key, success: r.success, version: r.version }
        } catch {
            return { key, success: false, version: '检测失败' }
        }
    }

    const results = await Promise.all([
        checkOne('node', 'system:check-node'),
        checkOne('npm', 'system:check-npm'),
        checkOne('claude', 'system:check-claude')
    ])

    for (const r of results) {
        const item = envItems.find(i => i.key === r.key)
        if (item) {
            item.version = r.version ?? ''
            item.available = r.success
            item.checking = false
        }
    }
}

// ---- Step 2: 安装 Claude Code ----
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

// ---- Step 4: 免登录配置 ----
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
    loginConfiguring.value = true
    try {
        const result = await window.electronAPI.invoke<{ success: boolean; error?: string }>('config:write', {
            hasCompletedOnboarding: true
        }, true)
        if (result.success) {
            await checkLoginStatus()
        } else {
            alert('配置失败: ' + (result.error ?? '未知错误'))
        }
    } catch (e) {
        alert('配置失败: ' + (e as Error).message)
    }
    loginConfiguring.value = false
}

// ---- 主题选择 ----
const selectedTheme = ref<'light' | 'dark'>(settingsStore.settings.theme === 'dark' ? 'dark' : 'light')

// ---- 模型商配置 ----
import { BUILTIN_PROVIDERS } from '../../shared/constants'
import { generateId } from '@/lib/utils'
import { useProviderStore } from '@/stores/providers'
import type { Provider } from '../../shared/types'
import ProviderFormModal from '@/views/ProviderFormModal.vue'

const providerStore2 = useProviderStore()
const builtinCards = computed(() =>
    BUILTIN_PROVIDERS.map(builtin => {
        const saved = providerStore2.providers.find(p => p.BASE_URL === builtin.BASE_URL)
        return {
            ...builtin,
            icon: saved?.icon || builtin.icon,
            id: saved?.id ?? '',
            AUTH_TOKEN: saved?.AUTH_TOKEN ?? '',
            saved: verifiedProviders.value.has(builtin.BASE_URL) || !!(saved?.AUTH_TOKEN)
        }
    })
)

const showProviderModal = ref(false)
const editingProvider = ref<(Provider & { id: string }) | null>(null)
const verifiedProviders = ref<Set<string>>(new Set())

function openEditCard(card: (typeof BUILTIN_PROVIDERS[number]) & { id: string; AUTH_TOKEN: string; saved: boolean }): void {
    if (card.saved) {
        const saved = providerStore2.providers.find(p => p.BASE_URL === card.BASE_URL)
        editingProvider.value = saved ?? null
    } else {
        editingProvider.value = { ...card } as Provider & { id: string }
    }
    showProviderModal.value = true
}

function openAddProvider(): void {
    editingProvider.value = null
    showProviderModal.value = true
}

function closeProviderModal(): void {
    showProviderModal.value = false
    editingProvider.value = null
}

async function onSaveProvider(data: Provider, verified: boolean): Promise<void> {
    const saveId = data.key || generateId()
    const existing = editingProvider.value?.id
        ? providerStore2.providers.find(p => p.id === editingProvider.value!.id)
        : providerStore2.providers.find(p => p.BASE_URL === data.BASE_URL)
    if (existing) {
        await providerStore2.update(existing.id, data)
        if (verified) verifiedProviders.value.add(data.BASE_URL)
    } else {
        await providerStore2.add({ id: saveId, ...data })
        if (verified) verifiedProviders.value.add(data.BASE_URL)
    }
    showProviderModal.value = false
    editingProvider.value = null
}

// ---- 导航 ----
function nextStep(): void {
    if (currentStep.value < steps.length - 1) currentStep.value++
}

function prevStep(): void {
    if (currentStep.value > 0) currentStep.value--
}

function skipWizard(): void {
    nextStep()
}

function finishWizard(): void {
    emit('complete')
}

onMounted(() => {
    runEnvCheck()
    checkClaudeInstall()
    checkLoginStatus()
})
</script>

<template>
    <div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-900">
        <!-- 标题 & 步骤条 -->
        <div class="mb-8 w-4xl">
            <a-typography-title :level="2" class="text-center mb-6!">
                欢迎使用 ClaudeKit
            </a-typography-title>
            <a-steps :current="currentStep" :items="steps" label-placement="vertical" />
        </div>

        <div class="bg-white dark:bg-[#141414] rounded-xl shadow-xl w-xl max-h-[85vh] min-h-102 overflow-y-auto flex flex-col">
            <!-- 步骤内容 -->
            <div class="flex-1 p-6 overflow-y-auto min-h-0">
                <!-- Step 0: 环境检测 -->
                <div v-if="currentStep === 0" class="space-y-4">
                    <a-typography-title :level="4" class="text-center">
                        环境检测
                    </a-typography-title>
                    <a-table :dataSource="envItems" :columns="envColumns" :pagination="false" rowKey="key">
                        <template #title>
                            <div class="flex items-center gap-2 -ml-3">
                                <RiTerminalBoxLine />
                                <span>Shell 类型：{{ shellType || '检测中...' }}</span>
                            </div>
                        </template>
                        <template #bodyCell="{ column, record }">
                            <template v-if="column.key === 'name'">
                                <div class="flex items-center gap-2">
                                    <component :is="record.icon" />
                                    <span>{{ record.name }}</span>
                                </div>
                            </template>
                            <template v-else-if="column.key === 'version'">
                                <template v-if="record.checking">
                                    <span class="">检测中...</span>
                                </template>
                                <template v-else-if="record.available">
                                    <span class="">{{ record.version }}</span>
                                </template>
                                <template v-else>
                                    <a-button @click="showInstallGuide(record)">
                                        安装
                                    </a-button>
                                </template>
                            </template>
                            <template v-else-if="column.key === 'status'">
                                <template v-if="record.checking">
                                    <span class="">--</span>
                                </template>
                                <template v-else-if="record.available">
                                    <span class="flex items-center gap-1 text-green-600">
                                        <RiCheckboxCircleLine />
                                        可用
                                    </span>
                                </template>
                                <template v-else>
                                    <span class="text-red-500">不可用</span>
                                </template>
                            </template>
                        </template>
                    </a-table>
                </div>

                <!-- Step 1: 安装 Claude Code -->
                <div v-if="currentStep === 1" class="space-y-3">
                    <a-typography-title :level="4" class="text-center">
                        安装 Claude Code
                    </a-typography-title>

                    <template v-if="!claudeInstallLog">
                        <a-result v-if="claudeInstalled" status="success" title="Claude Code 已安装"
                            :sub-title="claudeVersion" />
                        <a-result v-else status="warning" title="未检测到 Claude Code" sub-title="请点击下方按钮自动安装，也可手动复制命令安装">
                            <template #extra>
                                <a-button type="primary" @click="installClaude">
                                    一键安装 Claude Code
                                </a-button>
                                <div class="mt-4 text-xs">
                                    <a-typography-text code copyable>
                                        npm install -g @anthropic-ai/claude-code
                                    </a-typography-text>
                                </div>
                            </template>
                        </a-result>
                    </template>
                    <template v-else>
                        <a-result :title="installingClaude ? '正在安装 Claude Code' : '安装成功'">
                            <template #icon>
                                <a-spin v-if="installingClaude" size="large" />
                                <CheckCircleFilled v-else class="text-2xl text-green-500" />
                            </template>
                            <pre class="text-xs max-h-40 overflow-y-auto">{{ claudeInstallLog }}</pre>
                        </a-result>
                    </template>

                </div>

                <!-- Step 2: 配置模型商 -->
                <div v-if="currentStep === 2" class="space-y-4">
                    <a-typography-title :level="4" class="text-center">
                        配置模型商
                    </a-typography-title>

                    <div class="grid grid-cols-3 gap-2">
                        <div v-for="card in builtinCards" :key="card.name"
                            class="relative flex flex-col items-center justify-center gap-2 p-4 rounded-md border cursor-pointer transition-all h-16"
                            :class="card.saved
                                ? 'border-green-500/50 bg-green-500/5'
                                : 'border-neutral-200 dark:border-neutral-600 hover:border-blue-500 bg-white dark:bg-white/5 hover:dark:bg-blue-500/10'"
                            @click="openEditCard(card)">
                            <div class="w-8 h-8 flex items-center justify-center">
                                <img v-if="card.icon" :src="card.icon" class="block w-full h-full" />
                                <span v-else>{{ card.name.charAt(0) }}</span>
                            </div>
                            <span class="font-semibold text-xs dark:text-neutral-200">{{ card.name }}</span>
                            <a-tag v-if="card.saved" color="green" class="absolute top-1 right-1 m-0!">已配置</a-tag>
                        </div>

                        <div @click="openAddProvider"
                            class="flex flex-col items-center justify-center gap-2 p-4 rounded-md border border-dashed border-neutral-300 dark:border-neutral-500 cursor-pointer hover:border-blue-500 bg-white dark:bg-white/5 hover:dark:bg-blue-500/10 transition-all h-16">
                            <span
                                class="w-8 h-8 flex items-center justify-center bg-neutral-100 dark:bg-white/5 rounded-full">
                                <RiAddLine />
                            </span>
                            <span class="text-xs">添加模型商</span>
                        </div>
                    </div>
                </div>

                <!-- Step 3: 免登录配置 -->
                <div v-if="currentStep === 3" class="space-y-3">
                    <a-typography-title :level="4" class="text-center">
                        Claude 免登录配置
                    </a-typography-title>
                    <a-result v-if="loginConfigured" status="success" title="免登录已配置" sub-title="已配置Claude免交互登录" />
                    <div v-else class="space-y-3">
                        <a-alert message="重要配置项"
                            description="将在 ~/.claude.json 中设置 hasCompletedOnboarding = true，使 Claude Code 免交互登录。"
                            type="info" show-icon class="mb-4!" />
                        <a-button type="primary" :disabled="loginConfiguring" @click="setupLogin" block>
                            {{ loginConfiguring ? '配置中...' : '一键配置免登录' }}
                        </a-button>
                    </div>
                </div>

                <!-- Step 4: 完成 -->
                <div v-if="currentStep === 4" class="space-y-5 py-2">
                    <a-result status="success" title="配置完成" sub-title="所有配置已完成，现在可以开始使用了！" />

                    <!-- 主题选择 -->
                    <div class="flex gap-3 justify-center">
                        <button
                            class="flex-1 max-w-36 px-4 py-3 rounded-lg border text-xs text-center transition-all cursor-pointer dark:text-white"
                            :class="selectedTheme === 'light'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                : 'border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500 bg-white dark:bg-neutral-700/50'"
                            @click="selectedTheme = 'light'; settingsStore.updateTheme('light')">
                            <RiSunLine class="w-5 h-5 mx-auto mb-2" />
                            <div class="font-medium text-neutral-700 dark:text-neutral-200">浅色模式</div>
                        </button>
                        <button
                            class="flex-1 max-w-36 px-4 py-3 rounded-lg border text-xs text-center transition-all cursor-pointer dark:text-white"
                            :class="selectedTheme === 'dark'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                : 'border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500 bg-white dark:bg-neutral-700/50'"
                            @click="selectedTheme = 'dark'; settingsStore.updateTheme('dark')">
                            <RiMoonLine class="w-5 h-5 mx-auto mb-2" />
                            <div class="font-medium text-neutral-700 dark:text-neutral-200">深色模式</div>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 导航按钮 -->
        <div class="mt-8 w-xl shrink-0 flex items-center justify-between">
            <a-button @click="skipWizard" size="large">
                跳过
            </a-button>
            <div class="flex gap-2">
                <a-button v-if="currentStep > 0" @click="prevStep" size="large">
                    上一步
                </a-button>
                <a-button v-if="currentStep < steps.length - 1" type="primary" size="large" @click="nextStep">
                    下一步
                </a-button>
                <a-button v-if="currentStep === steps.length - 1" type="primary"
                    class="bg-green-600 hover:bg-green-500 border-green-600 text-xs" @click="finishWizard">
                    完成
                </a-button>
            </div>
        </div>

        <!-- 安装指引弹窗 -->
        <a-modal v-model:open="showGuideModal" :title="`${installGuideItem?.name ?? ''} — 安装方法`" centered
            @cancel="closeInstallGuide">
            <template v-if="installGuideItem && typeof installGuideItem.installGuide === 'string'">
                {{ installGuideItem.installGuide }}
            </template>
            <div v-else-if="installGuideItem" class="">
                <component :is="installGuideItem.installGuide" />
            </div>
            <template #footer>
                <a-button type="primary" @click="closeInstallGuide">关闭</a-button>
            </template>
        </a-modal>

        <!-- 模型商配置弹窗 -->
        <ProviderFormModal :visible="showProviderModal" :provider="editingProvider" :is-new="!editingProvider" @close="closeProviderModal"
            @save="onSaveProvider" />
    </div>
</template>

<style lang="less" scoped>
:deep(.ant-steps) {
    .ant-steps-item-icon {
        margin-inline-start: 48px;
    }

    .ant-steps-item-content {
        width: 134px;
    }
}
</style>