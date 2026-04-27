<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { RiUpload2Line } from '@remixicon/vue'
import type { Provider } from '../../shared/types'

const props = withDefaults(defineProps<{
    visible: boolean
    provider: (Provider & { id: string }) | null
    isNew?: boolean
}>(), {
    isNew: false
})

const emit = defineEmits<{
    close: []
    save: [data: Provider, verified: boolean]
    delete: [id: string]
}>()

const testStatus = ref<'idle' | 'testing' | 'success' | 'fail'>('idle')
const testErrorMsg = ref('')
const balanceStatus = ref<'idle' | 'loading' | 'success' | 'fail'>('idle')
const balanceResult = ref('')
const fileList = ref<any[]>([])

const formModel = reactive({
    name: '',
    icon: '',
    key: '',
    baseUrl: '',
    authToken: '',
    model: '',
    opus: '',
    sonnet: '',
    haiku: '',
    balanceApi: '',
})

function resetForm(): void {
    formModel.name = ''
    formModel.icon = ''
    formModel.key = ''
    formModel.baseUrl = ''
    formModel.authToken = ''
    formModel.model = ''
    formModel.opus = ''
    formModel.sonnet = ''
    formModel.haiku = ''
    formModel.balanceApi = ''
    testStatus.value = 'idle'
    testErrorMsg.value = ''
    fileList.value = []
}

function populateForm(p: Provider & { id: string }): void {
    formModel.name = p.name
    formModel.icon = p.icon
    formModel.key = p.key ?? ''
    formModel.baseUrl = p.BASE_URL
    formModel.authToken = p.AUTH_TOKEN
    formModel.model = p.model
    formModel.opus = p.opusModel ?? ''
    formModel.sonnet = p.sonnetModel ?? ''
    formModel.haiku = p.haikuModel ?? ''
    formModel.balanceApi = p.balanceApi ?? ''
    testStatus.value = 'idle'
    testErrorMsg.value = ''
    fileList.value = p.icon
        ? [{ uid: '-1', name: 'icon', status: 'done', url: p.icon, thumbUrl: p.icon }]
        : []
}

watch(() => props.visible, (v) => {
    if (!v) return
    if (props.isNew) {
        resetForm()
    } else if (props.provider) {
        populateForm(props.provider)
    }
})

function onIconUpload(file: File): boolean {
    const reader = new FileReader()
    reader.onload = () => {
        const dataUrl = reader.result as string
        formModel.icon = dataUrl
        fileList.value = [{ uid: '-1', name: file.name, status: 'done', url: dataUrl, thumbUrl: dataUrl }]
    }
    reader.readAsDataURL(file)
    return false
}

function onRemoveIcon(): void {
    formModel.icon = ''
    fileList.value = []
}

async function testConnectivity(): Promise<void> {
    if (!formModel.baseUrl || !formModel.authToken) {
        testErrorMsg.value = '请先填写 BASE_URL 和 AUTH_TOKEN'
        testStatus.value = 'fail'
        return
    }
    testStatus.value = 'testing'
    testErrorMsg.value = ''
    try {
        const result = await window.electronAPI.invoke<{ success: boolean; error?: string }>(
            'system:test-provider',
            formModel.baseUrl,
            formModel.authToken,
            formModel.model,
            formModel.balanceApi || undefined
        )
        testStatus.value = result.success ? 'success' : 'fail'
        if (!result.success) testErrorMsg.value = result.error ?? '连接失败'
    } catch (e) {
        testStatus.value = 'fail'
        testErrorMsg.value = (e as Error).message
    }
}

function formatBalance(data: unknown): string {
    const d = data as Record<string, unknown> | undefined
    if (!d) return JSON.stringify(data)

    // DeepSeek 格式: { balance_infos: [{ currency, total_balance, topped_up_balance, granted_balance }] }
    if (Array.isArray(d.balance_infos)) {
        return (d.balance_infos as Array<Record<string, unknown>>)
            .map(b => `${b.currency ?? '?'}: ${b.total_balance ?? '-'}`)
            .join(', ')
    }

    // 通用格式: { total_credits / total / balance } 等
    if (d.total_credits !== undefined) return `Credits: ${d.total_credits}`
    if (d.total !== undefined) return `Total: ${d.total}`
    if (d.balance !== undefined) return `Balance: ${d.balance}`

    return JSON.stringify(data)
}

async function queryBalance(): Promise<void> {
    if (!formModel.balanceApi || !formModel.authToken) {
        balanceStatus.value = 'fail'
        balanceResult.value = '请先填写余额查询 API 和 AUTH_TOKEN'
        return
    }
    balanceStatus.value = 'loading'
    balanceResult.value = ''
    try {
        const result = await window.electronAPI.invoke<{ success: boolean; data?: unknown; error?: string }>(
            'system:balance-query',
            formModel.balanceApi,
            formModel.authToken
        )
        if (result.success && result.data) {
            balanceStatus.value = 'success'
            balanceResult.value = formatBalance(result.data)
        } else {
            balanceStatus.value = 'fail'
            balanceResult.value = result.error ?? '查询失败'
        }
    } catch (e) {
        balanceStatus.value = 'fail'
        balanceResult.value = (e as Error).message
    }
}

