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
const activeTabKey = ref('user')
const systemRows = ref<{ key: string; value: string }[]>([])
const userRows = ref<{ key: string; value: string }[]>([])

const sysColumns = [
    { title: '变量名', key: 'name', width: '50%' },
    { title: '变量值', key: 'value', width: '50%' },
]
const userColumns = [
    { title: '变量名', key: 'name', width: '45%' },
    { title: '变量值', key: 'value', width: '45%' },
    { title: '', key: 'action', width: 48 },
]

async function loadEnvTable(): Promise<void> {
    try {
        const [sysResult, userData] = await Promise.all([
            window.electronAPI.invoke<{ success: boolean; data?: { system: Record<string, string>; user: Record<string, string> } }>('env:list'),
            getEnv().catch(() => ({} as Record<string, string>))
        ])

        const systemVars = sysResult.success && sysResult.data ? sysResult.data.system : {}
        const userVarsFromReg = sysResult.success && sysResult.data ? sysResult.data.user : {}
        const dbVars = userData || {}

        systemRows.value = Object.entries(systemVars).map(([k, v]) => ({ key: k, value: v }))

        // 合并注册表用户变量和自定义变量（自定义覆盖同名）
        const userMap = new Map<string, string>()
        for (const [k, v] of Object.entries(userVarsFromReg)) userMap.set(k, v)
        for (const [k, v] of Object.entries(dbVars)) userMap.set(k, v)
        userRows.value = Array.from(userMap.entries()).map(([k, v]) => ({ key: k, value: v }))
    } catch {
        systemRows.value = []
        userRows.value = []
    }
}

function addRow(): void {
    userRows.value.push({ key: '', value: '' })
    nextTick(() => {
        const rows = document.querySelectorAll<HTMLTableRowElement>('.env-table tbody tr')
        const lastRow = rows[rows.length - 1]
        lastRow?.querySelector<HTMLInputElement>('input')?.focus()
    })
}

function removeRow(index: number): void {
    const row = userRows.value[index]
    if (row.key || row.value) {
        if (!confirm(`确定删除变量 "${row.key || '(空)'}" 吗？`)) return
    }
    userRows.value.splice(index, 1)
}

async function saveEnvTable(): Promise<void> {
    const emptyKeys = userRows.value.filter(r => !r.key.trim())
    if (emptyKeys.length > 0) {
        alert(`有 ${emptyKeys.length} 个变量名为空，请填写或删除`)
        return
    }
    const obj: Record<string, string> = {}
    for (const row of userRows.value) {
        if (row.key) obj[row.key] = row.value
    }
    try {
        await saveEnv(obj)
        if (os === 'win') {
            const result = await window.electronAPI.invoke<{ success: boolean; error?: string }>('env:save-user-vars', obj)
            if (!result.success) {
                alert('写入系统用户变量失败: ' + (result.error ?? '未知错误'))
                return
            }
        }
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
    <a-modal :open="visible" title="环境变量管理" :width="800" destroy-on-close @cancel="emit('close')" centered>
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
                    <span />
                    <a-space>
                        <a-button v-if="activeTabKey === 'user'" @click="addRow">
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
            <a-tabs v-model:activeKey="activeTabKey" size="small" class="env-tabs">
                <a-tab-pane key="user" :tab="`用户变量 (${userRows.length})`">
                    <a-table :columns="userColumns" :dataSource="userRows" :pagination="false" :scroll="{ y: '50vh' }" :rowKey="(_: any, i: number) => i" class="env-table">
                        <template #bodyCell="{ column, record, index }">
                            <template v-if="column.key === 'name'">
                                <a-input v-model:value="record.key"
                                    class="bg-transparent border-0 text-neutral-700 dark:text-neutral-200 h-7 text-xs"
                                    placeholder="变量名" />
                            </template>
                            <template v-else-if="column.key === 'value'">
                                <a-input v-model:value="record.value"
                                    class="bg-transparent border-0 text-neutral-700 dark:text-neutral-200 h-7 text-xs"
                                    placeholder="变量值" />
                            </template>
                            <template v-else-if="column.key === 'action'">
                                <a-button type="text"
                                    class="text-neutral-400 dark:text-neutral-500 h-auto px-1"
                                    @click="removeRow(index)">
                                    ×
                                </a-button>
                            </template>
                        </template>
                        <template #emptyText>
                            <div class="py-4 text-center text-neutral-400 dark:text-neutral-500">暂无用户变量</div>
                        </template>
                    </a-table>
                </a-tab-pane>
                <a-tab-pane key="system" :tab="`系统变量 (${systemRows.length})`">
                    <a-table :columns="sysColumns" :dataSource="systemRows" :pagination="false"
                         :scroll="{ y: '50vh' }" :rowKey="(_: any, i: number) => i" class="env-table">
                        <template #bodyCell="{ column, record }">
                            <template v-if="column.key === 'name'">
                                <span class="text-xs text-neutral-700 dark:text-neutral-200">{{ record.key }}</span>
                            </template>
                            <template v-else-if="column.key === 'value'">
                                <span class="text-xs text-neutral-700 dark:text-neutral-200">{{ record.value }}</span>
                            </template>
                        </template>
                        <template #emptyText>
                            <div class="py-4 text-center text-neutral-400 dark:text-neutral-500">暂无系统变量</div>
                        </template>
                    </a-table>
                </a-tab-pane>
            </a-tabs>
        </div>
    </a-modal>
</template>
