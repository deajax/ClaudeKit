<script setup lang="ts">
import { h, ref, onMounted, computed, watch, nextTick } from 'vue'
import { getOs } from '@/lib/utils'
import { useTerminalStore } from '@/stores/terminal'
import { useProviderStore } from '@/stores/providers'
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'
import { theme, message } from 'ant-design-vue'
import Toolbar from '@/views/Toolbar.vue'
import TerminalTab from '@/views/TerminalTab.vue'
import TaskDrawer from '@/views/TaskDrawer.vue'
import SetupWizard from '@/views/SetupWizard.vue'
import ProviderConfig from '@/views/ProviderConfig.vue'
import Settings from '@/views/Settings.vue'
import EnvManager from '@/views/EnvManager.vue'
import HelpDocs from '@/views/HelpDocs.vue'
import About from '@/views/About.vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN';
import {
    RiSubtractLine,
    RiFullscreenLine,
    RiCloseFill,
    RiWalletLine,
} from '@remixicon/vue'

const os = getOs()
const locale = zhCN

const terminalStore = useTerminalStore()
const providerStore = useProviderStore()
const settingsStore = useSettingsStore()
const { tabs, activeTabId } = storeToRefs(terminalStore)
const { settings } = storeToRefs(settingsStore)

const isDark = computed(() => settings.value.theme === 'dark')

const themeConfig = computed(() => ({
    algorithm: isDark.value ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
        colorBorder: isDark.value ? '#424242' : '#e5e5e5',
        colorBorderSecondary: isDark.value ? '#303030' : '#e5e5e5',
    },
}))

// Track env vars per tab
const tabEnvVars = ref<Record<string, Record<string, string>>>({})

// Track terminal component refs
const terminalRefs = ref<Record<string, InstanceType<typeof TerminalTab>>>({})

// 标记终端重建后需要自动启动 Claude
const pendingClaudeStart = new Set<string>()

// Drawer / Modal states
const showTaskDrawer = ref(false)
const showWizard = ref(false)
const showProviderConfig = ref(false)
const showSettings = ref(false)
const showEnvManager = ref(false)
const showHelp = ref(false)
const showAbout = ref(false)

// App version
const appVersion = ref('0.1.0')
const claudeVersion = ref('--')

const claudeNotInstalled = computed(() => !claudeVersion.value || claudeVersion.value === '--' || claudeVersion.value === '未安装')

function applyThemeClass(dark: boolean): void {
    // 添加过渡 class 触发主题切换动画
    document.documentElement.classList.add('theme-transitioning')
    if (dark) {
        document.documentElement.classList.add('dark')
    } else {
        document.documentElement.classList.remove('dark')
    }
    // 过渡结束后移除 class，避免影响后续操作
    setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning')
    }, 350)
}

// 监听主题变化，同步切换 <html> 的 dark class
watch(isDark, (val) => applyThemeClass(val))

function getPopupContainer(): HTMLElement {
    return document.getElementById('app') || document.body
}

onMounted(async () => {
    await settingsStore.fetchSettings()
    // 初始化暗色 class
    applyThemeClass(settings.value.theme === 'dark')
    await terminalStore.fetchTabs()
    await providerStore.fetchProviders()

    // 首次启动检测：wizardCompleted 不为 true 则表示未完成引导
    if (!settings.value.wizardCompleted) {
        showWizard.value = true
    }

    if (tabs.value.length === 0) {
        const id = terminalStore.addTab('terminal')
        // 新建 tab 时同步设置 env vars，确保终端创建时能拿到
        if (providerStore.activeProviderId) {
            tabEnvVars.value[id] = providerStore.getEnvVars()
        }
    } else if (activeTabId.value && providerStore.activeProviderId) {
        tabEnvVars.value[activeTabId.value] = providerStore.getEnvVars()
    }

    // 检测 Claude Code 版本
    try {
        const result = await window.electronAPI.invoke<{ success: boolean; version: string }>('system:check-claude')
        if (result.success && result.version) {
            claudeVersion.value = result.version
        }
    } catch { /* ignore */ }

    // 启动时自动查询一次余额
    tryFetchBalance()
})

