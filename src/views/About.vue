<script setup lang="ts">
import { h, ref, onMounted } from 'vue'

defineProps<{
    visible: boolean
}>()

const emit = defineEmits<{
    close: []
}>()

const appVersion = ref(__APP_VERSION__)
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
        latestVersion.value = ''
        updateAvailable.value = false
        alert('检查更新失败，请稍后重试')
    }
}

onMounted(() => {
    checkClaudeVersion()
})

import { RiGithubFill, RiBugFill } from '@remixicon/vue'
</script>

<template>
    <a-modal :open="visible" title="关于" destroy-on-close @cancel="emit('close')">
        <div class="about-panel p-5 space-y-4 text-center">
            <h3 class="text-base font-medium text-neutral-700 dark:text-neutral-200">ClaudeKit</h3>
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

            <div class="">
                <a-button type="primary" @click="checkUpdate">
                    检查更新
                </a-button>
            </div>

            <div v-if="latestVersion" class="text-xs">
                <p v-if="updateAvailable" class="text-yellow-600 dark:text-yellow-400">
                    发现新版本 v{{ latestVersion }}，请前往 <a href="https://github.com/deajax/claudekit" target="_blank"
                        class="text-yellow-600! dark:text-yellow-400! underline!">Github</a> 下载
                </p>
                <p v-else class="text-green-600 dark:text-green-400">当前已是最新版本</p>
            </div>

            <a-space>
                <a-button href="https://github.com/deajax/claudekit" target="_blank" type="link"
                    :icon="h(RiGithubFill)">
                    GitHub 仓库
                </a-button>
                <a-button href="https://github.com/deajax/claudekit/issues" target="_blank" type="link"
                    :icon="h(RiBugFill)">
                    提 Issues
                </a-button>
            </a-space>
        </div>
    </a-modal>
</template>
