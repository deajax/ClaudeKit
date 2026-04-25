<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'
import { Button } from '@/components/ui/button'

const props = defineProps<{
    sessionId: string
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

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

async function createTerminal(): Promise<void> {
    if (!terminalEl.value) return

    await settingsStore.fetchSettings()

    const initResult = await window.electronAPI.invoke<{
        success: boolean
        sessionId: string
        error?: string
    }>('terminal:create', {
        cols: 120,
        rows: 30,
        envVars: props.envVars,
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
        theme: {
            background: settings.value.theme === 'dark' ? '#0f172a' : '#ffffff',
            foreground: settings.value.theme === 'dark' ? '#e2e8f0' : '#1e293b',
            cursor: '#3b82f6',
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

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
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
    })
    resizeObserver.observe(terminalEl.value)

    onUnmounted(() => {
        resizeObserver.disconnect()
    })

    emit('ready', currentSessionId)
}

function startClaude(): void {
    if (!terminal || claudeRunning.value) return
    terminal.write('claude\r')
    claudeRunning.value = true
}

function restartClaude(): void {
    if (!terminal) return
    terminal.write('\x03')
    setTimeout(() => {
        terminal?.write('claude\r')
    }, 500)
}

function stopClaude(): void {
    if (!terminal) return
    terminal.write('\x03')
    claudeRunning.value = false
}

function destroy(): void {
    unsubOutput?.()
    unsubExit?.()
    terminal?.dispose()
    terminal = null
    fitAddon = null
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

// 监听 envVars 变化，重启终端以应用新环境变量
watch(
    () => props.envVars,
    (_newEnv, _oldEnv) => {
        if (_oldEnv && JSON.stringify(_newEnv) !== JSON.stringify(_oldEnv)) {
            destroy()
            nextTick(() => createTerminal())
        }
    }
)

onMounted(() => {
    createTerminal()
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
    restartClaude,
    stopClaude,
    sendText,
    claudeRunning
})
</script>

<template>
    <div class="terminal-wrapper flex flex-col h-full w-full">
        <!-- Claude 按钮栏 -->
        <div class="claude-actions flex items-center gap-1.5 px-3 py-1 bg-slate-800 border-b border-slate-700 shrink-0">
            <Button
                size="sm"
                :variant="claudeRunning ? 'ghost' : 'default'"
                :disabled="claudeRunning"
                @click="startClaude"
            >
                ▶ Claude
            </Button>
            <Button
                v-if="claudeRunning"
                size="sm"
                variant="secondary"
                class="bg-yellow-600/80 text-white hover:bg-yellow-600"
                @click="restartClaude"
            >
                🔄 重启
            </Button>
            <Button
                v-if="claudeRunning"
                size="sm"
                variant="destructive"
                @click="stopClaude"
            >
                ⏹ 停止
            </Button>
        </div>

        <!-- xterm 容器 -->
        <div ref="terminalEl" class="terminal-el flex-1 min-h-0 px-2 py-1" />
    </div>
</template>

<style scoped>
.terminal-el :deep(.xterm) {
    height: 100%;
}
.terminal-el :deep(.xterm-viewport) {
    scrollbar-width: thin;
    scrollbar-color: #475569 #1e293b;
}
</style>
