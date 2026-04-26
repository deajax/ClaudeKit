<script setup lang="ts">
import { ref, onMounted } from 'vue'

const emit = defineEmits<{
    close: []
}>()

const appVersion = ref('0.1.0')
const claudeVersion = ref('--')
const latestVersion = ref('')
const updateAvailable = ref(false)

async function checkClaudeVersion(): Promise<void> {
    try {
        const result = await window.electronAPI.invoke<{ success: boolean; version?: string }>('system:check-claude')
        if (result.success && result.version) {
            claudeVersion.value = result.version
        }
    } catch {
        // 保持默认
    }
}

async function checkUpdate(): Promise<void> {
    try {
        // Placeholder: simulate version check
        // In production, call GitHub Releases API
        const result = await window.electronAPI.invoke<{
            success: boolean
            latest?: string
            body?: string
        }>('system:check-update', appVersion.value)

        if (result.success && result.latest) {
            latestVersion.value = result.latest
            updateAvailable.value = result.latest !== appVersion.value
        }
    } catch {
        alert('检查更新失败，请稍后重试')
    }
}

onMounted(() => {
    checkClaudeVersion()
})
</script>

<template>
    <div class="about-panel p-5 space-y-4 text-center">
        <h3 class="text-base font-medium text-neutral-700 dark:text-neutral-200">Claude CLI Desktop</h3>
        <p class="text-xs text-neutral-500 dark:text-neutral-400">跨平台桌面管理工具</p>

        <div class="bg-gray-100 dark:bg-neutral-700/30 rounded p-3 space-y-2 text-xs">
            <div class="flex justify-between">
                <span class="text-neutral-500 dark:text-neutral-400">软件版本</span>
                <span class="text-neutral-700 dark:text-neutral-200">v{{ appVersion }}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-neutral-500 dark:text-neutral-400">Claude Code 版本</span>
                <span class="text-neutral-700 dark:text-neutral-200">{{ claudeVersion }}</span>
            </div>
        </div>

        <a-button type="primary" @click="checkUpdate">
            检查更新
        </a-button>

        <div v-if="latestVersion" class="text-xs">
            <p v-if="updateAvailable" class="text-yellow-600 dark:text-yellow-400">
                发现新版本 v{{ latestVersion }}，请前往下载
            </p>
            <p v-else class="text-green-600 dark:text-green-400">当前已是最新版本</p>
        </div>

        <div class="pt-3 border-t border-neutral-200 dark:border-neutral-700 space-y-1">
            <a
                href="https://github.com"
                target="_blank"
                class="block text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
            >
                📦 GitHub 仓库
            </a>
            <a
                href="https://github.com"
                target="_blank"
                class="block text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
            >
                🐛 提 Issues
            </a>
        </div>
    </div>
</template>
