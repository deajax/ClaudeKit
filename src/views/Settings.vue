<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'

const emit = defineEmits<{
    close: []
}>()

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const loginConfigured = ref(false)

const fontFamily = computed({
    get: () => settings.value.fontFamily,
    set: (v: string) => settingsStore.updateFontFamily(v)
})

const scrollback = computed({
    get: () => settings.value.scrollback,
    set: (v: number) => settingsStore.updateScrollback(v)
})

const shell = computed({
    get: () => settings.value.shell,
    set: (v: string) => settingsStore.updateShell(v)
})

onMounted(async () => {
    await settingsStore.fetchSettings()
    checkLoginStatus()
})

async function checkLoginStatus(): Promise<void> {
    try {
        const result = await window.electronAPI.invoke<{ success: boolean; data?: { hasCompletedOnboarding?: boolean } }>('config:read')
        loginConfigured.value = result.data?.hasCompletedOnboarding === true
    } catch {
        loginConfigured.value = false
    }
}

async function onToggleTheme(): Promise<void> {
    const newTheme = settings.value.theme === 'dark' ? 'light' : 'dark'
    settingsStore.updateTheme(newTheme)
}

function onFontSizeChange(e: Event): void {
    const val = parseInt((e.target as HTMLInputElement).value)
    settingsStore.updateFontSize(val)
}

async function onSetupLogin(): Promise<void> {
    const confirmed = confirm(
        '即将在 ~/.claude.json 中设置 hasCompletedOnboarding = true。\n\n此操作可能需要系统权限授权，是否继续？'
    )
    if (!confirmed) return

    try {
        const result = await window.electronAPI.invoke<{ success: boolean; error?: string }>('config:write', {
            hasCompletedOnboarding: true
        }, true)
        if (result.success) {
            loginConfigured.value = true
            alert('免登录配置完成，请重启终端使配置生效')
        } else {
            alert('配置失败: ' + (result.error ?? '未知错误'))
        }
    } catch (e) {
        alert('配置失败: ' + (e as Error).message)
    }
}

async function onResetSettings(): Promise<void> {
    if (confirm('确定重置所有设置为默认值？')) {
        await settingsStore.resetToDefaults()
    }
}

async function onResetProviders(): Promise<void> {
    if (confirm('确定重置所有模型商为内置默认值？这会丢失自定义模型商。')) {
        try {
            const result = await window.electronAPI.invoke<{ success: boolean; error?: string }>('provider:reset')
            if (result.success) {
                alert('模型商已重置为默认值')
            } else {
                alert('重置失败: ' + (result.error ?? '未知错误'))
            }
        } catch (e) {
            alert('重置失败: ' + (e as Error).message)
        }
    }
}

async function onResetTasks(): Promise<void> {
    if (confirm('确定重置所有任务为内置默认值？这会丢失自定义任务。')) {
        try {
            const result = await window.electronAPI.invoke<{ success: boolean; error?: string }>('task:reset')
            if (result.success) {
                alert('任务已重置为默认值')
            } else {
                alert('重置失败: ' + (result.error ?? '未知错误'))
            }
        } catch (e) {
            alert('重置失败: ' + (e as Error).message)
        }
    }
}

function onOpenIssues(): void {
    window.open('https://github.com/user/claude-cli-desktop/issues', '_blank')
}

function onOpenRepo(): void {
    window.open('https://github.com/user/claude-cli-desktop', '_blank')
}
</script>

<template>
    <div class="settings-panel p-4 space-y-5">
        <h3 class="text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-4">设置</h3>

        <!-- 主题 -->
        <div class="flex items-center justify-between">
            <span class="text-xs text-neutral-500 dark:text-neutral-400">主题</span>
            <a-button  class="text-xs" @click="onToggleTheme">
                {{ settings.theme === 'dark' ? '🌙 深色' : '☀️ 浅色' }}
            </a-button>
        </div>

        <!-- 字体大小 -->
        <div class="flex items-center justify-between">
            <span class="text-xs text-neutral-500 dark:text-neutral-400">终端字号</span>
            <input
                type="range"
                min="10"
                max="28"
                :value="settings.fontSize"
                class="w-32"
                @change="onFontSizeChange"
            />
            <span class="text-xs text-neutral-600 dark:text-neutral-300 w-8">{{ settings.fontSize }}px</span>
        </div>

        <!-- 字体 -->
        <div>
            <label class="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">终端字体</label>
            <a-input
                v-model:value="fontFamily"
                                class="bg-white dark:bg-neutral-900 text-xs h-8"
            />
        </div>

        <!-- 回滚缓冲 -->
        <div class="flex items-center justify-between">
            <span class="text-xs text-neutral-500 dark:text-neutral-400">回滚缓冲</span>
            <a-select v-model:value="scrollback" class="w-40" >
                <a-select-option :value="500">500 行</a-select-option>
                <a-select-option :value="1000">1000 行</a-select-option>
                <a-select-option :value="5000">5000 行</a-select-option>
                <a-select-option :value="10000">10000 行</a-select-option>
            </a-select>
        </div>

        <!-- Shell 类型 -->
        <div>
            <label class="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Shell 类型</label>
            <a-select v-model:value="shell" class="w-full" >
                <a-select-option value="">系统默认</a-select-option>
                <a-select-option value="/bin/zsh">zsh</a-select-option>
                <a-select-option value="/bin/bash">bash</a-select-option>
                <a-select-option value="powershell.exe">PowerShell</a-select-option>
            </a-select>
        </div>

        <hr class="border-neutral-200 dark:border-neutral-700" />

        <!-- 免登录配置 -->
        <div>
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-neutral-500 dark:text-neutral-400">Claude Code 免登录</span>
                <span
                    class="text-xs px-2 py-0.5 rounded"
                    :class="loginConfigured ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400'"
                >
                    {{ loginConfigured ? '已配置' : '未配置' }}
                </span>
            </div>
            <a-button
                v-if="!loginConfigured"
                type="primary"
                                class="w-full"
                @click="onSetupLogin"
            >
                一键配置免登录
            </a-button>
            <p class="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                在 ~/.claude.json 中设置 hasCompletedOnboarding = true，需授权提权操作
            </p>
        </div>

        <hr class="border-neutral-200 dark:border-neutral-700" />

        <!-- 重置 -->
        <div class="space-y-2">
            <a-button
                                block
                class="text-left hover:bg-red-100 dark:hover:bg-red-600/50"
                @click="onResetSettings"
            >
                🔄 重置设置
            </a-button>
            <a-button
                                block
                class="text-left hover:bg-red-100 dark:hover:bg-red-600/50"
                @click="onResetProviders"
            >
                🔄 重置模型商
            </a-button>
            <a-button
                                block
                class="text-left hover:bg-red-100 dark:hover:bg-red-600/50"
                @click="onResetTasks"
            >
                🔄 重置任务
            </a-button>
        </div>

        <hr class="border-neutral-200 dark:border-neutral-700" />

        <!-- 链接 -->
        <div class="space-y-1">
            <a-button type="link"  class="text-xs p-0 h-auto" @click="onOpenRepo">
                📦 仓库地址
            </a-button>
            <br />
            <a-button type="link"  class="text-xs p-0 h-auto" @click="onOpenIssues">
                🐛 提 Issues
            </a-button>
        </div>
    </div>
</template>
