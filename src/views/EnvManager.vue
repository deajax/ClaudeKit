<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getOs } from '@/lib/utils'
import { getEnv, saveEnv } from '@/lib/db'

const emit = defineEmits<{
    close: []
}>()

const os = getOs()

// ---- macOS: 代码编辑器模式 ----
const shellConfigContent = ref('')
const shellConfigPath = ref('')

async function loadShellConfig(): Promise<void> {
    try {
        const result = await window.electronAPI.invoke<{ success: boolean; data?: string; path?: string }>('env:read')
        if (result.success && result.data) {
            shellConfigContent.value = result.data
            shellConfigPath.value = result.path ?? ''
        }
    } catch {
        shellConfigContent.value = '# 无法读取 shell 配置文件'
    }
}

async function saveShellConfig(): Promise<void> {
    const confirmed = confirm('保存 shell 配置文件可能需要系统权限授权，是否继续？')
    if (!confirmed) return

    try {
        const result = await window.electronAPI.invoke<{ success: boolean; error?: string }>('env:write', shellConfigContent.value, shellConfigPath.value, true)
        if (result.success) {
            alert('保存成功，重启终端后生效')
        } else {
            alert('保存失败: ' + (result.error ?? '未知错误'))
        }
    } catch (e) {
        alert('保存失败: ' + (e as Error).message)
    }
}

// ---- Windows: 表格模式 ----
const envRows = ref<{ key: string; value: string }[]>([])
const editingRow = ref<number | null>(null)

async function loadEnvTable(): Promise<void> {
    try {
        const data = await getEnv()
        envRows.value = Object.entries(data).map(([key, value]) => ({ key, value }))
    } catch {
        envRows.value = []
    }
}

function addRow(): void {
    envRows.value.push({ key: '', value: '' })
    editingRow.value = envRows.value.length - 1
}

function removeRow(index: number): void {
    envRows.value.splice(index, 1)
    if (editingRow.value === index) editingRow.value = null
}

async function saveEnvTable(): Promise<void> {
    const obj: Record<string, string> = {}
    for (const row of envRows.value) {
        if (row.key) obj[row.key] = row.value
    }
    try {
        await saveEnv(obj)
        alert('保存成功')
    } catch (e) {
        alert('保存失败: ' + (e as Error).message)
    }
}

// ---- 配置文件编辑 ----
const shellProfilePath = ref('')
const profileContent = ref('')
const showProfileEditor = ref(false)

async function loadProfileForEdit(): Promise<void> {
    try {
        const result = await window.electronAPI.invoke<{
            success: boolean
            data?: string
            path?: string
        }>('env:read-profile')
        if (result.success && result.data) {
            profileContent.value = result.data
            shellProfilePath.value = result.path ?? ''
            showProfileEditor.value = true
        }
    } catch {
        alert('无法读取 shell 配置文件')
    }
}

async function saveProfile(): Promise<void> {
    const confirmed = confirm('保存 shell 配置文件可能需要系统权限授权，是否继续？')
    if (!confirmed) return

    try {
        await window.electronAPI.invoke('env:write-profile', {
            path: shellProfilePath.value,
            content: profileContent.value,
            useSudo: true
        })
        alert('保存成功，重启终端后生效')
    } catch (e) {
        alert('保存失败: ' + (e as Error).message)
    }
}

onMounted(() => {
    if (os === 'mac') {
        loadShellConfig()
    } else {
        loadEnvTable()
    }
})
</script>

<template>
    <div class="env-manager p-4 space-y-4">
        <h3 class="text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-4">环境变量管理</h3>

        <!-- macOS 代码编辑器 -->
        <div v-if="os === 'mac'">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-neutral-500 dark:text-neutral-400">{{ shellConfigPath || 'Shell 配置文件' }}</span>
                <a-button  type="primary" class="text-xs" @click="saveShellConfig">
                    保存
                </a-button>
            </div>
            <textarea
                v-model="shellConfigContent"
                rows="20"
                spellcheck="false"
                class="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded p-3 text-sm text-neutral-700 dark:text-neutral-200 font-mono outline-none focus:border-blue-500 resize-none"
            />
        </div>

        <!-- Windows 可视化表格 -->
        <div v-else>
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-neutral-500 dark:text-neutral-400">用户环境变量</span>
                <div class="flex gap-2">
                    <a-button  class="text-xs" @click="addRow">
                        + 添加变量
                    </a-button>
                    <a-button  type="primary" class="text-xs" @click="saveEnvTable">
                        保存
                    </a-button>
                </div>
            </div>
            <table class="w-full text-xs border border-neutral-200 dark:border-neutral-700 rounded overflow-hidden">
                <thead>
                    <tr class="bg-gray-100 dark:bg-neutral-800">
                        <th class="px-3 py-2 text-left text-neutral-500 dark:text-neutral-400 w-1/2">变量名</th>
                        <th class="px-3 py-2 text-left text-neutral-500 dark:text-neutral-400 w-1/2">变量值</th>
                        <th class="px-3 py-2 w-12" />
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="(row, i) in envRows"
                        :key="i"
                        class="border-t border-neutral-200 dark:border-neutral-700"
                    >
                        <td class="px-2 py-1">
                            <a-input
                                v-model:value="row.key"
                                                                class="bg-transparent border-0 text-neutral-700 dark:text-neutral-200 h-7 text-xs"
                                placeholder="变量名"
                            />
                        </td>
                        <td class="px-2 py-1">
                            <a-input
                                v-model:value="row.value"
                                                                class="bg-transparent border-0 text-neutral-700 dark:text-neutral-200 h-7 text-xs"
                                placeholder="变量值"
                            />
                        </td>
                        <td class="px-2 py-1 text-center">
                            <a-button type="text"  class="text-neutral-400 dark:text-neutral-500 h-auto px-1" @click="removeRow(i)">
                                ×
                            </a-button>
                        </td>
                    </tr>
                    <tr v-if="envRows.length === 0">
                        <td colspan="3" class="px-3 py-4 text-center text-neutral-400 dark:text-neutral-500">
                            暂无环境变量
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- 通用：直接编辑 Shell 配置文件 -->
        <div class="pt-3 border-t border-neutral-200 dark:border-neutral-700">
            <a-button  class="text-xs" @click="loadProfileForEdit">
                编辑 Shell 配置文件
            </a-button>
        </div>

        <!-- Shell 配置文件编辑弹窗 -->
        <a-modal
            v-model:open="showProfileEditor"
            :footer="null"
            width="600px"
            @cancel="() => showProfileEditor = false"
        >
            <div class="flex items-center justify-between mb-3">
                <span class="text-xs text-neutral-500 dark:text-neutral-400">{{ shellProfilePath }}</span>
                <a-button  type="primary" class="text-xs" @click="saveProfile">保存</a-button>
            </div>
            <div class="min-h-64">
                <textarea
                    v-model="profileContent"
                    rows="20"
                    spellcheck="false"
                    class="w-full h-full min-h-64 bg-white dark:bg-neutral-950 border-0 p-4 text-sm text-neutral-700 dark:text-neutral-200 font-mono outline-none resize-none rounded"
                />
            </div>
        </a-modal>
    </div>
</template>
