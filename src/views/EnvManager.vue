<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted, computed } from 'vue'
import { getOs } from '@/lib/utils'
import { getEnv, saveEnv } from '@/lib/db'
import { monaco } from '@/monaco'
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'

const props = defineProps<{
    visible: boolean
}>()

const emit = defineEmits<{
    close: []
}>()

const os = getOs()

const { settings } = storeToRefs(useSettingsStore())
const isDark = computed(() => settings.value.theme === 'dark')

// ---- macOS: Monaco Editor 模式 ----
const shellConfigPath = ref('')
const shellMonacoContainer = ref<HTMLElement | null>(null)
let shellEditor: monaco.editor.IStandaloneCodeEditor | null = null

function disposeEditor(): void {
    shellEditor?.dispose()
    shellEditor = null
}

function initEditor(): void {
    if (shellEditor || !shellMonacoContainer.value) return
    shellEditor = monaco.editor.create(shellMonacoContainer.value, {
        value: '',
        language: 'shell',
        theme: isDark.value ? 'vs-dark' : 'vs',
        fontSize: 13,
        fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
        minimap: { enabled: false },
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 }
    })
}

async function loadShellConfig(): Promise<void> {
    try {
        const result = await window.electronAPI.invoke<{ success: boolean; data?: string; path?: string }>('env:read')
        if (result.success && result.data && shellEditor) {
            shellEditor.setValue(result.data)
            shellConfigPath.value = result.path ?? ''
        }
    } catch {
        if (shellEditor) {
            shellEditor.setValue('# 无法读取 shell 配置文件')
        }
    }
}

async function saveShellConfig(): Promise<void> {
    const confirmed = confirm('保存 shell 配置文件可能需要系统权限授权，是否继续？')
    if (!confirmed) return

    const content = shellEditor?.getValue() ?? ''
    try {
        const result = await window.electronAPI.invoke<{ success: boolean; error?: string }>('env:write', content, shellConfigPath.value, true)
        if (result.success) {
            alert('保存成功，重启终端后生效')
        } else {
            alert('保存失败: ' + (result.error ?? '未知错误'))
        }
    } catch (e) {
        alert('保存失败: ' + (e as Error).message)
    }
}

watch(() => props.visible, async (open) => {
    if (!open) {
        disposeEditor()
        return
    }
    if (os === 'mac') {
        await nextTick()
        initEditor()
        loadShellConfig()
    } else {
        loadEnvTable()
    }
})

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

watch(isDark, (dark) => {
    shellEditor?.updateOptions({ theme: dark ? 'vs-dark' : 'vs' })
})

onUnmounted(() => {
    disposeEditor()
})
</script>

<template>
    <a-modal :open="visible" title="环境变量管理" :width="800" destroy-on-close @cancel="emit('close')">
        <template #footer>
            <template v-if="os === 'mac'">
                <div class="flex items-center justify-between">
                    <span class="text-xs dark:text-neutral-200">
                        {{ shellConfigPath || 'Shell 配置文件' }}</span>
                    <a-button type="primary" @click="saveShellConfig">
                        保存
                    </a-button>
                </div>
            </template>
            <template v-if="os === 'win'">
                <div class="flex items-center justify-between">
                    <span class="text-xs dark:text-neutral-200">用户环境变量</span>
                    <a-space>
                        <a-button @click="addRow">
                            添加变量
                        </a-button>
                        <a-button type="primary" @click="saveEnvTable">
                            保存
                        </a-button>
                    </a-space>
                </div>
            </template>
        </template>

        <!-- macOS Monaco 代码编辑器 -->
        <div v-if="os === 'mac'" class="w-full overflow-hidden rounded" style="height:500px">
            <div ref="shellMonacoContainer" class="w-full h-full" />
        </div>

        <!-- Windows 可视化表格 -->
        <div v-else>
            <table class="w-full text-xs border border-neutral-200 dark:border-neutral-700 rounded overflow-hidden">
                <thead>
                    <tr class="bg-gray-100 dark:bg-neutral-800">
                        <th class="px-3 py-2 text-left text-neutral-500 dark:text-neutral-400 w-1/2">变量名</th>
                        <th class="px-3 py-2 text-left text-neutral-500 dark:text-neutral-400 w-1/2">变量值</th>
                        <th class="px-3 py-2 w-12" />
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(row, i) in envRows" :key="i"
                        class="border-t border-neutral-200 dark:border-neutral-700">
                        <td class="px-2 py-1">
                            <a-input v-model:value="row.key"
                                class="bg-transparent border-0 text-neutral-700 dark:text-neutral-200 h-7 text-xs"
                                placeholder="变量名" />
                        </td>
                        <td class="px-2 py-1">
                            <a-input v-model:value="row.value"
                                class="bg-transparent border-0 text-neutral-700 dark:text-neutral-200 h-7 text-xs"
                                placeholder="变量值" />
                        </td>
                        <td class="px-2 py-1 text-center">
                            <a-button type="text" class="text-neutral-400 dark:text-neutral-500 h-auto px-1"
                                @click="removeRow(i)">
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
    </a-modal>
</template>
