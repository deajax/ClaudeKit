<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { getOs } from '@/lib/utils'
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'

const props = defineProps<{
    sessionId: string
    cwd?: string
    envVars?: Record<string, string>
}>()

const emit = defineEmits<{
    ready: [sessionId: string]
    exit: [sessionId: string, code: number]
}>()

const terminalEl = ref<HTMLDivElement>()
const claudeRunning = ref(false)

let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
let unsubOutput: (() => void) | null = null
let unsubExit: (() => void) | null = null
let currentSessionId = ''
let resizeObserver: ResizeObserver | null = null
const isWindows = getOs() === 'win'

function calculateDimensions(): { cols: number; rows: number } {
    if (!terminalEl.value) return { cols: 80, rows: 24 }
    const size = settings.value.fontSize || 14
    const charWidth = size * 0.6
    const charHeight = size * 1.3
    return {
        cols: Math.max(20, Math.floor(terminalEl.value.clientWidth / charWidth)),
        rows: Math.max(5, Math.floor(terminalEl.value.clientHeight / charHeight))
    }
}

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

async function createTerminal(cwd?: string): Promise<void> {
    if (!terminalEl.value) return

    await settingsStore.fetchSettings()

    const dims = calculateDimensions()

    const initResult = await window.electronAPI.invoke<{
        success: boolean
        sessionId: string
        error?: string
    }>('terminal:create', {
        cols: dims.cols,
        rows: dims.rows,
        cwd: cwd && cwd !== '~' ? cwd : undefined,
        envVars: { ...(props.envVars || {}) },
        shell: settings.value.shell || undefined
    })

    if (!initResult.success) {
        console.error('Failed to create terminal:', initResult.error)
        return
    }

    currentSessionId = initResult.sessionId

    terminal = new Terminal({
        cursorBlink: true,
        cursorStyle: 'bar',
        fontSize: settings.value.fontSize,
        fontFamily: settings.value.fontFamily,
        letterSpacing: 0,
        lineHeight: 1.1,
        windowsMode: isWindows,
        convertEol: true,
        theme: {
            background: settings.value.theme === 'dark' ? '#141414' : '#ffffff',
            foreground: settings.value.theme === 'dark' ? '#d4d4d4' : '#1e293b',
            cursor: settings.value.theme === 'dark' ? '#d4d4d4' : '#1e293b',
            selectionBackground: 'rgba(59, 130, 246, 0.3)'
        },
        scrollback: settings.value.scrollback,
        allowProposedApi: true
    })

    fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(terminalEl.value)

    nextTick(() => {
        fitAddon?.fit()
    })

    // Forward user input to pty
    terminal.onData((data: string) => {
        window.electronAPI.invoke('terminal:input', currentSessionId, data)
    })

    // Listen for pty output
    unsubOutput = window.electronAPI.on('terminal:output', (sid, data) => {
        if (sid === currentSessionId && terminal) {
            terminal.write(data as string)
        }
    })

    // Listen for pty exit
    unsubExit = window.electronAPI.on('terminal:exit', (sid, info) => {
        if (sid === currentSessionId) {
            const { exitCode } = info as { exitCode: number; signal: number }
            claudeRunning.value = false
            emit('exit', currentSessionId, exitCode)
            if (terminal) {
                terminal.writeln(`\r\n[进程已退出，exit code: ${exitCode}]`)
            }
        }
    })

    // Handle resize (debounced to avoid IPC flood during rapid window resizing)
    if (resizeObserver) {
        resizeObserver.disconnect()
    }
    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    resizeObserver = new ResizeObserver(() => {
        if (resizeTimer) clearTimeout(resizeTimer)
        resizeTimer = setTimeout(() => {
            if (fitAddon && terminal) {
                fitAddon.fit()
                const dims = fitAddon.proposeDimensions()
                if (dims) {
                    window.electronAPI.invoke(
                        'terminal:resize',
                        currentSessionId,
                        dims.cols,
                        dims.rows
                    )
                }
            }
        }, 200)
    })
    resizeObserver.observe(terminalEl.value)

    emit('ready', currentSessionId)
}

function startClaude(): void {
    if (!terminal || claudeRunning.value) return
    window.electronAPI.invoke('terminal:input', currentSessionId, 'claude\r')
    claudeRunning.value = true
    terminal.focus()
}

async function stopClaude(cwd?: string): Promise<void> {
    if (!terminal) return
    claudeRunning.value = false
    destroy()
    await nextTick()
    await createTerminal(cwd)
}

function destroy(): void {
    unsubOutput?.()
    unsubExit?.()
    terminal?.dispose()
    terminal = null
    fitAddon = null
    if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
    }
    if (currentSessionId) {
        window.electronAPI.invoke('terminal:destroy', currentSessionId)
    }
}

watch(
    () => settings.value.fontSize,
    (size) => {
        if (terminal) terminal.options.fontSize = size
    }
)

watch(
    () => settings.value.fontFamily,
    (family) => {
        if (terminal) terminal.options.fontFamily = family
    }
)

watch(
    () => settings.value.theme,
    (theme) => {
        if (!terminal) return
        terminal.options.theme = {
            background: theme === 'dark' ? '#141414' : '#ffffff',
            foreground: theme === 'dark' ? '#d4d4d4' : '#1e293b',
            cursor: theme === 'dark' ? '#d4d4d4' : '#1e293b',
            selectionBackground: 'rgba(59, 130, 246, 0.3)'
        }
    }
)

// 监听 envVars 变化，重启终端以应用新环境变量
watch(
    () => props.envVars,
    (_newEnv, _oldEnv) => {
        if (JSON.stringify(_newEnv) !== JSON.stringify(_oldEnv)) {
            destroy()
            nextTick(() => createTerminal(props.cwd))
        }
    }
)

onMounted(() => {
    createTerminal(props.cwd)
})

onUnmounted(() => {
    destroy()
})

function sendText(text: string): void {
    if (!terminal || !currentSessionId) return
    window.electronAPI.invoke('terminal:input', currentSessionId, text + '\r')
}

defineExpose({
    startClaude,
    stopClaude,
    sendText,
    claudeRunning
})
</script>

<template>
    <div class="terminal-wrapper flex flex-col h-full w-full">
        <!-- xterm 容器 -->
        <div ref="terminalEl" class="terminal-el flex-1 min-h-0 p-3" />
    </div>
</template>

<style scoped>
.terminal-el :deep(.xterm) {
    height: 100%;
}
.terminal-el :deep(.xterm-viewport) {
    scrollbar-width: thin;
    scrollbar-color: #d1d5db #f3f4f6;
}
.dark .terminal-el :deep(.xterm-viewport) {
    scrollbar-color: #475569 #1e293b;
}
</style>
