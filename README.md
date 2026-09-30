# CK-MCP-Repo

本地 MCP 服务集合，独立维护和分发，支持 Windows、macOS、Linux。用户可以手动安装，也可以将仓库链接交给 agent 自动装配。

仓库地址：**https://github.com/someone97421/CK-MCP-Repo**

## 服务目录

| MCP 服务 | 工具 | 用途 | 接入配置 |
| --- | --- | --- | --- |
| [音视频理解](servers/media-understanding/README.md) | `analyze_video`、`analyze_audio` | 视频画面与声音分析、录音转写与总结、音乐和环境声音分析 | Gemini 原生 API 接入点、Key、模型 ID |
| [Litterbox 公网托管](servers/litterbox/README.md) | `litterbox_upload_file`、`litterbox_attach_media_url` | 上传本地文件取得公开临时链接，或返回已有媒体链接 | 无需模型 Key |

两项服务都是本地 **stdio MCP**，由客户端管理子进程，不额外启动 HTTP 后端。GitHub 链接是下载入口，不是可填入 HTTP MCP 客户端的连接地址。

## 让 Agent 装配

将下面这段指令和仓库链接交给有终端、文件编辑权限的 agent：

> 从 https://github.com/someone97421/CK-MCP-Repo 安装 MCP。先阅读 README.md 和 INSTALL.md，询问我需要音视频理解、Litterbox 或两个都装。使用仓库的安装脚本，将选中的服务增量加入我的 MCP 客户端，保留已有配置。音视频理解的接入点、Key、模型 ID 由我提供，不要把真实凭据写进仓库。完成后报告启动命令和配置位置。除非我授权，不调用收费模型、不上传文件、不运行测试或后台启动服务。

具体流程见 [INSTALL.md](INSTALL.md)。安装脚本只拉取代码、安装依赖、打印配置模板，不擅自修改客户端配置。

## 快速安装

需要 **Git、Node.js >=22.19.0、npm**。在计划保存 MCP 的父目录运行：

```bash
 git clone https://github.com/someone97421/CK-MCP-Repo.git
 cd CK-MCP-Repo
 node scripts/install.mjs
```

默认安装两个服务。只安装一项：

```bash
node scripts/install.mjs --server media-understanding
node scripts/install.mjs --server litterbox
```

指定已有仓库或新的安装位置：

```bash
node scripts/install.mjs --dir "E:/MCP/CK-MCP-Repo" --server all
```

脚本输出使用本机绝对路径的 `mcpServers` 模板。将选中的配置加入客户端；音视频理解需要替换 `YOUR_KEY` 和 `YOUR_MODEL_ID`，接入点也可改成 Gemini 原生协议的中转。

### 不先手动 Clone

安装脚本可单独下载，然后自行拉取本仓库。下载链接和脚本内仓库地址均指向 `CK-MCP-Repo`。

Windows PowerShell：

```powershell
$installer = Join-Path $env:TEMP 'ck-mcp-install.mjs'
Invoke-WebRequest 'https://raw.githubusercontent.com/someone97421/CK-MCP-Repo/main/scripts/install.mjs' -OutFile $installer
node $installer --dir "$HOME/CK-MCP-Repo" --server all
```

macOS / Linux：

```bash
curl -fL https://raw.githubusercontent.com/someone97421/CK-MCP-Repo/main/scripts/install.mjs -o /tmp/ck-mcp-install.mjs
node /tmp/ck-mcp-install.mjs --dir "$HOME/CK-MCP-Repo" --server all
```

这些命令拉取 `main` 当前版本，不是固定版本安装。需要复现时，手动 clone 后 checkout 所需提交，再在各服务目录执行 `npm ci --ignore-scripts --no-audit --no-fund`；不要用更新脚本切换版本。

## 仅拉取与更新

在已经克隆的仓库内仅拉取代码：

```bash
node scripts/pull.mjs
```

只下载了单文件安装脚本时，可用同样模式：

```bash
node /tmp/ck-mcp-install.mjs --dir "$HOME/CK-MCP-Repo" --pull-only
```

更新代码并同步依赖：

```bash
node scripts/install.mjs --server all
```

脚本仅更新本仓库的 `main`，使用 fast-forward 拉取；有未提交改动、其他远端或其他分支时会说明问题，不覆盖改动、不重绑其他项目远端。更新后需在客户端重连对应 MCP。

## 使用边界

- 音视频理解单次原始媒体最多 **50 MB**，支持文件路径、标准 base64/data URL 和 HTTP(S) 文件直链。URL 会下载并检查大小；内容再发送到配置的接入点。本地 MCP 不代表离线模型。
- 音视频理解使用 `Gemini generateContent` 协议，不是 OpenAI `chat/completions` 或 `responses` 协议。`inline` 适合仅支持生成接口的中转；`files` 要求支持 Files API。
- Litterbox 上传后，任何持有链接的人都能访问文件。有效期可选 1、12、24、72 小时，默认 24 小时；不要上传不适合公开的内容。
- Litterbox 标准 MCP 链接可供客户端使用，但是否会直接交给模型理解取决于客户端。支持 `structuredContent.mediaUrl` 的客户端可进一步处理；不是所有客户端都有该能力。
- 两项服务可配合：Litterbox 上传后取得 `url`，再将该 URL 作为音视频理解的输入。音视频工具仍会下载检查，且仍受 50 MB 限制；能上传不代表一定能分析。
- 服务不会自动将托管文件交给音视频工具，也不会扫描目录或在安装时上传素材；由 agent 按任务显式调用。

## 开发

每项服务的 `package.json`、依赖锁文件和测试独立维护，不需要构建桌面项目。测试仅在明确需要时运行：

```bash
npm --prefix servers/media-understanding test
npm --prefix servers/litterbox test
```

代码和模拟测试不等于真实服务联调完成。外部 API 可用性、模型能力和客户端兼容性见各服务 README。

## 许可证

沿用来源项目的 LGPL-3.0 许可，见 [LICENSE](LICENSE)。第三方依赖各自遵循其许可证。
