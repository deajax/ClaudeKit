<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'

defineProps<{
    visible: boolean
}>()

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

function onFontSizeChange(val: number): void {
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
    window.open('https://github.com/deajax/claudekit/issues', '_blank')
}

function onOpenRepo(): void {
    window.open('https://github.com/deajax/claudekit', '_blank')
}
</script>

<template>
    <a-modal :open="visible" title="设置" destroy-on-close @cancel="emit('close')">
        <a-form :labelCol="{ span: 5 }" :wrapperCol="{ span: 18 }">
            <!-- 外观设置 -->
            <a-form-item label="暗色模式">
                <a-switch :checked="settings.theme === 'dark'" @change="onToggleTheme" />
            </a-form-item>

            <a-form-item label="终端字号">
                <a-input-number :min="10" :max="28" :value="settings.fontSize" @change="onFontSizeChange" />
            </a-form-item>

            <a-form-item label="终端字体">
                <a-input v-model:value="fontFamily" />
            </a-form-item>

            <a-form-item label="回滚缓冲">
                <a-select v-model:value="scrollback">
                    <a-select-option :value="500">500 行</a-select-option>
                    <a-select-option :value="1000">1000 行</a-select-option>
                    <a-select-option :value="5000">5000 行</a-select-option>
                    <a-select-option :value="10000">10000 行</a-select-option>
                </a-select>
            </a-form-item>

            <a-form-item label="Shell 类型">
                <a-select v-model:value="shell">
                    <a-select-option value="">系统默认</a-select-option>
                    <a-select-option value="/bin/zsh">zsh</a-select-option>
                    <a-select-option value="/bin/bash">bash</a-select-option>
                    <a-select-option value="powershell.exe">PowerShell</a-select-option>
                </a-select>
            </a-form-item>


            <!-- 免登录配置 -->
            <a-form-item label="Claude免登录">
                <div class="w-full">
                    <div class="flex items-center gap-2 mb-2 p-1">
                        <a-tag :color="loginConfigured ? 'green' : 'orange'">
                            {{ loginConfigured ? '已配置' : '未配置' }}
                        </a-tag>
                    </div>
                    <a-button v-if="!loginConfigured" type="primary" block @click="onSetupLogin">
                        一键配置免登录
                    </a-button>
                    <p class="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                        在 ~/.claude.json 中设置 hasCompletedOnboarding = true，需授权提权操作
                    </p>
                </div>
            </a-form-item>

            <!-- 重置 -->
            <a-form-item label="重置选项">
                <a-space class="w-full">
                    <a-button block @click="onResetSettings">重置设置</a-button>
                    <a-button danger block @click="onResetProviders">重置模型商</a-button>
                    <a-button danger block @click="onResetTasks">重置运行任务</a-button>
                </a-space>
            </a-form-item>
        </a-form>
    </a-modal>
</template>
