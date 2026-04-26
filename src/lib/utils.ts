// 通用工具函数

export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

export function getOs(): 'mac' | 'win' | 'linux' {
    const platform = navigator.platform.toLowerCase()
    if (platform.includes('mac')) return 'mac'
    if (platform.includes('win')) return 'win'
    return 'linux'
}
