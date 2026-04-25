<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getOs } from '@/lib/utils'
import { useTerminalStore } from '@/stores/terminal'
import { useProviderStore } from '@/stores/providers'
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'
import Toolbar from '@/views/Toolbar.vue'
import TerminalTab from '@/views/TerminalTab.vue'
import TaskDrawer from '@/views/TaskDrawer.vue'
import SetupWizard from '@/views/SetupWizard.vue'
import ProviderConfig from '@/views/ProviderConfig.vue'
import Settings from '@/views/Settings.vue'
import EnvManager from '@/views/EnvManager.vue'
import HelpDocs from '@/views/HelpDocs.vue'
import About from '@/views/About.vue'
import { Button } from '@/components/ui/button'

const os = getOs()

const terminalStore = useTerminalStore()
const providerStore = useProviderStore()
const settingsStore = useSettingsStore()
const { tabs, activeTabId } = storeToRefs(terminalStore)
const { settings } = storeToRefs(settingsStore)

const isDark = computed(() => settings.value.theme === 'dark')

// Track env vars per tab
const tabEnvVars = ref<Record<string, Record<string, string>>>({})

// Track terminal component refs
const terminalRefs = ref<Record<string, InstanceType<typeof TerminalTab>>>({})

// Drawer / Modal states
const showTaskDrawer = ref(false)
const showWizard = ref(false)
const activePanel = ref<string | null>(null)

// App version
const appVersion = ref('0.1.0')
const claudeVersion = ref('--')

