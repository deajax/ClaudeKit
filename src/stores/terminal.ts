import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TerminalTab } from '../../shared/types'
import { getTerminalData, saveTerminalData } from '@/lib/db'
import { generateId } from '@/lib/utils'

export const useTerminalStore = defineStore('terminal', () => {
    const tabs = ref<TerminalTab[]>([])
    const activeTabId = ref('')
    const loading = ref(false)

    async function fetchTabs(): Promise<void> {
        loading.value = true
        try {
            const data = await getTerminalData()
            tabs.value = data.tabs ?? []
            activeTabId.value = data.activeTabId ?? ''
        } catch {
            // 空列表
        } finally {
            loading.value = false
        }
    }

    async function persist(): Promise<void> {
        try {
            await saveTerminalData({
                tabs: tabs.value.map(t => ({ ...t })),
                activeTabId: activeTabId.value
            })
        } catch (e) {
            console.error('[terminalStore] persist error:', e)
        }
    }

    function addTab(title = 'terminal', cwd = ''): string {
        const id = generateId()
        const tab: TerminalTab = {
            id,
            title,
            cwd: cwd || '~',
            createdAt: new Date().toISOString()
        }
        tabs.value.push(tab)
        activeTabId.value = id
        persist()
        return id
    }

    function closeTab(id: string): boolean {
        if (tabs.value.length <= 1) {
            return false
        }
        const idx = tabs.value.findIndex((t) => t.id === id)
        if (idx === -1) return false

        tabs.value.splice(idx, 1)

        if (activeTabId.value === id) {
            const newIdx = Math.min(idx, tabs.value.length - 1)
            activeTabId.value = tabs.value[newIdx]?.id ?? ''
        }
        persist()
        return true
    }

    function setActive(id: string): void {
        activeTabId.value = id
        persist()
    }

    function renameTab(id: string, title: string): void {
        const tab = tabs.value.find((t) => t.id === id)
        if (tab) {
            tab.title = title
            persist()
        }
    }

    function updateCwd(id: string, cwd: string): void {
        const tab = tabs.value.find((t) => t.id === id)
        if (tab) {
            tab.cwd = cwd
            persist()
        }
    }

    return {
        tabs,
        activeTabId,
        loading,
        fetchTabs,
        persist,
        addTab,
        closeTab,
        setActive,
        renameTab,
        updateCwd
    }
})