function onAddTab(): void {
    const envVars = providerStore.activeProviderId
        ? providerStore.getEnvVars()
        : {}
    const id = terminalStore.addTab()
    tabEnvVars.value[id] = envVars
}

function onCloseTab(id: string): void {
    if (tabs.value.length <= 1) {
        alert('至少保留一个终端标签页')
        return
    }
    const closed = terminalStore.closeTab(id)
    if (closed) {
        delete tabEnvVars.value[id]
        tabEnvVars.value = { ...tabEnvVars.value }
    }
}

async function onApplyProvider(_envVars: Record<string, string>): Promise<void> {
    const p = providerStore.activeProvider
    message.success(p ? `已应用「${p.name}」` : '已应用')

    // 将环境变量写入 shell 配置文件（.zshrc / .bashrc / PowerShell Profile）
    if (window.electronAPI) {
        const vars = providerStore.getEnvVars()
        const result = await window.electronAPI.invoke<{ success: boolean; path?: string; error?: string }>('env:export-vars', vars)
        if (result.success) {
            console.log('环境变量已写入:', result.path)
        }
    }
    // 切换模型商后自动刷新余额
    tryFetchBalance()
}

const balanceLoading = ref(false)
const balanceDisplay = ref('')

// 余额自动查询限频（30 秒内不重复查询）
const lastBalanceQuery = ref(0)
const MIN_BALANCE_INTERVAL = 30_000

/** 核心查询逻辑，不关心 loading/消息 */
async function doFetchBalance(): Promise<void> {
    const p = providerStore.activeProvider
    if (!p?.balanceApi || !p?.AUTH_TOKEN) return

    balanceDisplay.value = ''
    try {
        const result = await window.electronAPI.invoke<{ success: boolean; data?: unknown; error?: string }>(
            'system:balance-query', p.balanceApi, p.AUTH_TOKEN
        )
        if (result.success && result.data) {
            const d = result.data as Record<string, unknown>

            if (d?.balance_infos && Array.isArray(d.balance_infos)) {
                balanceDisplay.value = (d.balance_infos as Array<Record<string, unknown>>)
                    .map(b => `${b.currency ?? ''} ${b.total_balance ?? '-'}`)
                    .join(', ')
            } else if (d?.total_credits !== undefined) {
                balanceDisplay.value = `Credits: ${d.total_credits}`
            } else if (d?.total !== undefined) {
                balanceDisplay.value = `Total: ${d.total}`
            } else if (d?.balance !== undefined) {
                balanceDisplay.value = `Balance: ${d.balance}`
            } else {
                balanceDisplay.value = JSON.stringify(d)
            }
        }
    } catch { /* 自动查询静默失败 */ }
}

/** 手动点击查余额 — 跳过限频，显示 loading 和结果消息 */
async function onQueryBalance(): Promise<void> {
    const p = providerStore.activeProvider
    if (!p?.balanceApi || !p?.AUTH_TOKEN) {
        message.warning('当前模型商未配置余额查询 API')
        return
    }
    lastBalanceQuery.value = 0 // 跳过限频
    balanceLoading.value = true
    await doFetchBalance()
    balanceLoading.value = false
    if (balanceDisplay.value) {
        message.success(`余额: ${balanceDisplay.value}`)
    } else {
        message.error('查询失败')
    }
}

/** 自动触发查询 — 受限频保护，静默执行 */
async function tryFetchBalance(): Promise<void> {
    const now = Date.now()
    if (now - lastBalanceQuery.value < MIN_BALANCE_INTERVAL) return
    lastBalanceQuery.value = now
    await doFetchBalance()
}

function handleTabEdit(key: string | number | MouseEvent, action: 'add' | 'remove'): void {
    if (action === 'add') {
        onAddTab()
    } else if (action === 'remove') {
        onCloseTab(key as string)
    }
}

function onOpenDrawer(menu: string): void {
    switch (menu) {
        case 'providerConfig': showProviderConfig.value = !showProviderConfig.value; break
        case 'settings': showSettings.value = !showSettings.value; break
        case 'envManager': showEnvManager.value = !showEnvManager.value; break
        case 'help': showHelp.value = !showHelp.value; break
        case 'about': showAbout.value = !showAbout.value; break
    }
}

