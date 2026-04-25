<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useProviderStore } from '@/stores/providers'
import { storeToRefs } from 'pinia'
import { generateId } from '@/lib/utils'
import type { Provider } from '../../shared/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
}>()

const providerStore = useProviderStore()
const { providers } = storeToRefs(providerStore)

const showEditModal = ref(false)
const editingProvider = ref<Provider & { id: string } | null>(null)
const isNew = ref(false)

// ---- 列表视图 ----

function onAdd(): void {
    isNew.value = true
    editingProvider.value = {
        id: generateId(),
        name: '',
        icon: '',
        BASE_URL: '',
        AUTH_TOKEN: '',
        model: '',
        opusModel: '',
        sonnetModel: '',
        haikuModel: '',
        thinkingSupported: false,
        balanceApi: ''
    }
    initEditForm()
    showEditModal.value = true
}

function onEdit(prov: Provider & { id: string }): void {
    isNew.value = false
    editingProvider.value = { ...prov }
    initEditForm()
    showEditModal.value = true
}

async function onDelete(id: string): Promise<void> {
    if (confirm('确定删除该模型商？')) {
        await providerStore.remove(id)
    }
}

// ---- 编辑视图 ----

const editName = ref('')
const editIcon = ref('')
const editBaseUrl = ref('')
const editAuthToken = ref('')
const editModel = ref('')
const editOpusModel = ref('')
const editSonnetModel = ref('')
const editHaikuModel = ref('')
const editThinkingSupported = ref(false)
const editBalanceApi = ref('')

function initEditForm(): void {
    const p = editingProvider.value
    if (!p) return
    editName.value = p.name
    editIcon.value = p.icon
    editBaseUrl.value = p.BASE_URL
    editAuthToken.value = p.AUTH_TOKEN
    editModel.value = p.model
    editOpusModel.value = p.opusModel ?? ''
    editSonnetModel.value = p.sonnetModel ?? ''
    editHaikuModel.value = p.haikuModel ?? ''
    editThinkingSupported.value = p.thinkingSupported ?? false
    editBalanceApi.value = p.balanceApi ?? ''
}

async function onSave(): Promise<void> {
    if (!editName.value || !editBaseUrl.value || !editAuthToken.value) {
        alert('名称、BASE_URL 和 AUTH_TOKEN 为必填项')
        return
    }

    if (!editModel.value) {
        alert('默认模型（ANTHROPIC_MODEL）为必填项')
        return
    }

    // 确保最多 4 个模型（默认必填 + 3 个可选覆盖）
    const modelSlots = [
        editModel.value,
        editOpusModel.value,
        editSonnetModel.value,
        editHaikuModel.value
    ].filter(Boolean)

    if (modelSlots.length > 4) {
        alert('最多配置 4 个模型（1 默认 + 3 分级覆盖）')
        return
    }

    const data: Provider = {
        name: editName.value,
        icon: editIcon.value,
        BASE_URL: editBaseUrl.value,
        AUTH_TOKEN: editAuthToken.value,
        model: editModel.value,
        opusModel: editOpusModel.value || undefined,
        sonnetModel: editSonnetModel.value || undefined,
        haikuModel: editHaikuModel.value || undefined,
        thinkingSupported: editThinkingSupported.value,
        balanceApi: editBalanceApi.value || undefined
    }

    if (isNew.value) {
        await providerStore.add({ id: editingProvider.value!.id, ...data })
    } else {
        await providerStore.update(editingProvider.value!.id, data)
    }

    showEditModal.value = false
}

function onCloseEdit(): void {
    showEditModal.value = false
}

function onIconUpload(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
        editIcon.value = reader.result as string
    }
    reader.readAsDataURL(file)
}

onMounted(() => {
    providerStore.fetchProviders()
})
</script>

