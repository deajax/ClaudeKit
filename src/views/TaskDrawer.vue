<script setup lang="ts">
import { h, ref, computed, onMounted } from 'vue'
import type { QuickTask } from '../../shared/types'
import { getTasks, saveTasks } from '@/lib/db'
import { generateId } from '@/lib/utils'

const emit = defineEmits<{
    close: []
    runTask: [task: QuickTask & { id: string }]
}>()

const tasks = ref<(QuickTask & { id: string })[]>([])
const searchQuery = ref('')
const showAddModal = ref(false)
const editingTask = ref<QuickTask & { id: string } | null>(null)
const isNew = ref(false)

const editName = ref('')
const editCommand = ref('')
const editCwd = ref('')
const editProviderId = ref('')

const filteredTasks = computed(() => {
    const q = searchQuery.value.toLowerCase().trim()
    if (!q) return tasks.value
    return tasks.value.filter(
        (t) => t.name.toLowerCase().includes(q) || t.command.toLowerCase().includes(q)
    )
})

async function loadTasks(): Promise<void> {
    try {
        tasks.value = await getTasks()
    } catch {
        tasks.value = []
    }
}

async function persist(): Promise<void> {
    try {
        await saveTasks(tasks.value)
    } catch { /* ignore */ }
}

function onRunTask(task: QuickTask & { id: string }): void {
    emit('runTask', task)
}

function onAdd(): void {
    isNew.value = true
    editingTask.value = {
        id: generateId(),
        name: '',
        command: '',
        cwd: '',
        providerId: ''
    }
    editName.value = ''
    editCommand.value = ''
    editCwd.value = ''
    editProviderId.value = ''
    showAddModal.value = true
}

function onEdit(task: QuickTask & { id: string }): void {
    isNew.value = false
    editingTask.value = { ...task }
    editName.value = task.name
    editCommand.value = task.command
    editCwd.value = task.cwd
    editProviderId.value = task.providerId
    showAddModal.value = true
}

async function onDelete(task: QuickTask & { id: string }): Promise<void> {
    if (!confirm(`确定删除任务「${task.name}」？`)) return
    tasks.value = tasks.value.filter((t) => t.id !== task.id)
    await persist()
}

async function onSave(): Promise<void> {
    if (!editName.value || !editCommand.value) {
        alert('任务名称和执行命令为必填项')
        return
    }

    const data: QuickTask & { id: string } = {
        id: editingTask.value?.id ?? generateId(),
        name: editName.value,
        command: editCommand.value,
        cwd: editCwd.value,
        providerId: editProviderId.value
    }

    if (isNew.value) {
        tasks.value.push(data)
    } else {
        const idx = tasks.value.findIndex((t) => t.id === data.id)
        if (idx !== -1) {
            tasks.value[idx] = data
        }
    }

    await persist()
    showAddModal.value = false
}

function onCloseEdit(): void {
    showAddModal.value = false
}

onMounted(() => {
    loadTasks()
})

import { RiSettings3Line, RiDeleteBinLine } from '@remixicon/vue'
</script>

<template>
    <div class="task-drawer">
        <!-- 搜索栏 -->
        <div class="px-4 py-3 border-b border-b-neutral-200 dark:border-b-neutral-800">
            <a-input v-model:value="searchQuery" class="bg-white dark:bg-neutral-900 text-xs h-8"
                placeholder="搜索命令或名称..." />
        </div>

        <!-- 任务列表 -->
        <a-list class="max-h-50 overflow-y-auto" :data-source="filteredTasks" size="small" :locale="{ emptyText: '暂无匹配任务' }">
            <template #renderItem="{ item }">
                <a-list-item class="hover:bg-gray-100 dark:hover:bg-neutral-700/50 transition-colors cursor-pointer"
                    @click="onRunTask(item)">
                    <a-list-item-meta :title="item.name" :description="item.command" />
                    <template #actions>
                        <a-button type="text" size="small" :icon="h(RiSettings3Line)" @click.stop="onEdit(item)" />
                        <a-button type="text" size="small" :icon="h(RiDeleteBinLine)" @click.stop="onDelete(item)" />
                    </template>
                </a-list-item>
            </template>
        </a-list>

        <div class="px-4 py-3 border-t border-t-neutral-200 dark:border-t-neutral-800">
            <!-- 添加按钮 -->
            <a-button block @click="onAdd" type="dashed">
                + 添加任务
            </a-button>
        </div>

        <!-- 添加/编辑弹窗 -->
        <a-modal v-model:open="showAddModal" :title="isNew ? '添加任务' : '编辑任务'" @cancel="onCloseEdit" @ok="onSave">
            <a-form layout="vertical">
                <a-form-item label="任务名称">
                    <a-input v-model:value="editName" placeholder="例如：启动开发服务器" />
                </a-form-item>
                <a-form-item label="执行命令">
                    <a-input v-model:value="editCommand" class="font-mono" placeholder="例如：npm run dev" />
                </a-form-item>
                <a-form-item label="工作目录（选填）">
                    <a-input v-model:value="editCwd" placeholder="留空使用 home 目录" />
                </a-form-item>
            </a-form>
        </a-modal>
    </div>
</template>
