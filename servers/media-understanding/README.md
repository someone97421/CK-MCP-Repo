# 音视频理解 MCP

本地 Node.js stdio MCP，提供 `analyze_video` 和 `analyze_audio`。上传、等待处理和分析封装在一次工具调用中，agent 按素材类型选择工具。

源码与更新：**https://github.com/someone97421/CK-MCP-Repo**。本服务位于 `servers/media-understanding`。

## 独立安装

需要 Node.js >=22.19.0 和 npm；通过 Git 获取仓库时还需要 Git。

```bash
git clone https://github.com/someone97421/CK-MCP-Repo.git
cd CK-MCP-Repo/servers/media-understanding
npm ci --ignore-scripts --no-audit --no-fund
```

已取得代码时，在本 MCP 目录执行 `npm ci --ignore-scripts --no-audit --no-fund` 即可。源码、`package.json`、锁文件、配置示例和许可证均在本目录内，可将整个目录复制到其他位置后独立安装，不依赖根目录脚本或其他 MCP。

需要固定版本时，先在仓库中切换到所需提交，再安装本目录依赖。若希望自动更新代码并输出本机配置模板，也可在仓库根目录运行 `node scripts/install.mjs --server media-understanding`，具体见根目录 [安装说明](../../README.md) 和 [Agent 装配指南](../../INSTALL.md)。

## MCP 配置

服务使用 stdio，由 MCP 客户端管理子进程，不额外启动 HTTP 后端。命令为 `node`，参数为本目录 `server.mjs` 的绝对路径；复制目录后使用新位置的绝对路径。下方为占位示例，不要照搬目录或提交真实 Key。客户端找不到 Node 时，将 `command` 改为 Node 可执行文件的绝对路径：

```json
{
  "mcpServers": {
    "ck-media-understanding": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/CK-MCP-Repo/servers/media-understanding/server.mjs"],
      "env": {
        "VIDEO_API_BASE_URL": "https://generativelanguage.googleapis.com",
        "VIDEO_API_KEY": "YOUR_KEY",
        "VIDEO_MODEL_ID": "YOUR_MODEL_ID",
        "VIDEO_API_AUTH": "x-goog-api-key",
        "VIDEO_TRANSPORT": "auto",
        "VIDEO_TIMEOUT_SECONDS": "600"
      }
    }
  }
}
```

音频与视频沿用同一组 `VIDEO_*` 配置，不需要第二套 Key：

| 变量 | 默认值 | 含义 |
| --- | --- | --- |
| `VIDEO_API_BASE_URL` | Google Gemini API 根地址 | 可自定义中转路径和 `/v1beta` 或 `/v1`；不要填完整生成接口 |
| `VIDEO_API_KEY` | 必填 | 接入 Key；无认证模式可省略 |
| `VIDEO_MODEL_ID` | 必填 | 支持对应媒体输入的模型 ID，可带 `models/` 前缀 |
| `VIDEO_API_AUTH` | `x-goog-api-key` | 支持 `x-goog-api-key`、`bearer`、`none` |
| `VIDEO_TRANSPORT` | `auto` | `auto`、`inline`、`files` |
| `VIDEO_TIMEOUT_SECONDS` | `600` | 下载、上传、处理和分析的全流程超时，1–1800 秒 |
| `VIDEO_MAX_OUTPUT_TOKENS` | `4096` | 默认输出预算，1–65536，仍受模型自身限制 |

服务不自动读取 `.env`。需要本地环境文件时可在客户端启动参数中将 `--env-file=环境文件绝对路径` 放在 `server.mjs` 前。环境文件不要放进 Git。

## 输入与传输边界

