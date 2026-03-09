<div align="center">
<img src="assets/icons/app.png" alt="AXCHAT" width="96" height="96" />
<h1>AXCHAT</h1>
  <p>
    <a href="./README.md">English</a> |
    <a href="./README.zh-CN.md">中文</a>
  </p>
  <p>AXCHAT 是一个跨平台 AI Chat 客户端，基于 Electron + Vite + React 开发。</p>
</div>

## 核心能力

- 多供应商聊天与模型切换
- 本地代理转发与 OpenAI-Compatible 接入
- 会话自动保存、搜索与恢复
- Tavily 搜索增强

## 支持的供应商

- Gemini
- OpenAI
- OpenAI-Compatible
- xAI
- DeepSeek
- GLM
- MiniMax
- Kimi

> OpenAI-Compatible 可用于接入兼容 OpenAI 协议的第三方服务。

## 快速开始

### 环境要求

- Node.js 20+
- npm
- Windows（当前仓库仅提供 Windows 打包脚本）

### 安装与运行

```bash
npm install
npm run electron:dev
```

仅调试前端：

```bash
npm run dev
```

## 常用脚本

| 脚本 | 说明 |
| --- | --- |
| `npm run electron:dev` | 启动 Electron 开发模式 |
| `npm run dev` | 仅启动前端开发服务器 |
| `npm run proxy:llm` | 单独启动本地代理 |
| `npm run build` | 构建前端产物 |
| `npm run electron:build:win` | 打包 Windows 安装程序 |
| `npm run lint` | 运行 ESLint |
| `npm run format` | 使用 Prettier 格式化代码 |

## 使用说明

1. 打开 Settings，选择供应商并填写 API Key。
2. 按需配置模型、Base URL 与自定义 Header。
3. 需要联网搜索时，配置 Tavily 并启用搜索增强。
4. 新建会话后即可开始聊天。

## 本地代理

- 默认监听 `127.0.0.1:4010`
- 用于静态上游转发和 OpenAI-Compatible 请求转发

可选环境变量：

| 变量 | 说明 |
| --- | --- |
| `MINIMAX_PROXY_PORT` | 本地代理端口，默认 `4010` |
| `MINIMAX_PROXY_HOST` | 本地代理监听地址，默认 `127.0.0.1` |
| `MINIMAX_PROXY_ALLOWED_ORIGINS` | 额外允许的 CORS 来源，逗号分隔 |
| `AXCHAT_PROXY_TOKEN` | 代理访问令牌；设置后需要 `x-axchat-proxy-token` 请求头 |
| `AXCHAT_PROXY_STATIC_HTTP2` | 是否为静态上游代理启用 HTTP/2 |

## 数据与安全

- 本地数据库位于系统 `userData` 目录下的 `axchat.sqlite`
- 保存内容包括会话、消息、供应商配置和部分应用设置
- API Key 优先使用系统安全存储
- 删除应用 `userData` 目录可重置本地数据

## 项目结构

```text
apps/
  main/          Electron 主进程
  renderer/      前端界面与业务逻辑
  server/        本地代理服务
  shared/        共享配置
assets/icons/    应用图标
scripts/         开发与辅助脚本
```
