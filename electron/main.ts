import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerDbIPC, initDataDir } from './ipc/db'
import { registerTerminalIPC } from './ipc/terminal'
import { registerEnvIPC } from './ipc/env'
import { registerConfigIPC } from './ipc/config'
import { registerProviderIPC } from './ipc/provider'
import { registerTaskIPC } from './ipc/task'
import { destroyAllTerminals } from './ipc/terminal'

function createWindow(): void {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        show: false,
        frame: false,
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 16, y: 16 },
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
            nodeIntegration: false,
            contextIsolation: true
        }
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}

// 注册所有 IPC 模块
function registerIpcModules(): void {
    registerDbIPC()
    registerTerminalIPC()
    registerEnvIPC()
    registerConfigIPC()
    registerProviderIPC()
    registerTaskIPC()
}

app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.claudecli.desktop')

    // 初始化 ~/.ClaudeCLI/ 数据目录和 JSON 数据库文件
    initDataDir()

    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    registerIpcModules()

    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('will-quit', () => {
    destroyAllTerminals()
})
