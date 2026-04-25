<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProviderStore } from '@/stores/providers'
import { storeToRefs } from 'pinia'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectItemText,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'

const emit = defineEmits<{
    applyProvider: [envVars: Record<string, string>]
    openTaskDrawer: []
    openMenu: [menu: string]
}>()

const providerStore = useProviderStore()
const { providers, activeProviderId } = storeToRefs(providerStore)

const selectedProviderId = ref('')
const selectedModel = ref('')

type ModelSlot = { key: string; label: string; value: string }

const availableModels = computed<ModelSlot[]>(() => {
    const p = providers.value.find((p) => p.id === selectedProviderId.value)
    if (!p) return []
    const slots: ModelSlot[] = []
    if (p.model) slots.push({ key: 'model', label: '默认', value: p.model })
    if (p.opusModel) slots.push({ key: 'opusModel', label: 'Opus', value: p.opusModel })
    if (p.sonnetModel) slots.push({ key: 'sonnetModel', label: 'Sonnet', value: p.sonnetModel })
    if (p.haikuModel) slots.push({ key: 'haikuModel', label: 'Haiku', value: p.haikuModel })
    return slots
})

function onProviderChange(): void {
    const p = providers.value.find((p) => p.id === selectedProviderId.value)
    if (p) {
        selectedModel.value = p.model || ''
    }
}

function onApply(): void {
    if (!selectedProviderId.value) return
    providerStore.setActive(selectedProviderId.value)

    const p = providers.value.find((p) => p.id === selectedProviderId.value)
    if (p && selectedModel.value && selectedModel.value !== p.model) {
        providerStore.update(selectedProviderId.value, { model: selectedModel.value })
    }

    const envVars = providerStore.getEnvVars(selectedProviderId.value)
    emit('applyProvider', envVars)
}

onMounted(async () => {
    await providerStore.fetchProviders()
    if (activeProviderId.value) {
        selectedProviderId.value = activeProviderId.value
        onProviderChange()
    } else if (providers.value.length > 0) {
        selectedProviderId.value = providers.value[0].id
        onProviderChange()
    }
})
</script>

<template>
    <div class="toolbar flex items-center gap-2 px-3 h-full text-xs">
        <!-- 模型商下拉 -->
        <Select v-model="selectedProviderId" @update:model-value="onProviderChange">
            <SelectTrigger class="w-36 h-7 text-xs bg-slate-800 border-slate-700 text-slate-200">
                <SelectValue placeholder="选择模型商" />
            </SelectTrigger>
            <SelectContent class="bg-slate-800 border-slate-700 text-slate-200">
                <SelectGroup>
                    <SelectItem v-for="p in providers" :key="p.id" :value="p.id" class="text-xs">
                        <SelectItemText>{{ p.name }}</SelectItemText>
                    </SelectItem>
                </SelectGroup>
            </SelectContent>
        </Select>

        <!-- 模型下拉 -->
        <Select v-model="selectedModel">
            <SelectTrigger class="w-56 h-7 text-xs bg-slate-800 border-slate-700 text-slate-200 min-w-0">
                <SelectValue placeholder="选择模型" />
            </SelectTrigger>
            <SelectContent class="bg-slate-800 border-slate-700 text-slate-200">
                <SelectGroup>
                    <SelectItem v-for="m in availableModels" :key="m.key" :value="m.value" class="text-xs">
                        <SelectItemText>{{ m.label }}：{{ m.value }}</SelectItemText>
                    </SelectItem>
                </SelectGroup>
            </SelectContent>
        </Select>

        <!-- 应用按钮 -->
        <Button size="sm" class="h-7 text-xs" @click="onApply">
            应用
        </Button>

        <div class="w-px h-4 bg-slate-700" />

        <!-- 运行任务按钮 -->
        <Button variant="secondary" size="sm" class="h-7 text-xs" @click="emit('openTaskDrawer')">
            运行任务
        </Button>

        <!-- 更多菜单 -->
        <div class="relative group">
            <Button variant="secondary" size="sm" class="h-7 text-xs">
                更多 ▾
            </Button>
            <div
                class="absolute top-full left-0 mt-1 w-44 bg-slate-800 border border-slate-700 rounded shadow-lg z-50 hidden group-hover:block"
            >
                <div
                    v-for="item in [
                        { key: 'providerConfig', label: '模型商配置' },
                        { key: 'envManager', label: '环境变量管理' },
                        { key: 'settings', label: '设置' },
                        { key: 'help', label: '帮助文档' },
                        { key: 'about', label: '关于' }
                    ]"
                    :key="item.key"
                    class="px-3 py-2 text-slate-300 hover:bg-slate-700 cursor-pointer transition-colors"
                    @click="emit('openMenu', item.key)"
                >
                    {{ item.label }}
                </div>
            </div>
        </div>
    </div>
</template>
