# Litterbox 公网托管 MCP

独立 Node.js stdio 服务，将本地文件上传到 Litterbox，或将已有公网媒体直链返回为 MCP 链接。无需模型 Key，不依赖桌面插件或宿主文件接口。

源码与更新：**https://github.com/someone97421/CK-MCP-Repo**。本服务位于 `servers/litterbox`。

## 独立安装

需要 Node.js >=22.19.0 和 npm；通过 Git 获取仓库时还需要 Git。

```bash
git clone https://github.com/someone97421/CK-MCP-Repo.git
cd CK-MCP-Repo/servers/litterbox
npm ci --ignore-scripts --no-audit --no-fund
```

已取得代码时，在本 MCP 目录执行 `npm ci --ignore-scripts --no-audit --no-fund` 即可。源码、`package.json`、锁文件、配置示例和许可证均在本目录内，可将整个目录复制到其他位置后独立安装，不依赖根目录脚本或其他 MCP。

需要固定版本时，先在仓库中切换到所需提交，再安装本目录依赖。若希望自动更新代码并输出本机配置模板，也可在仓库根目录运行 `node scripts/install.mjs --server litterbox`，具体见根目录 [安装说明](../../README.md) 和 [Agent 装配指南](../../INSTALL.md)。

## MCP 配置

客户端添加 stdio MCP，命令为 `node`，参数为本目录 `server.mjs` 的绝对路径，无需环境变量。复制目录后使用新位置的绝对路径；客户端找不到 Node 时，将 `command` 改为 Node 可执行文件的绝对路径。下方示例仅为占位：

```json
{
  "mcpServers": {
    "ck-litterbox": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/CK-MCP-Repo/servers/litterbox/server.mjs"]
    }
  }
}
```

默认全流程最多 600 秒，客户端提前取消会中止上传；较大文件需要客户端工具超时允许足够时间。不另开 HTTP 服务，不自动重试上传。


## 上传本地文件

工具：`litterbox_upload_file`。

| 参数 | 是否必填 | 含义 |
| --- | --- | --- |
| `path` | 是 | 服务所在电脑的普通文件绝对路径 |
| `expiration` | 否 | `1h`、`12h`、`24h`、`72h`，默认 `24h` |
| `mimeType` | 否 | 覆盖扩展名推断；未知扩展名默认 `application/octet-stream` |

```json
{
  "path": "E:/Videos/clip.mp4",
  "expiration": "24h"
}
```

```json
{
  "path": "/home/user/recording.bin",
  "mimeType": "audio/wav",
  "expiration": "1h"
}
```

返回 `url`、MIME、字节数、预计到期时间，以及标准 `resource_link`。原文件不被修改或删除。文件非空且最多 1,000,000,000 字节；实现采用 256 KiB 分块读取和流式 multipart 上传，不把文件 base64 写入工具结果。限额取决于服务端实际策略。

## 附加已有媒体直链

工具：`litterbox_attach_media_url`。

| 参数 | 是否必填 | 含义 |
| --- | --- | --- |
| `url` | 是 | 不含账号密码的公网 HTTPS 文件直链 |
| `mimeType` | 是 | `image/*`、`audio/*`、`video/*` 类型 |
| `size` | 否 | 0–100,000,000 字节，由调用者提供 |
| `expiresAt` | 否 | Unix 毫秒到期时间，已过期时拒绝 |

```json
{
  "url": "https://example.com/audio.mp3",
  "mimeType": "audio/mpeg",
  "size": 4200000
}
```

该工具只返回链接，不上传、下载或验证资源可用性；省略大小不代表文件已通过大小检查。

## 客户端与模型边界

- 上传后的文件是公开临时资源，任何持有链接的人都能访问。请只上传适合公开的素材；到期后需要重新上传。
- 工具成功结果包括文本 JSON、标准 MCP `resource_link` 和 `structuredContent`。100 MB 内的图片、音频、视频额外包含 `mediaUrl = { url, mimeType, size?, expiresAt? }`，供支持该结构的客户端进一步处理；更大的媒体仅返回托管链接和提示。
- `mediaUrl` 是客户端协作字段，不保证每个 MCP 客户端都会把链接作为原生媒体传给模型。只取得链接不等于已经完成媒体理解。
- 本仓库的音视频理解 MCP 可直接接收上传结果的 `url`，并独立下载检查 **50 MB** 上限，再发给配置的 Gemini 接入点。Litterbox 的上传上限与媒体理解上限是两条不同边界。
- 文件路径是 MCP 所在电脑上的路径，不是远端客户端的路径。本地读取遵循启动 MCP 的系统用户权限。
- stdout 专供协议，错误通过工具结果或 stderr 返回；没有文件扫描、后台自动上传或计费模型调用。

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

`npm start` 前台启动 stdio 服务，通常由 MCP 客户端启动；`npm test` 运行模拟测试；`npm run pack` 生成本 MCP 的 npm 归档。归档不是 MCPB，解压后仍需安装依赖并配置 stdio。

模拟测试不代表真实上传联调。第三方服务可用性、实际上传限额和客户端媒体处理能力需按实际环境验证；安装成功不等于上传或媒体理解已验证。

官方接口说明：https://litterbox.catbox.moe/tools.php

## 许可证

本 MCP 使用 LGPL-3.0-only，见本目录 [LICENSE](LICENSE)。第三方依赖遵循各自许可证。