function onTerminalReady(_sessionId: string, tabId: string): void {
    // 如果是因启动 Claude 触发的重建，重建完成后自动启动
    if (pendingClaudeStart.has(tabId)) {
        pendingClaudeStart.delete(tabId)
        nextTick(() => {
            terminalRefs.value[tabId]?.startClaude?.()
        })
    }
}

function handleStartClaude(tabId: string): void {
    if (!tabId) return
    const ref = terminalRefs.value[tabId]
    if (!ref) return

    const envVars = providerStore.getEnvVars()
    const current = tabEnvVars.value[tabId] ?? {}

    if (JSON.stringify(envVars) !== JSON.stringify(current)) {
        // 环境变量变了，重建终端后再启动 Claude
        pendingClaudeStart.add(tabId)
        tabEnvVars.value[tabId] = envVars
        tabEnvVars.value = { ...tabEnvVars.value }
    } else {
        ref.startClaude?.()
    }
    // 启动任务后自动刷新余额
    tryFetchBalance()
}

function onTerminalExit(_sessionId: string, _tabId: string): void {
    // Terminal exit handler
}

function onWizardComplete(): void {
    showWizard.value = false
    settingsStore.updateWizardCompleted(true)
}

function onRunTask(task: { id: string; name: string; command: string; cwd: string; providerId: string }): void {
    showTaskDrawer.value = false
    const envVars = providerStore.activeProviderId
        ? providerStore.getEnvVars(task.providerId || providerStore.activeProviderId)
        : {}
    const id = terminalStore.addTab(task.name, task.cwd)
    tabEnvVars.value[id] = envVars

    // 等待终端创建完成后发送命令
    setTimeout(() => {
        const ref = terminalRefs.value[id]
        ref?.sendText?.(task.command)
    }, 600)
}

</script>

