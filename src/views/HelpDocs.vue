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
            htmlContent.value = '<p class="text-xs text-neutral-500">帮助文档加载失败</p>'
        }
    } catch {
        htmlContent.value = '<p class="text-xs text-neutral-500">帮助文档加载失败</p>'
    }
})
</script>

<template>
    <div class="help-docs p-5 max-h-full overflow-y-auto">
        <div class="prose dark:prose-invert prose-sm max-w-none" v-html="htmlContent" />
    </div>
</template>

<style scoped>
.help-docs :deep(pre) {
    white-space: pre-wrap;
    word-break: break-word;
}
</style>
