import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { AppSettings } from '../../shared/types'
import { DEFAULT_SETTINGS } from '../../shared/constants'
import { getSettings, saveSettings } from '@/lib/db'

export const useSettingsStore = defineStore('settings', () => {
    const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
    const loading = ref(false)
    const initialized = ref(false)

    async function fetchSettings(): Promise<void> {
        if (initialized.value) return
        loading.value = true
        try {
            const data = await getSettings()
            settings.value = { ...DEFAULT_SETTINGS, ...data }
            initialized.value = true
        } catch {
            // 使用默认值
        } finally {
            loading.value = false
        }
    }

    async function persist(): Promise<void> {
        try {
            await saveSettings({ ...settings.value })
        } catch {
            // 静默失败
        }
    }

    function updateTheme(theme: 'dark' | 'light'): void {
        settings.value.theme = theme
        persist()
    }

    function updateFontSize(size: number): void {
        settings.value.fontSize = size
        persist()
    }

    function updateFontFamily(family: string): void {
        settings.value.fontFamily = family
        persist()
    }

    function updateScrollback(lines: number): void {
        settings.value.scrollback = lines
        persist()
    }

    function updateShell(shell: string): void {
        settings.value.shell = shell
        persist()
    }

    function updateLoginMode(mode: string): void {
        settings.value.loginMode = mode
        persist()
    }

    async function resetToDefaults(): Promise<void> {
        settings.value = { ...DEFAULT_SETTINGS }
        await persist()
    }

    return {
        settings,
        loading,
        initialized,
        fetchSettings,
        persist,
        updateTheme,
        updateFontSize,
        updateFontFamily,
        updateScrollback,
        updateShell,
        updateLoginMode,
        resetToDefaults
    }
})
