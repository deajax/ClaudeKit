<script setup lang="ts">
import { h, ref, onMounted } from 'vue'
import { useProviderStore } from '@/stores/providers'
import { storeToRefs } from 'pinia'
import {
    RiFunctionLine,
    RiPlayFill,
    RiStopFill,
    RiMemoriesLine,
    RiGame2Line,
    RiTerminalBoxLine,
    RiSettingsLine,
    RiLightbulbLine,
    RiInformationLine
} from '@remixicon/vue'

const props = withDefaults(defineProps<{
    claudeRunning?: boolean
}>(), {
    claudeRunning: false
})

const emit = defineEmits<{
    applyProvider: [envVars: Record<string, string>]
    openTaskDrawer: []
    openMenu: [menu: string]
    startClaude: []
    restartClaude: []
    stopClaude: []
}>()

const providerStore = useProviderStore()
const { providers, activeProviderId } = storeToRefs(providerStore)

const selectedProviderId = ref('')

function onApply(): void {
    if (!selectedProviderId.value) return
    providerStore.setActive(selectedProviderId.value)
    const envVars = providerStore.getEnvVars(selectedProviderId.value)
    emit('applyProvider', envVars)
}

onMounted(async () => {
    await providerStore.fetchProviders()
    if (activeProviderId.value) {
        selectedProviderId.value = activeProviderId.value
    } else if (providers.value.length > 0) {
        selectedProviderId.value = providers.value[0].id
    }
})
</script>

<template>
    <a-flex align="center" gap="small">
        <!-- 更多菜单 -->
        <a-dropdown>
            <a-button :icon="h(RiFunctionLine)" />
            <template #overlay>
                <a-menu>
                    <a-menu-item v-for="item in [
                        { key: 'providerConfig', label: '模型商配置', icon: h(RiGame2Line) },
                        { key: 'envManager', label: '环境变量管理', icon: h(RiTerminalBoxLine) },
                        { key: 'settings', label: '设置', icon: h(RiSettingsLine) },
                        { key: 'help', label: '帮助文档', icon: h(RiLightbulbLine) },
                        { key: 'about', label: '关于', icon: h(RiInformationLine) }
                    ]" :key="item.key" :icon="item.icon"
                        class="px-3 py-2 text-neutral-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
                        @click="emit('openMenu', item.key)">
                        {{ item.label }}
                    </a-menu-item>
                </a-menu>
            </template>
        </a-dropdown>
        <a-divider type="vertical" />
        <!-- 模型商下拉 -->
        <a-select v-model:value="selectedProviderId" placeholder="选择模型商" class="w-36">
            <a-select-option v-for="p in providers" :key="p.id" :value="p.id">
                {{ p.name }}
            </a-select-option>
        </a-select>

        <!-- 应用按钮 -->
        <a-button type="primary" class="h-7 text-xs" @click="onApply">
            应用
        </a-button>

        <a-space class="ml-auto">
            <!-- Claude 控制按钮 -->
            <a-button :icon="h(RiPlayFill)" :type="claudeRunning ? 'text' : 'primary'" :disabled="claudeRunning"
                @click="emit('startClaude')">
                运行 Claude
            </a-button>
            <a-button v-if="claudeRunning" :icon="h(RiMemoriesLine)" @click="emit('restartClaude')" />
            <a-button v-if="claudeRunning" :icon="h(RiStopFill)" danger @click="emit('stopClaude')" />
            <!-- 运行任务按钮 -->
            <a-button class="h-7 text-xs" @click="emit('openTaskDrawer')">
                运行任务
            </a-button>
        </a-space>
    </a-flex>
</template>