<template>
    <!-- 列表视图 (Drawer content) -->
    <div class="provider-config-list p-4">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-slate-200">模型商管理</h3>
            <Button size="sm" class="text-xs" @click="onAdd">
                + 添加模型商
            </Button>
        </div>

        <div class="grid gap-2">
            <div
                v-for="prov in providers"
                :key="prov.id"
                class="flex items-center gap-3 p-3 rounded bg-slate-700/50 border border-slate-600/50"
            >
                <img
                    v-if="prov.icon"
                    :src="prov.icon"
                    class="w-8 h-8 rounded object-contain"
                />
                <div
                    v-else
                    class="w-8 h-8 rounded bg-slate-600 flex items-center justify-center text-xs text-slate-400"
                >
                    {{ prov.name.charAt(0) }}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm text-slate-200">{{ prov.name }}</div>
                    <div class="text-xs text-slate-500">
                        {{ [
                            prov.model,
                            prov.opusModel,
                            prov.sonnetModel,
                            prov.haikuModel
                        ].filter(Boolean).length }} 个模型
                    </div>
                </div>
                <Button variant="ghost" size="sm" class="text-xs text-slate-400 hover:text-blue-400 h-auto px-2 py-1" @click="onEdit(prov)">
                    编辑
                </Button>
                <Button variant="ghost" size="sm" class="text-xs text-slate-400 hover:text-red-400 h-auto px-2 py-1" @click="onDelete(prov.id)">
                    删除
                </Button>
            </div>
            <div
                v-if="providers.length === 0"
                class="text-center py-8 text-xs text-slate-500"
            >
                暂无模型商，点击上方按钮添加
            </div>
        </div>
    </div>

    <!-- 编辑 Dialog -->
    <Dialog :open="showEditModal" @update:open="(v: boolean) => showEditModal = v">
        <DialogContent class="sm:max-w-[520px] max-h-[80vh] overflow-y-auto bg-slate-800 border-slate-700 text-slate-200">
            <DialogHeader>
                <DialogTitle>{{ isNew ? '新增模型商' : '编辑模型商' }}</DialogTitle>
            </DialogHeader>

            <div class="space-y-3 text-sm">
                <!-- 名称 -->
                <div>
                    <label class="block text-xs text-slate-400 mb-1">名称 *</label>
                    <Input
                        v-model="editName"
                        class="bg-slate-900 border-slate-700 text-slate-200 text-xs h-8"
                        placeholder="例如：DeepSeek"
                    />
                </div>

                <!-- 图标上传 -->
                <div>
                    <label class="block text-xs text-slate-400 mb-1">图标</label>
                    <input
                        type="file"
                        accept="image/*"
                        class="w-full text-xs text-slate-400"
                        @change="onIconUpload"
                    />
                </div>

                <!-- BASE_URL -->
                <div>
                    <label class="block text-xs text-slate-400 mb-1">
                        ANTHROPIC_BASE_URL *
                    </label>
                    <Input
                        v-model="editBaseUrl"
                        class="bg-slate-900 border-slate-700 text-slate-200 text-xs h-8"
                        placeholder="https://api.deepseek.com/anthropic"
                    />
                </div>

                <!-- AUTH_TOKEN -->
                <div>
                    <label class="block text-xs text-slate-400 mb-1">
                        ANTHROPIC_AUTH_TOKEN *
                    </label>
                    <Input
                        v-model="editAuthToken"
                        type="password"
                        class="bg-slate-900 border-slate-700 text-slate-200 text-xs h-8"
                        placeholder="sk-xxxx"
                    />
                </div>

                <hr class="border-slate-700" />

                <!-- 模型配置说明 -->
                <p class="text-xs text-slate-500">
                    Claude Code 最多配置 4 个模型：1 个默认 + 3 个分级覆盖（Opus / Sonnet / Haiku）
                </p>

                <!-- 默认模型 -->
                <div>
                    <label class="block text-xs text-slate-400 mb-1">
                        ANTHROPIC_MODEL（默认模型）*
                    </label>
                    <Input
                        v-model="editModel"
                        class="bg-slate-900 border-slate-700 text-slate-200 text-xs h-8 font-mono"
                        placeholder="例如：deepseek-v4-pro"
                    />
                </div>

                <!-- 分级覆盖模型 -->
                <div class="space-y-2">
                    <p class="text-xs text-slate-500">分级覆盖模型（可选，覆盖 Claude Code 内置模型选择）</p>
                    <div>
                        <label class="block text-xs text-slate-400 mb-1">
                            ANTHROPIC_DEFAULT_OPUS_MODEL
                        </label>
                        <Input
                            v-model="editOpusModel"
                            class="bg-slate-900 border-slate-700 text-slate-200 text-xs h-8 font-mono"
                            placeholder="覆盖 Opus 模型（可选）"
                        />
                    </div>
                    <div>
                        <label class="block text-xs text-slate-400 mb-1">
                            ANTHROPIC_DEFAULT_SONNET_MODEL
                        </label>
                        <Input
                            v-model="editSonnetModel"
                            class="bg-slate-900 border-slate-700 text-slate-200 text-xs h-8 font-mono"
                            placeholder="覆盖 Sonnet 模型（可选）"
                        />
                    </div>
                    <div>
                        <label class="block text-xs text-slate-400 mb-1">
                            ANTHROPIC_DEFAULT_HAIKU_MODEL
                        </label>
                        <Input
                            v-model="editHaikuModel"
                            class="bg-slate-900 border-slate-700 text-slate-200 text-xs h-8 font-mono"
                            placeholder="覆盖 Haiku 模型（可选）"
                        />
                    </div>
                </div>

                <!-- 特殊功能（仅 DeepSeek 类显示） -->
                <div v-if="editName.includes('DeepSeek') || editName.includes('deepseek')">
                    <hr class="border-slate-700" />
                    <label class="flex items-center gap-2 text-xs text-slate-400">
                        <input v-model="editThinkingSupported" type="checkbox" />
                        支持思考模式
                    </label>
                    <div class="mt-1">
                        <label class="block text-xs text-slate-400 mb-1">余额查询 API</label>
                        <Input
                            v-model="editBalanceApi"
                            class="bg-slate-900 border-slate-700 text-slate-200 text-xs h-8 font-mono"
                            placeholder="https://api.deepseek.com/user/balance"
                        />
                    </div>
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
</template>
