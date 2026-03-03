<div align="center">
  <img src="assets/icons/app.png" alt="AchatX" width="96" height="96" />
  <h1>AchatX</h1>
</div>

AchatX 是一款跨平台的AI聊天应用，支持多家模型供应商（兼容openai格式的第三方供应商）与搜索增强，适合日常对话与检索辅助。

## 🚀 核心功能

- 多模型供应商切换与模型配置
- 文本对话
- 可选搜索增强（搜索引擎）
- 会话自动保存、搜索与排序
- 本地 Ollama 支持

## 🧱 技术栈

- Electron + Vite + React
- TypeScript
- Tailwind CSS
- OpenAI SDK / Google GenAI SDK
- Fastify 代理

## 🤝 支持的供应商

- Gemini
- OpenAI
- OpenAI-Compatible
- OpenRouter
- Ollama
- xAI
- DeepSeek
- GLM
- MiniMax
- Moonshot
- iFlow

## ⚡ 快速开始

1. 安装依赖

```
npm install
```

2. 启动开发模式

```
npm run electron:dev
```

如仅需前端：

```
npm run dev
```

## 🧭 基本使用

1. 打开设置，选择供应商并填写 API Key
2. 可按需开启“搜索引擎”并配置 Tavily Key
3. 新建对话后即可开始聊天
4. 输入后即可发送文本对话

## ⚙️ 配置说明

- API Key：必须填写，否则无法请求模型
- 模型：可填写供应商支持的模型名
- Base URL / 自定义 Header：OpenAI-Compatible、OpenRouter 支持
- 搜索引擎：可选，用于搜索增强

### 🔒 本地代理安全参数（可选）

- `MINIMAX_PROXY_PORT`：本地代理端口（默认 `4010`）
- `MINIMAX_PROXY_HOST`：本地代理监听地址（默认 `127.0.0.1`）
- `MINIMAX_PROXY_ALLOWED_ORIGINS`：额外允许的 CORS 来源，多个用逗号分隔
- `ACHATX_PROXY_TOKEN`：代理访问令牌；设置后，请求需带 `x-achatx-proxy-token` 头

### 🌐 OpenRouter 专用说明

- 默认 Base URL：`https://openrouter.ai/api/v1`
- API Key：填写 OpenRouter 的 API Key
- 模型名：可填写 `openrouter/auto` 或任意 OpenRouter 模型 ID
- 可选自定义 Header（建议）：
  - `HTTP-Referer`：你的站点 URL
  - `X-Title`：你的应用名称

可选环境变量：

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `OPENROUTER_BASE_URL`
- `OPENROUTER_SITE_URL`
- `OPENROUTER_APP_NAME`

### 🦙 Ollama 专用说明

- 默认 Base URL：`http://localhost:11434/v1/`
- API Key：可留空（仅用于占位）
- 模型名：填写本地 Ollama 模型名，例如 `llama3.2`

## 🧰 常用脚本

- 开发：`npm run electron:dev`
- 构建：`npm run build`
- Windows 打包：`npm run electron:build:win`
- 代码检查：`npm run lint`
- 格式化：`npm run format`

## 🗂️ 目录结构

```
apps/main      Electron 主进程
apps/renderer  前端界面
apps/server    本地代理
assets/icons   应用图标
```

## ⚠️ 注意事项

- 本项目主要面向本地使用，API Key 会在本地保存
- 搜索增强需要额外的 Tavily Key