- 每次一个音频或视频，非空且最多 **50,000,000 字节（50 MB）**。base64 按解码大小计算。
- `path`、`base64`、`url` 必须且只能提供一个。优先使用本地绝对路径；不要让 agent 把大段 base64 放进对话。
- `base64` 支持标准完整编码和 `data:audio/...;base64,...` / `data:video/...;base64,...`。纯编码需要 `mime_type`，不支持空白或 URL-safe 编码。
- `url` 是 HTTP(S) 文件直链，先下载检查大小；不支持网页、播放列表、YouTube 页面或自定义下载认证头。
- `auto`：10 MB 内走 inline base64，超过 10 MB 走 Files API。10 MB 是本工具选路阈值，不代表提供商限制。
- `inline`：只需 Gemini `generateContent`，适合未实现 Files API 的中转。50 MB 编码后约 66.7 MB，可能超过中转自身请求上限。
- `files`：接入点必须支持可恢复上传、文件状态查询和删除，返回可用的上传会话 URL。上传完成后分析，结束时尝试清理；清理失败会返回状态或写 stderr。进程被强制结束或上传响应丢失时可能残留文件。
- 这里只支持 **Gemini 原生协议**，不是 OpenAI `chat/completions` 或 `responses`。Bearer 只是认证方式，不转换协议。
- 同一进程只处理一个媒体任务，两种工具共用占用状态；并发调用返回忙碌错误。
- 不自动重试计费请求、不自动转码、不在本地裁剪。MIME 声明检查不是视频/音频解码验证。
- 全流程支持客户端取消。Files 清理最多额外等待 15 秒；客户端工具超时需覆盖任务所需时间。
- 内容会发送到配置接入点，不是离线分析。Key 不附加到媒体下载请求或上传会话 URL。

## 工具参数

| 参数 | `analyze_video` | `analyze_audio` | 含义 |
| --- | --- | --- | --- |
| `question` | 必填 | 必填 | 分析问题，1–20000 字符 |
| `path` / `base64` / `url` | 三选一 | 三选一 | 来源 |
| `mime_type` | 可选 | 可选 | 纯 base64 必填；其他来源可推断 |
| `transport` | 可选 | 可选 | 覆盖默认传输方式 |
| `temperature` | 可选 | 可选 | 0–2 |
| `max_output_tokens` | 可选 | 可选 | 1–65536 |
| `response_format` | 可选 | 可选 | `text` 或 `json` |
| `start_seconds` / `end_seconds` | 可选 | 不支持 | 视频片段起止，终点大于起点 |
| `fps` | 可选 | 不支持 | 视频采样率 `(0,24]` |

视频支持 MP4、MPEG/MPG、MOV、AVI、FLV、WebM、WMV、3GP 的 MIME 声明。音频支持 WAV、MP3/MPEG、AIFF、AAC、OGG、FLAC；M4A 不自动推断，需转换成支持的格式。具体编码与参数能力取决于模型和接入点。

视频起止时间通过 `videoMetadata` 传给模型，仍发送完整原视频，不减少上传大小。音频需要关注某个时间段时在问题中说明，同样不会减少上传大小。

## 调用示例

`analyze_video`：

```json
{
  "path": "E:/Videos/demo.mp4",
  "question": "按时间戳列出操作步骤，指出画面中的报错和可能原因。",
  "start_seconds": 10,
  "end_seconds": 60,
  "fps": 2,
  "max_output_tokens": 4096
}
```

`analyze_audio`：

```json
{
  "path": "E:/Audio/meeting.mp3",
  "question": "按说话人和时间戳转写录音，并总结结论与待办事项。",
  "max_output_tokens": 8192,
  "response_format": "text"
}
```

成功结果包含 `analysis`、`model`、来源类型、MIME、传输方式、`finish_reason`、用量、上传清理状态，以及 `video_bytes` 或 `audio_bytes`。JSON 模式额外返回 `analysis_json`。单份 API 响应最多读取 4 MB，不回传源 URL、源文件路径或媒体编码。

## 更新与卸载

通过 Git 安装时，在仓库根目录执行 `git pull --ff-only`，然后在本 MCP 目录执行 `npm ci --ignore-scripts --no-audit --no-fund`。本地改动或分支分叉需自行处理；复制目录安装时替换对应版本的源码并重新安装依赖。更新后在客户端重连此 MCP。

卸载时先移除客户端中此 MCP 的配置并关闭对应子进程，再删除不再使用的服务目录，保留其他 MCP 和用户配置。

## 开发与测试

本目录单独维护依赖和测试，不需要构建仓库内其他项目。以下命令均在本目录执行：

```bash
npm start
npm test
npm run pack
```

`npm start` 前台启动 stdio 服务，通常由 MCP 客户端启动；`npm test` 运行 Node 原生模拟测试，覆盖输入、限额、MIME、请求构造、Files 清理和取消；`npm run pack` 生成本 MCP 的 npm 归档。归档不是 MCPB，解压后仍需安装依赖并配置 stdio。

模拟测试不代表真实 API 联调。真实模型分析和具体中转兼容性需使用实际接入点、Key、模型 ID 和小样本验证；安装成功不等于视频或音频理解已验证。

## 许可证

本 MCP 使用 LGPL-3.0-only，见本目录 [LICENSE](LICENSE)。第三方依赖遵循各自许可证。
