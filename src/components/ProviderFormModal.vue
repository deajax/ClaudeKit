<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { RiUpload2Line } from '@remixicon/vue'
import type { Provider } from '../../shared/types'

const props = defineProps<{
    visible: boolean
    provider: (Provider & { id: string }) | null
}>()

const emit = defineEmits<{
    close: []
    save: [data: Provider, verified: boolean]
}>()

const isNew = ref(true)
const testStatus = ref<'idle' | 'testing' | 'success' | 'fail'>('idle')
const testErrorMsg = ref('')
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
    if (props.provider) {
        isNew.value = false
        populateForm(props.provider)
    } else {
        isNew.value = true
        resetForm()
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
    <a-modal :open="visible" :title="isNew ? '新增模型商' : `编辑 — ${formModel.name}`" centered @cancel="onClose">
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
            <a-form-item label="ANTHROPIC_BASE_URL" name="baseUrl">
                <a-input v-model:value="formModel.baseUrl" placeholder="https://api.deepseek.com/anthropic" />
            </a-form-item>
            <a-form-item label="ANTHROPIC_AUTH_TOKEN" name="authToken">
                <a-input v-model:value="formModel.authToken" type="password" placeholder="sk-xxxx" />
            </a-form-item>

            <a-typography-title :level="5">模型设置</a-typography-title>

            <a-form-item label="ANTHROPIC_MODEL（默认模型）" name="model">
                <a-input v-model:value="formModel.model" class="font-mono" placeholder="例如：deepseek-chat" />
            </a-form-item>
            <a-form-item label="ANTHROPIC_DEFAULT_OPUS_MODEL" name="opus">
                <a-input v-model:value="formModel.opus" class="font-mono" placeholder="覆盖旗舰模型（可选）" />
            </a-form-item>
            <a-form-item label="ANTHROPIC_DEFAULT_SONNET_MODEL" name="sonnet">
                <a-input v-model:value="formModel.sonnet" class="font-mono" placeholder="覆盖高级模型（可选）" />
            </a-form-item>
            <a-form-item label="ANTHROPIC_DEFAULT_HAIKU_MODEL" name="haiku">
                <a-input v-model:value="formModel.haiku" class="font-mono" placeholder="覆盖初级模型（可选）" />
            </a-form-item>
            <template v-if="formModel.name.includes('DeepSeek') || formModel.name.includes('deepseek')">
                <a-form-item label="余额查询 API" name="balanceApi">
                    <a-input v-model:value="formModel.balanceApi" class="font-mono"
                        placeholder="https://api.deepseek.com/user/balance" />
                </a-form-item>
            </template>
        </a-form>
        <template #footer>
            <div class="flex items-center">
                <a-space>
                    <a-button :loading="testStatus === 'testing'" @click="testConnectivity">
                        测试连通性
                    </a-button>
                    <a-tag v-if="testStatus === 'success'" color="green">通过</a-tag>
                    <a-tag v-else-if="testStatus === 'fail'" color="red">{{ testErrorMsg || '未通过' }}</a-tag>
                </a-space>
                <a-space class="ml-auto">
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