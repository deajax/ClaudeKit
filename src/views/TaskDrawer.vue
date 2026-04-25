<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { QuickTask } from '../../shared/types'
import { getTasks, saveTasks } from '@/lib/db'
import { generateId } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog'

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
</script>

<template>
    <div class="task-drawer p-4 space-y-3">
        <!-- 搜索栏 -->
        <Input
            v-model="searchQuery"
            class="bg-slate-900 border-slate-700 text-slate-200 text-xs h-8"
            placeholder="搜索命令或名称..."
        />

        <!-- 任务列表 -->
        <div class="max-h-80 overflow-y-auto space-y-1">
            <div
                v-for="task in filteredTasks"
                :key="task.id"
                class="flex items-center group px-3 py-2 rounded hover:bg-slate-700/50 transition-colors cursor-pointer"
                @click="onRunTask(task)"
            >
                <span class="w-3 h-3 rounded-full border border-slate-600 mr-2 shrink-0" />
                <div class="flex-1 min-w-0">
                    <div class="text-xs text-slate-200 truncate">{{ task.name }}</div>
                    <div class="text-xs text-slate-500 truncate font-mono">{{ task.command }}</div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    class="opacity-0 group-hover:opacity-100 px-1.5 h-auto text-slate-500 hover:text-slate-300"
                    @click.stop="onEdit(task)"
                >
                    ⚙
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    class="opacity-0 group-hover:opacity-100 px-1.5 h-auto text-slate-500 hover:text-red-400"
                    @click.stop="onDelete(task)"
                >
                    ×
                </Button>
            </div>
            <div
                v-if="filteredTasks.length === 0"
                class="text-center py-6 text-xs text-slate-500"
            >
                暂无匹配任务
            </div>
        </div>

        <!-- 添加按钮 -->
        <Button
            variant="secondary"
            size="sm"
            class="w-full"
            @click="onAdd"
        >
            + 添加任务
        </Button>

        <!-- 添加/编辑 Dialog -->
        <Dialog :open="showAddModal" @update:open="(v: boolean) => showAddModal = v">
            <DialogContent class="sm:max-w-[440px] bg-slate-800 border-slate-700 text-slate-200">
                <DialogHeader>
                    <DialogTitle>{{ isNew ? '添加任务' : '编辑任务' }}</DialogTitle>
                </DialogHeader>

                <div class="space-y-3">
                    <div>
                        <label class="block text-xs text-slate-400 mb-1">任务名称 *</label>
                        <Input
                            v-model="editName"
                            class="bg-slate-900 border-slate-700 text-slate-200 text-xs h-8"
                            placeholder="例如：启动开发服务器"
                        />
                    </div>

                    <div>
                        <label class="block text-xs text-slate-400 mb-1">执行命令 *</label>
                        <Input
                            v-model="editCommand"
                            class="bg-slate-900 border-slate-700 text-slate-200 text-xs h-8 font-mono"
                            placeholder="例如：npm run dev"
                        />
                    </div>

                    <div>
                        <label class="block text-xs text-slate-400 mb-1">工作目录（选填）</label>
                        <Input
                            v-model="editCwd"
                            class="bg-slate-900 border-slate-700 text-slate-200 text-xs h-8"
                            placeholder="留空使用 home 目录"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <DialogClose as-child>
                        <Button variant="secondary" size="sm" @click="onCloseEdit">取消</Button>
                    </DialogClose>
                    <Button size="sm" @click="onSave">保存</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>
