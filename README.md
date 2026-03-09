<div align="center">
<img src="assets/icons/app.png" alt="AXCHAT" width="96" height="96" />
<h1>AXCHAT</h1>
  <p>
    <a href="./README.md">English</a> |
    <a href="./README.zh-CN.md">中文</a>
  </p>
  <p>AXCHAT is a cross-platform AI chat client built with Electron + Vite + React.</p>
</div>

## Core Features

- Multi-provider chat and model switching
- Local proxy forwarding and OpenAI-compatible access
- Automatic session save, search, and restore
- Tavily search enhancement

## Supported Providers

- Gemini
- OpenAI
- OpenAI-Compatible
- xAI
- DeepSeek
- GLM
- MiniMax
- Kimi

> OpenAI-Compatible is intended for third-party services that follow the OpenAI-compatible API format.

## Quick Start

### Requirements

- Node.js 20+
- npm
- Windows (the repository currently ships with Windows packaging scripts only)

### Install and Run

```bash
npm install
npm run electron:dev
```

Frontend only:

```bash
npm run dev
```

## Common Scripts

| Script | Description |
| --- | --- |
| `npm run electron:dev` | Start Electron in development mode |
| `npm run dev` | Start the frontend dev server only |
| `npm run proxy:llm` | Start the local proxy only |
| `npm run build` | Build frontend assets |
| `npm run electron:build:win` | Package the Windows installer |
| `npm run lint` | Run ESLint |
| `npm run format` | Format the codebase with Prettier |

## Usage

1. Open Settings, choose a provider, and enter the API key.
2. Configure model, base URL, and custom headers when needed.
3. Configure Tavily and enable search enhancement when web search is required.
4. Create a session and start chatting.

## Local Proxy

- Default bind address: `127.0.0.1:4010`
- Used for static upstream forwarding and OpenAI-compatible request forwarding

Optional environment variables:

| Variable | Description |
| --- | --- |
| `MINIMAX_PROXY_PORT` | Local proxy port, default `4010` |
| `MINIMAX_PROXY_HOST` | Local proxy host, default `127.0.0.1` |
| `MINIMAX_PROXY_ALLOWED_ORIGINS` | Extra allowed CORS origins, comma-separated |
| `AXCHAT_PROXY_TOKEN` | Proxy access token; requests must include `x-axchat-proxy-token` when set |
| `AXCHAT_PROXY_STATIC_HTTP2` | Enables HTTP/2 for static upstream proxying |

## Data and Security

- Local data is stored under the system `userData` directory in `axchat.sqlite`
- Stored content includes sessions, messages, provider settings, and part of the app settings
- API keys prefer secure system-backed storage
- Removing the app `userData` directory resets local data

## Project Structure

```text
apps/
  main/          Electron main process
  renderer/      Frontend UI and business logic
  server/        Local proxy service
  shared/        Shared configuration
assets/icons/    App icons
scripts/         Development and helper scripts
```
