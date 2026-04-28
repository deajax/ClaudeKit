<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted, computed, shallowRef } from 'vue'
import { getOs } from '@/lib/utils'
import { getEnv, saveEnv } from '@/lib/db'
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
type MonacoType = typeof import('monaco-editor')
const monacoRef = shallowRef<MonacoType | null>(null)
let shellEditor: import('monaco-editor').editor.IStandaloneCodeEditor | null = null

function disposeEditor(): void {
    shellEditor?.dispose()
    shellEditor = null
}

function initEditor(): void {
    if (shellEditor || !shellMonacoContainer.value) return
    // Lazy-import monaco-editor to reduce bundle size on Windows
    import('monaco-editor').then((monaco) => {
        monacoRef.value = monaco
        if (!shellMonacoContainer.value) return
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
        loadShellConfig()
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
    } else {
        loadEnvTable()
    }
})

// ---- Windows: 表格模式 ----
const envRows = ref<{ key: string; value: string; source: 'system' | 'user' }[]>([])
const editingRow = ref<number | null>(null)
const inputRefs = ref<any[]>([])
const sysCount = computed(() => envRows.value.filter(r => r.source === 'system').length)
const userCount = computed(() => envRows.value.filter(r => r.source === 'user').length)

async function loadEnvTable(): Promise<void> {
    try {
        // 并行加载系统变量和用户自定义变量
        const [sysResult, userData] = await Promise.all([
            window.electronAPI.invoke<{ success: boolean; data: Record<string, string> }>('env:list'),
            getEnv().catch(() => ({} as Record<string, string>))
        ])

        const sysVars = sysResult.success ? sysResult.data : {}
        const userVars = userData || {}

        // 合并：自定义变量覆盖系统同名变量，且标记为 'user'
        const merged = new Map<string, { key: string; value: string; source: 'system' | 'user' }>()

        for (const [key, value] of Object.entries(sysVars)) {
            merged.set(key, { key, value, source: 'system' })
        }
        for (const [key, value] of Object.entries(userVars)) {
            merged.set(key, { key, value, source: 'user' })
        }

        envRows.value = Array.from(merged.values())
    } catch {
        envRows.value = []
    }
}

function addRow(): void {
    envRows.value.push({ key: '', value: '', source: 'user' })
    editingRow.value = envRows.value.length - 1
    nextTick(() => {
        const idx = editingRow.value
        if (idx !== null) {
            inputRefs.value[idx]?.focus?.()
        }
    })
}

function removeRow(index: number): void {
    const row = envRows.value[index]
    if (row.key || row.value) {
        if (!confirm(`确定删除变量 "${row.key || '(空)'}" 吗？`)) return
    }
    envRows.value.splice(index, 1)
    if (editingRow.value === index) editingRow.value = null
}

async function saveEnvTable(): Promise<void> {
    const emptyKeys = envRows.value.filter(r => !r.key.trim() && r.source === 'user')
    if (emptyKeys.length > 0) {
        alert(`有 ${emptyKeys.length} 个变量名为空，请填写或删除`)
        return
    }
    // 只保存用户自定义的变量（包括新增和修改过的）
    const obj: Record<string, string> = {}
    for (const row of envRows.value) {
        if (row.key && row.source === 'user') obj[row.key] = row.value
    }
    try {
        await saveEnv(obj)
        alert('保存成功，重启终端后生效')
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
                    <span class="text-xs dark:text-neutral-200">系统 {{ sysCount }} 个 · 用户 {{ userCount }} 个</span>
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
                        <th class="px-3 py-2 text-left text-neutral-500 dark:text-neutral-400 w-2/5">变量名</th>
                        <th class="px-3 py-2 text-left text-neutral-500 dark:text-neutral-400 w-2/5">变量值</th>
                        <th class="px-3 py-2 text-left text-neutral-500 dark:text-neutral-400 w-16">来源</th>
                        <th class="px-3 py-2 w-12" />
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(row, i) in envRows" :key="i"
                        class="border-t border-neutral-200 dark:border-neutral-700"
                        :class="row.source === 'system' ? 'opacity-70' : ''">
                        <td class="px-2 py-1">
                            <a-input :ref="(el: any) => { if (el) inputRefs[i] = el }" v-model:value="row.key"
                                class="bg-transparent border-0 text-neutral-700 dark:text-neutral-200 h-7 text-xs"
                                placeholder="变量名" :disabled="row.source === 'system'" />
                        </td>
                        <td class="px-2 py-1">
                            <a-input v-model:value="row.value"
                                class="bg-transparent border-0 text-neutral-700 dark:text-neutral-200 h-7 text-xs"
                                placeholder="变量值" :disabled="row.source === 'system'" />
                        </td>
                        <td class="px-2 py-1">
                            <span class="text-xs"
                                :class="row.source === 'system' ? 'text-neutral-400' : 'text-blue-500'">
                                {{ row.source === 'system' ? '系统' : '用户' }}
                            </span>
                        </td>
                        <td class="px-2 py-1 text-center">
                            <a-button v-if="row.source === 'user'" type="text"
                                class="text-neutral-400 dark:text-neutral-500 h-auto px-1"
                                @click="removeRow(i)">
                                ×
                            </a-button>
                        </td>
                    </tr>
                    <tr v-if="envRows.length === 0">
                        <td colspan="4" class="px-3 py-4 text-center text-neutral-400 dark:text-neutral-500">
                            暂无环境变量
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </a-modal>
</template>