onMounted(async () => {
    await settingsStore.fetchSettings()
    await terminalStore.fetchTabs()
    await providerStore.fetchProviders()

    // 首次启动检测：loginMode 为空字符串表示未完成引导
    if (!settings.value.loginMode || settings.value.loginMode === '') {
        showWizard.value = true
    }

    if (tabs.value.length === 0) {
        terminalStore.addTab('terminal')
    }

    if (activeTabId.value && providerStore.activeProviderId) {
        tabEnvVars.value[activeTabId.value] = providerStore.getEnvVars()
    }

    // 检测 Claude Code 版本
    try {
        const result = await window.electronAPI.invoke<{ success: boolean; version: string }>('system:check-claude')
        if (result.success && result.version) {
            claudeVersion.value = result.version
        }
    } catch { /* ignore */ }
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

function onSelectTab(id: string): void {
    terminalStore.setActive(id)
}

function onApplyProvider(envVars: Record<string, string>): void {
    const confirmed = confirm('切换模型商将重启当前终端，是否继续？')
    if (!confirmed) return

    const id = activeTabId.value
    if (id) {
        tabEnvVars.value[id] = envVars
        tabEnvVars.value = { ...tabEnvVars.value }
    }
}

function onOpenDrawer(menu: string): void {
    activePanel.value = activePanel.value === menu ? null : menu
}

function closePanel(): void {
    activePanel.value = null
}

function onTerminalReady(_sessionId: string, _tabId: string): void {
    // Terminal ready handler
}

function onTerminalExit(_sessionId: string, _tabId: string): void {
    // Terminal exit handler
}

function onWizardComplete(): void {
    showWizard.value = false
    settingsStore.updateLoginMode('completed')
    tabEnvVars.value = { ...tabEnvVars.value }
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

function tabKey(id: string): string {
    const env = tabEnvVars.value[id]
    return `${id}-${env ? JSON.stringify(env) : 'default'}`
}

// Panel component mapping
const panelComponents: Record<string, unknown> = {
    providerConfig: ProviderConfig,
    settings: Settings,
    envManager: EnvManager,
    help: HelpDocs,
    about: About
}

const panelTitles: Record<string, string> = {
    providerConfig: '模型商配置',
    settings: '设置',
    envManager: '环境变量管理',
    help: '帮助文档',
    about: '关于'
}
</script>

<template>
    <div
        class="h-screen w-screen flex flex-col overflow-hidden"
        :class="isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800'"
    >
        <!-- 标签栏 -->
        <div
            class="drag-region h-10 w-full shrink-0 flex items-end border-b border-slate-700"
            :class="os === 'mac' ? 'pl-20' : ''"
        >
            <div class="tab-bar flex items-center h-8 px-1 gap-0.5">
                <div
                    v-for="tab in tabs"
                    :key="tab.id"
                    class="tab-item flex items-center gap-1 px-3 py-1 text-xs rounded-t cursor-pointer select-none transition-colors"
                    :class="tab.id === activeTabId
                        ? 'bg-slate-800 text-slate-200 border-t border-x border-slate-700'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'"
                    @click="onSelectTab(tab.id)"
                >
                    <span class="max-w-32 truncate">{{ tab.title }}</span>
                    <Button
                        v-if="tabs.length > 1"
                        variant="ghost"
                        size="sm"
                        class="ml-1 w-4 h-4 rounded-full text-slate-600 hover:text-slate-300 hover:bg-slate-700 text-xs p-0"
                        @click.stop="onCloseTab(tab.id)"
                    >
                        ×
                    </Button>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    class="tab-add ml-1 w-6 h-6 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-700 text-sm p-0"
                    @click="onAddTab"
                >
                    +
                </Button>
            </div>
        </div>

        <!-- 工具栏 -->
        <div class="toolbar h-10 w-full shrink-0 border-b border-slate-700">
            <Toolbar
                @apply-provider="onApplyProvider"
                @open-task-drawer="showTaskDrawer = !showTaskDrawer"
                @open-menu="onOpenDrawer"
            />
        </div>

        <!-- 终端主体 -->
        <div class="terminal-area flex-1 min-h-0">
            <div
                v-for="tab in tabs"
                :key="tabKey(tab.id)"
                v-show="tab.id === activeTabId"
                class="h-full w-full"
            >
                <TerminalTab
                    :ref="(el: any) => { if (el) terminalRefs[tab.id] = el }"
                    :session-id="tab.id"
                    :env-vars="tabEnvVars[tab.id]"
                    @ready="(sid: string) => onTerminalReady(sid, tab.id)"
                    @exit="(sid: string) => onTerminalExit(sid, tab.id)"
                />
            </div>
        </div>

        <!-- 任务 Drawer -->
        <div
            v-if="showTaskDrawer"
            class="absolute top-20 left-4 right-4 bg-slate-800 border border-slate-700 rounded-b shadow-lg z-40 max-h-96 overflow-y-auto"
        >
            <TaskDrawer @close="showTaskDrawer = false" @run-task="onRunTask" />
        </div>

        <!-- 首次启动引导向导 -->
        <div
            v-if="showWizard"
            class="absolute inset-0 z-50 flex items-start justify-center pt-12"
        >
            <div class="bg-black/70 w-full h-full absolute inset-0" />
            <div class="relative bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto z-10">
                <SetupWizard
                    @close="showWizard = false"
                    @complete="onWizardComplete"
                />
            </div>
        </div>

        <!-- 面板 Modal/Drawer -->
        <div
            v-if="activePanel"
            class="absolute inset-0 z-50 flex items-start justify-center pt-16"
            @click.self="closePanel"
        >
            <div class="bg-slate-800/60 w-full h-full absolute inset-0" @click="closePanel" />
            <div class="relative bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-w-lg w-full max-h-[70vh] overflow-y-auto z-10">
                <div class="sticky top-0 bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-between z-20">
                    <span class="text-xs font-medium text-slate-300">{{ panelTitles[activePanel] ?? activePanel }}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        class="text-slate-500 hover:text-slate-300 text-sm p-0 h-auto"
                        @click="closePanel"
                    >
                        ✕
                    </Button>
                </div>

                <ProviderConfig v-if="activePanel === 'providerConfig'" @close="closePanel" />
                <Settings v-if="activePanel === 'settings'" @close="closePanel" />
                <EnvManager v-if="activePanel === 'envManager'" @close="closePanel" />
                <HelpDocs v-if="activePanel === 'help'" @close="closePanel" />
                <About v-if="activePanel === 'about'" @close="closePanel" />
            </div>
        </div>

        <!-- 底部状态栏 -->
        <div class="status-bar h-6 w-full shrink-0 flex items-center justify-between px-3 text-xs text-slate-500 border-t border-slate-700 bg-slate-900">
            <span>claude {{ claudeVersion }}</span>
            <span>v{{ appVersion }}</span>
        </div>
    </div>
</template>

<style>
.drag-region {
    -webkit-app-region: drag;
}
.drag-region button,
.drag-region .tab-item,
.drag-region .tab-add {
    -webkit-app-region: no-drag;
}
</style>
