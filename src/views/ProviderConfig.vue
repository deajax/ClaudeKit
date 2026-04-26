<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useProviderStore } from '@/stores/providers'
import { storeToRefs } from 'pinia'
import { generateId } from '@/lib/utils'
import type { Provider } from '../../shared/types'
import ProviderFormModal from '@/components/ProviderFormModal.vue'

const emit = defineEmits<{
    close: []
}>()

const providerStore = useProviderStore()
const { providers } = storeToRefs(providerStore)

const showEditModal = ref(false)
const editingProvider = ref<(Provider & { id: string }) | null>(null)

// ---- 列表视图 ----

function onAdd(): void {
    editingProvider.value = { id: generateId(), name: '', icon: '', BASE_URL: '', AUTH_TOKEN: '', model: '', opusModel: '', sonnetModel: '', haikuModel: '', balanceApi: '' }
    showEditModal.value = true
}

function onEdit(prov: Provider & { id: string }): void {
    editingProvider.value = { ...prov }
    showEditModal.value = true
}

async function onDelete(id: string): Promise<void> {
    if (confirm('确定删除该模型商？')) {
        await providerStore.remove(id)
    }
}

function onCloseEdit(): void {
    showEditModal.value = false
    editingProvider.value = null
}

async function onSaveProvider(data: Provider, _verified?: boolean): Promise<void> {
    if (editingProvider.value?.id) {
        const existing = providerStore.providers.find(p => p.id === editingProvider.value!.id)
        if (existing) {
            await providerStore.update(existing.id, data)
        } else {
            await providerStore.add({ id: editingProvider.value!.id, ...data })
        }
    } else {
        await providerStore.add({ id: data.key || generateId(), ...data })
    }
    showEditModal.value = false
    editingProvider.value = null
}

onMounted(() => {
    providerStore.fetchProviders()
})
</script>

<template>
    <!-- 列表视图 (Drawer content) -->
    <div class="provider-config-list p-4">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-neutral-700 dark:text-neutral-200">模型商管理</h3>
            <a-button type="primary" class="text-xs" @click="onAdd">
                + 添加模型商
            </a-button>
        </div>

        <div class="grid gap-2">
            <div
                v-for="prov in providers"
                :key="prov.id"
                class="flex items-center gap-3 p-3 rounded bg-gray-100 dark:bg-neutral-700/50 border border-neutral-200/50 dark:border-neutral-600/50"
            >
                <img
                    v-if="prov.icon"
                    :src="prov.icon"
                    class="w-8 h-8 rounded object-contain"
                />
                <div
                    v-else
                    class="w-8 h-8 rounded bg-gray-200 dark:bg-neutral-600 flex items-center justify-center text-xs text-neutral-500 dark:text-neutral-400"
                >
                    {{ prov.name.charAt(0) }}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm text-neutral-700 dark:text-neutral-200">{{ prov.name }}</div>
                    <div class="text-xs text-neutral-400 dark:text-neutral-500">
                        {{ [
                            prov.model,
                            prov.opusModel,
                            prov.sonnetModel,
                            prov.haikuModel
                        ].filter(Boolean).length }} 个模型
                    </div>
                </div>
                <a-button type="text" class="text-xs text-neutral-500 dark:text-neutral-400 h-auto px-2 py-1" @click.prevent="onEdit(prov)">
                    编辑
                </a-button>
                <a-button type="text" class="text-xs text-neutral-500 dark:text-neutral-400 h-auto px-2 py-1" @click.prevent="onDelete(prov.id)">
                    删除
                </a-button>
            </div>
            <div
                v-if="providers.length === 0"
                class="text-center py-8 text-xs text-neutral-400 dark:text-neutral-500"
            >
                暂无模型商，点击上方按钮添加
            </div>
        </div>
    </div>

    <!-- 模型商编辑弹窗 -->
    <ProviderFormModal
        :visible="showEditModal"
        :provider="editingProvider"
        @close="onCloseEdit"
        @save="onSaveProvider"
    />
</template>
