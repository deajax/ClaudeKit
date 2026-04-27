<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { marked } from 'marked'

defineProps<{
    visible: boolean
}>()

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
    <a-modal :open="visible" title="帮助文档" destroy-on-close @cancel="emit('close')">
    <div class="help-docs p-5 max-h-full overflow-y-auto">
        <div class="prose dark:prose-invert prose-sm max-w-none" v-html="htmlContent" />
    </div>
    </a-modal>
</template>

<style scoped>
.help-docs :deep(pre) {
    white-space: pre-wrap;
    word-break: break-word;
}
</style>
