import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Provider } from '../../shared/types'
import {
    getProviders,
    addProvider as dbAddProvider,
    updateProvider as dbUpdateProvider,
    deleteProvider as dbDeleteProvider,
    getSettings,
    saveSettings
} from '@/lib/db'

export const useProviderStore = defineStore('providers', () => {
    const providers = ref<(Provider & { id: string })[]>([])
    const activeProviderId = ref('')
    const loading = ref(false)

    const activeProvider = computed(() =>
        providers.value.find((p) => p.id === activeProviderId.value) ?? null
    )

    async function fetchProviders(): Promise<void> {
        loading.value = true
        try {
            providers.value = await getProviders()
            const settings = await getSettings()
            if (settings.activeProviderId) {
                activeProviderId.value = settings.activeProviderId
            }
            if (!activeProviderId.value && providers.value.length > 0) {
                activeProviderId.value = providers.value[0].id
            }
        } finally {
            loading.value = false
        }
    }

    async function add(provider: Provider & { id: string }): Promise<void> {
        await dbAddProvider(provider)
        await fetchProviders()
    }

    async function update(id: string, updates: Partial<Provider>): Promise<void> {
        await dbUpdateProvider(id, updates)
        await fetchProviders()
    }

    async function remove(id: string): Promise<void> {
        await dbDeleteProvider(id)
        if (activeProviderId.value === id) {
            activeProviderId.value = providers.value[0]?.id ?? ''
        }
        await fetchProviders()
    }

    async function setActive(id: string): Promise<void> {
        activeProviderId.value = id
        try {
            const settings = await getSettings()
            settings.activeProviderId = id
            await saveSettings(settings)
        } catch { /* 静默失败 */ }
    }

    function getEnvVars(providerId?: string): Record<string, string> {
        const p = providers.value.find((p) => p.id === (providerId ?? activeProviderId.value))
        if (!p) return {}
        const vars: Record<string, string> = {
            ANTHROPIC_BASE_URL: p.BASE_URL,
            ANTHROPIC_AUTH_TOKEN: p.AUTH_TOKEN,
            ANTHROPIC_MODEL: p.model
        }
        if (p.opusModel) vars.ANTHROPIC_DEFAULT_OPUS_MODEL = p.opusModel
        if (p.sonnetModel) vars.ANTHROPIC_DEFAULT_SONNET_MODEL = p.sonnetModel
        if (p.haikuModel) vars.ANTHROPIC_DEFAULT_HAIKU_MODEL = p.haikuModel
        return vars
    }

    return {
        providers,
        activeProviderId,
        loading,
        activeProvider,
        fetchProviders,
        add,
        update,
        remove,
        setActive,
        getEnvVars
    }
})
