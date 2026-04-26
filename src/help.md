# Claude CLI Desktop 帮助文档

## Claude Code 配置机制说明

Claude Code 通过环境变量控制模型提供商、API 密钥等行为，支持两种配置方式：

### 方式一：Shell 环境变量
```bash
export ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
export ANTHROPIC_AUTH_TOKEN=sk-xxxx
export ANTHROPIC_MODEL=deepseek-v4-pro
```
终端启动 `claude` 时自动读取。

### 方式二：settings.json 的 `env` 字段
```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "sk-xxxx"
  }
}
```
作用于 `~/.claude/settings.json`（用户级）或 `.claude/settings.local.json`（项目级）。

### 优先级关系
settings.json 的 `env` 字段**优先级高于** shell 环境变量。如果两者都配置了同一变量，settings.json 会覆盖 shell 中的值，甚至可能因配置冲突导致报错。

---

## 常见报错及处理方法

### 1. 认证失败 (Authentication Failed)
- **原因**: `ANTHROPIC_AUTH_TOKEN` 未设置或已过期
- **解决**: 检查 API Key 是否有效，重新填入正确的 Key

### 2. 模型不存在
- **原因**: `ANTHROPIC_MODEL` 指定的模型在该模型商不可用
- **解决**: 确认模型商支持该模型，修改为正确的模型 ID

### 3. 配置冲突
- **原因**: settings.json 和 shell 环境变量同时配置了相同变量但值不同
- **解决**: 使用本工具的「应用」按钮注入环境变量，避免同时使用 settings.json 方式

### 4. Claude Code 未找到
- **原因**: Claude Code CLI 未安装
- **解决**: 运行 `npm install -g @anthropic-ai/claude-code` 安装

---

## 使用方法 / 操作流程

### 切换模型商
1. 在顶部工具栏下拉框中选择模型商
2. 在二级下拉框中选择模型
3. 点击「应用」按钮
4. 确认终端重启提示
5. 终端自动重启，新配置生效

### 运行任务
1. 点击「运行任务」按钮
2. 从任务列表中选择要执行的任务
3. 任务将在新标签页中执行

### 管理环境变量
1. 点击「更多 → 环境变量管理」
2. macOS 用户可直接编辑 shell 配置文件
3. Windows 用户通过表格管理变量
4. 保存后重启终端生效

---

## 模型商配置教程

### 阿里云百炼
- BASE_URL: `https://dashscope.aliyuncs.com/compatible-mode/v1`
- 在阿里云百炼控制台获取 API Key

### DeepSeek
- BASE_URL: `https://api.deepseek.com/anthropic`
- 支持余额查询（手动刷新）

### OpenRouter
- BASE_URL: `https://openrouter.ai/api`
- 需额外设置 `ANTHROPIC_API_KEY=""`（空字符串占位）
- 在 OpenRouter 平台获取 API Key

### 硅基流动
- BASE_URL: `https://api.siliconflow.cn/v1`
- 支持 Anthropic API 兼容接口

---

## 免登录配置说明

Claude Code 首次启动时要求完成登录向导。可使用以下方式跳过Claude Code的强制登录：

1. 打开本工具的「设置」
2. 点击「一键配置免登录」
3. 系统将在 `~/.claude.json` 中设置 `hasCompletedOnboarding: true`
4. 此操作可能需要系统权限授权

---

## 问题反馈 / 建议

如有问题或建议，请前往 GitHub Issues 提交反馈。

🔗 [提 Issues](https://github.com)
🔗 [仓库地址](https://github.com)