<template>
    <a-config-provider :theme="themeConfig" :locale="locale" :get-popup-container="getPopupContainer">
        <!-- 首次启动引导向导 -->
        <SetupWizard v-if="showWizard" @close="showWizard = false" @complete="onWizardComplete" />

        <a-layout class="h-screen w-screen overflow-hidden"
            :class="isDark ? 'bg-neutral-800 text-neutral-100' : 'bg-neutral-200! text-neutral-800'">
            <!-- 标签栏 -->
            <a-layout-header class="drag-region h-auto! flex bg-transparent! leading-normal! px-0!"
                :class="os === 'mac' ? 'pl-20!' : ''">
                <a-tabs v-model:activeKey="activeTabId" type="editable-card" @edit="handleTabEdit"
                    class="tab-bar-theme nodrag-region pt-2! px-2! flex-initial overflow-hidden">
                    <a-tab-pane v-for="tab in tabs" :key="tab.id" :tab="tab.title" :closable="tabs.length > 1" />
                </a-tabs>

                <div v-if="os === 'win'" class="ml-auto flex h-full windows-controls nodrag-region">
                    <div class="windows-controls--item">
                        <RiSubtractLine class="text-base" />
                    </div>
                    <div class="windows-controls--item">
                        <RiFullscreenLine class="text-sm" />
                    </div>
                    <div class="windows-controls--item hover:bg-red-600! hover:text-white">
                        <RiCloseFill class="text-lg" />
                    </div>
                </div>
            </a-layout-header>

            <!-- 工具栏 -->
            <div
                class="w-full py-2 px-4 shrink-0 border-b border-neutral-100 bg-white dark:bg-neutral-900 dark:border-neutral-800">
                <Toolbar :claude-running="terminalRefs[activeTabId ?? '']?.claudeRunning ?? false"
                    @apply-provider="onApplyProvider" @open-task-drawer="showTaskDrawer = !showTaskDrawer"
                    @open-menu="onOpenDrawer" @start-claude="handleStartClaude(activeTabId ?? '')"
                    @stop-claude="terminalRefs[activeTabId ?? '']?.stopClaude?.()" />
            </div>

            <!-- 终端主体 -->
            <a-layout-content class="terminal-area flex-1 min-h-0 bg-white dark:bg-neutral-900">
                <div v-for="tab in tabs" :key="tab.id" v-show="tab.id === activeTabId" class="h-full w-full">
                    <TerminalTab :ref="(el: any) => { if (el) terminalRefs[tab.id] = el }" :session-id="tab.id"
                        :env-vars="tabEnvVars[tab.id]" @ready="(sid: string) => onTerminalReady(sid, tab.id)"
                        @exit="(sid: string) => onTerminalExit(sid, tab.id)" />
                </div>
            </a-layout-content>

            <!-- 底部状态栏 -->
            <a-layout-footer
                class="text-xs! p-0! bg-white! border-t border-t-neutral-100 dark:bg-neutral-900! dark:border-t-neutral-800! flex items-center justify-between">
                <div class="flex items-center gap-2 px-4">
                    <span v-if="claudeNotInstalled" class="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <span class="inline-block w-2 h-2 rounded-full bg-amber-500" />
                            Claude 未安装
                            <a-button type="link" size="small" class="text-xs! px-1!" @click="showWizard = true">
                                运行安装向导
                            </a-button>
                        </span>
                        <span v-else>Claude {{ claudeVersion }}</span>
                    <a-button type="text" :icon="h(RiWalletLine)" class="rounded-none! text-xs!" size="small"
                        v-if="providerStore.activeProvider?.balanceApi" @click="onQueryBalance">
                        <span v-if="balanceDisplay" v-text="balanceDisplay" />
                        <span v-else>查余额</span>
                    </a-button>
                </div>
                <div class="px-4"> v{{ appVersion }}</div>
            </a-layout-footer>
        </a-layout>

        <!-- 任务 Drawer -->
        <a-drawer v-model:open="showTaskDrawer" title="运行任务" placement="top" height="auto" :bodyStyle="{ padding: 0 }"
            destroy-on-close @close="showTaskDrawer = false" rootClassName="task-drawer">
            <TaskDrawer @close="showTaskDrawer = false" @run-task="onRunTask" />
        </a-drawer>

        <!-- 面板 Modals -->
        <ProviderConfig :visible="showProviderConfig" @close="showProviderConfig = false" />
        <Settings :visible="showSettings" @close="showSettings = false" @reopen-wizard="showSettings = false; showWizard = true" />
        <EnvManager :visible="showEnvManager" @close="showEnvManager = false" />
        <HelpDocs :visible="showHelp" @close="showHelp = false" />
        <About :visible="showAbout" @close="showAbout = false" />
    </a-config-provider>
</template>

<style lang="less">
body {
    background: #f3f3f3;
}

.drag-region {
    -webkit-app-region: drag;
}

.nodrag-region {
    -webkit-app-region: no-drag;
}

/* a-tabs 仅作标签栏使用，隐藏内容面板 */
.tab-bar-theme {
    .ant-tabs-content-holder {
        display: none;
    }

    .ant-tabs-nav {
        margin-bottom: 0;
        padding-left: 4px;

        .ant-tabs-tab,
        .ant-tabs-nav-add {
            border: 0;

        }
    }
}


.windows-controls {
    &--item {
        height: 100%;
        max-height: 48px;
        aspect-ratio: 1/1;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;

        &:hover {
            background: fade(black, 10%);
        }
    }
}

.ant-tabs-dropdown {
    .ant-tabs-dropdown-menu-item-remove {
        float: right;
        line-height: 22px;
        padding: 0;
    }
}

.task-drawer {
    .ant-drawer-content-wrapper {
        width: 640px;
        top: 16px;
        left: 0;
        right: 0;
        margin: auto;
    }

    .ant-drawer-content {
        border-radius: 8px;
    }
}

/* 全局主题切换过渡动画 — 只作用于 .theme-transitioning 激活期间 */
html.theme-transitioning,
html.theme-transitioning *,
html.theme-transitioning *::before,
html.theme-transitioning *::after {
    transition: background-color 0.3s ease,
        border-color 0.3s ease,
        color 0.3s ease,
        box-shadow 0.3s ease !important;
}
</style>