function onSave(): void {
    const data: Provider = {
        name: formModel.name,
        icon: formModel.icon,
        key: formModel.key || undefined,
        BASE_URL: formModel.baseUrl,
        AUTH_TOKEN: formModel.authToken,
        model: formModel.model,
        opusModel: formModel.opus || undefined,
        sonnetModel: formModel.sonnet || undefined,
        haikuModel: formModel.haiku || undefined,
        balanceApi: formModel.balanceApi || undefined,
    }
    emit('save', data, testStatus.value === 'success')
}

function onClose(): void {
    emit('close')
}
</script>

<template>
    <a-modal :open="visible" :title="isNew ? '新增模型商' : `编辑 — ${formModel.name}`" :zIndex="1050" centered @cancel="onClose">
        <a-form :model="formModel" layout="vertical" class="max-h-[55vh] overflow-y-auto pr-2">
            <a-form-item label="名称" name="name">
                <a-input v-model:value="formModel.name" placeholder="例如：DeepSeek" :disabled="!isNew" />
            </a-form-item>
            <a-form-item label="图标" name="icon">
                <a-upload list-type="picture-card" v-model:file-list="fileList" :before-upload="onIconUpload"
                    accept="image/*" @remove="onRemoveIcon">
                    <div v-if="fileList.length === 0" class="flex flex-col items-center justify-center">
                        <RiUpload2Line class="text-lg" />
                        <div style="margin-top: 8px">上传</div>
                    </div>
                </a-upload>
            </a-form-item>
            <a-form-item label="Base URL" name="baseUrl">
                <a-input v-model:value="formModel.baseUrl" placeholder="https://api.deepseek.com/anthropic" />
            </a-form-item>
            <a-form-item label="API key" name="authToken"
                :validate-status="testStatus === 'success' ? 'success' : testStatus === 'fail' ? 'error' : ''"
                :help="testStatus === 'success' ? '通过' : testStatus === 'fail' ? testErrorMsg : ''">
                <div class="flex gap-2">
                    <a-input v-model:value="formModel.authToken" placeholder="sk-xxxx" class="flex-1" />
                    <a-button :loading="testStatus === 'testing'" @click="testConnectivity">
                        测试连通性
                    </a-button>
                </div>
            </a-form-item>

            <a-typography-title :level="5">模型设置</a-typography-title>

            <div
                class="mt-3 mb-4 bg-neutral-50 border border-neutral-200 dark:bg-white/5 dark:border-white/10 rounded-md py-2 px-4">
                <span class="text-xs text-black/45 dark:text-white/45">
                    Claude Code 最多可以配置4个模型，其中一个自定义的「默认模型」，<br />三个覆盖 Claude 默认模型的自定义模型。
                </span>
            </div>

            <a-form-item label="默认模型" name="model">
                <a-input v-model:value="formModel.model" class="font-mono" placeholder="例如：deepseek-chat" />
            </a-form-item>
            <a-form-item label="覆盖Opus模型" name="opus">
                <a-input v-model:value="formModel.opus" class="font-mono" placeholder="覆盖旗舰模型（可选）" />
            </a-form-item>
            <a-form-item label="覆盖Sonnet模型" name="sonnet">
                <a-input v-model:value="formModel.sonnet" class="font-mono" placeholder="覆盖高级模型（可选）" />
            </a-form-item>
            <a-form-item label="覆盖Haiku模型" name="haiku">
                <a-input v-model:value="formModel.haiku" class="font-mono" placeholder="覆盖初级模型（可选）" />
            </a-form-item>
            <a-form-item label="余额查询 API" name="balanceApi"
                :validate-status="balanceStatus === 'success' ? 'success' : balanceStatus === 'fail' ? 'error' : ''"
                :help="balanceStatus === 'fail' ? balanceResult : balanceStatus === 'success' ? balanceResult : ''">
                <a-input v-model:value="formModel.balanceApi" class="font-mono"
                    placeholder="https://api.deepseek.com/user/balance" />
            </a-form-item>
        </a-form>
        <template #footer>
            <div class="flex items-center justify-between">
                <a-button v-if="!isNew" danger @click="emit('delete', props.provider!.id)">
                    删除
                </a-button>
                <div v-else />
                <a-space>
                    <a-button @click="onClose">取消</a-button>
                    <a-button type="primary" @click="onSave">确定</a-button>
                </a-space>
            </div>
        </template>
    </a-modal>
</template>

<style lang="less" scoped>
:deep(.ant-upload-list) {
    .ant-upload-list-item-actions {
        display: flex;
        align-items: center;
        justify-content: center;

        a {
            width: 24px;
            height: 22px;
            display: inline-flex;
            align-items: center;
            justify-content: center
        }
    }
}
</style>