<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectItemText,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'

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
        <h3 class="text-sm font-medium text-slate-200 mb-4">设置</h3>

        <!-- 主题 -->
        <div class="flex items-center justify-between">
            <span class="text-xs text-slate-400">主题</span>
            <Button variant="secondary" size="sm" class="text-xs" @click="onToggleTheme">
                {{ settings.theme === 'dark' ? '🌙 深色' : '☀️ 浅色' }}
            </Button>
        </div>

        <!-- 字体大小 -->
        <div class="flex items-center justify-between">
            <span class="text-xs text-slate-400">终端字号</span>
            <input
                type="range"
                min="10"
                max="28"
                :value="settings.fontSize"
                class="w-32"
                @change="onFontSizeChange"
            />
            <span class="text-xs text-slate-300 w-8">{{ settings.fontSize }}px</span>
        </div>

        <!-- 字体 -->
        <div>
            <label class="block text-xs text-slate-400 mb-1">终端字体</label>
            <Input
                v-model="fontFamily"
                class="bg-slate-900 border-slate-700 text-slate-200 text-xs h-8"
            />
        </div>

        <!-- 回滚缓冲 -->
        <div class="flex items-center justify-between">
            <span class="text-xs text-slate-400">回滚缓冲</span>
            <Select v-model="scrollback">
                <SelectTrigger class="w-40 h-8 text-xs bg-slate-900 border-slate-700 text-slate-200">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent class="bg-slate-800 border-slate-700 text-slate-200">
                    <SelectGroup>
                        <SelectItem :value="500" class="text-xs"><SelectItemText>500 行</SelectItemText></SelectItem>
                        <SelectItem :value="1000" class="text-xs"><SelectItemText>1000 行</SelectItemText></SelectItem>
                        <SelectItem :value="5000" class="text-xs"><SelectItemText>5000 行</SelectItemText></SelectItem>
                        <SelectItem :value="10000" class="text-xs"><SelectItemText>10000 行</SelectItemText></SelectItem>
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>

        <!-- Shell 类型 -->
        <div>
            <label class="block text-xs text-slate-400 mb-1">Shell 类型</label>
            <Select v-model="shell">
                <SelectTrigger class="w-full h-8 text-xs bg-slate-900 border-slate-700 text-slate-200">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent class="bg-slate-800 border-slate-700 text-slate-200">
                    <SelectGroup>
                        <SelectItem value="" class="text-xs"><SelectItemText>系统默认</SelectItemText></SelectItem>
                        <SelectItem value="/bin/zsh" class="text-xs"><SelectItemText>zsh</SelectItemText></SelectItem>
                        <SelectItem value="/bin/bash" class="text-xs"><SelectItemText>bash</SelectItemText></SelectItem>
                        <SelectItem value="powershell.exe" class="text-xs"><SelectItemText>PowerShell</SelectItemText></SelectItem>
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>

        <hr class="border-slate-700" />

        <!-- 免登录配置 -->
        <div>
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-slate-400">Claude Code 免登录</span>
                <span
                    class="text-xs px-2 py-0.5 rounded"
                    :class="loginConfigured ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'"
                >
                    {{ loginConfigured ? '已配置' : '未配置' }}
                </span>
            </div>
            <Button
                v-if="!loginConfigured"
                class="w-full text-xs"
                size="sm"
                @click="onSetupLogin"
            >
                一键配置免登录
            </Button>
            <p class="text-xs text-slate-500 mt-1">
                在 ~/.claude.json 中设置 hasCompletedOnboarding = true，需授权提权操作
            </p>
        </div>

        <hr class="border-slate-700" />

        <!-- 重置 -->
        <div class="space-y-2">
            <Button
                variant="secondary"
                size="sm"
                class="w-full justify-start text-xs hover:bg-red-600/50"
                @click="onResetSettings"
            >
                🔄 重置设置
            </Button>
            <Button
                variant="secondary"
                size="sm"
                class="w-full justify-start text-xs hover:bg-red-600/50"
                @click="onResetProviders"
            >
                🔄 重置模型商
            </Button>
            <Button
                variant="secondary"
                size="sm"
                class="w-full justify-start text-xs hover:bg-red-600/50"
                @click="onResetTasks"
            >
                🔄 重置任务
            </Button>
        </div>

        <hr class="border-slate-700" />

        <!-- 链接 -->
        <div class="space-y-1">
            <Button variant="link" size="sm" class="text-xs text-blue-400 hover:text-blue-300 p-0 h-auto" @click="onOpenRepo">
                📦 仓库地址
            </Button>
            <br />
            <Button variant="link" size="sm" class="text-xs text-blue-400 hover:text-blue-300 p-0 h-auto" @click="onOpenIssues">
                🐛 提 Issues
            </Button>
        </div>
    </div>
</template>
