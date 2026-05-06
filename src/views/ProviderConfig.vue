<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useProviderStore } from '@/stores/providers'
import { storeToRefs } from 'pinia'
import { generateId } from '@/lib/utils'
import type { Provider } from '../../shared/types'
import ProviderFormModal from '@/views/ProviderFormModal.vue'

defineProps<{
    visible: boolean
}>()

const emit = defineEmits<{
    close: []
}>()

const providerStore = useProviderStore()
const { providers } = storeToRefs(providerStore)

const showEditModal = ref(false)
const editingProvider = ref<(Provider & { id: string }) | null>(null)
const isNewProvider = ref(false)

// ---- 列表视图 ----

function onAdd(): void {
    isNewProvider.value = true
    editingProvider.value = { id: generateId(), name: '', icon: '', BASE_URL: '', AUTH_TOKEN: '', model: '', opusModel: '', sonnetModel: '', haikuModel: '', balanceApi: '', apiKeyUrl: '' }
    showEditModal.value = true
}

function onEdit(prov: Provider & { id: string }): void {
    isNewProvider.value = false
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
    <a-modal :open="visible" title="模型商配置" :width="640" destroy-on-close @cancel="emit('close')">
        <a-row :gutter="[8, 8]">
            <a-col span="12" v-for="prov in providers" :key="prov.id">
                <a-card hoverable @click="onEdit(prov)">
                    <a-card-meta :title="prov.name" :description="`${[
                        prov.model,
                        prov.opusModel,
                        prov.sonnetModel,
                        prov.haikuModel
                    ].filter(Boolean).length} 个模型`">
                        <template #avatar>
                            <a-avatar v-if="prov.icon" :src="prov.icon" />
                            <a-avatar v-else>
                                {{ prov.name.charAt(0) }}
                            </a-avatar>
                        </template>
                    </a-card-meta>
                </a-card>
            </a-col>
            <div v-if="providers.length === 0" class="text-center py-8 text-xs text-neutral-400 dark:text-neutral-500">
                暂无模型商，点击下方按钮添加
            </div>
        </a-row>
        <template #footer>
            <a-button type="primary" @click="onAdd">+ 添加模型商</a-button>
        </template>
    </a-modal>

    <!-- 模型商编辑弹窗 -->
    <ProviderFormModal :visible="showEditModal" :provider="editingProvider" :is-new="isNewProvider"
        @close="onCloseEdit" @save="onSaveProvider"
        @delete="(id: string) => { onDelete(id); onCloseEdit(); }" />
</template>
