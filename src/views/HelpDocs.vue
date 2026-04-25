<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { marked } from 'marked'

const emit = defineEmits<{
    close: []
}>()

const htmlContent = ref('')

onMounted(async () => {
    try {
        const result = await window.electronAPI.invoke<{ success: boolean; data?: string }>('config:read-help')
        if (result.success && result.data) {
            htmlContent.value = await marked.parse(result.data)
        } else {
            htmlContent.value = '<p class="text-xs text-slate-500">帮助文档加载失败</p>'
        }
    } catch {
        htmlContent.value = '<p class="text-xs text-slate-500">帮助文档加载失败</p>'
    }
})
</script>

<template>
    <div class="help-docs p-5 max-h-full overflow-y-auto">
        <div class="prose prose-invert prose-sm max-w-none" v-html="htmlContent" />
    </div>
</template>

<style scoped>
.help-docs :deep(pre) {
    white-space: pre-wrap;
    word-break: break-word;
}
.help-docs :deep(h1) {
    font-size: 1.25rem;
    font-weight: 700;
    color: #f1f5f9;
    margin-top: 2rem;
    margin-bottom: 0.75rem;
}
.help-docs :deep(h2) {
    font-size: 1.1rem;
    font-weight: 600;
    color: #e2e8f0;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
}
.help-docs :deep(h3) {
    font-size: 0.95rem;
    font-weight: 600;
    color: #e2e8f0;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
}
.help-docs :deep(h4) {
    font-size: 0.85rem;
    font-weight: 500;
    color: #cbd5e1;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
}
.help-docs :deep(p) {
    font-size: 0.8rem;
    color: #cbd5e1;
    margin: 0.5rem 0;
    line-height: 1.6;
}
.help-docs :deep(code) {
    padding: 0.125rem 0.25rem;
    background: #1e293b;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    color: #93c5fd;
}
.help-docs :deep(pre) {
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 0.375rem;
    padding: 0.75rem;
    margin: 0.5rem 0;
    overflow-x: auto;
}
.help-docs :deep(pre code) {
    font-size: 0.75rem;
    color: #cbd5e1;
    padding: 0;
    background: none;
}
.help-docs :deep(a) {
    color: #60a5fa;
    text-decoration: underline;
}
.help-docs :deep(li) {
    font-size: 0.8rem;
    color: #cbd5e1;
}
.help-docs :deep(hr) {
    border-color: #334155;
    margin: 1rem 0;
}
.help-docs :deep(strong) {
    color: #f1f5f9;
}
</style>
