# Litterbox 公网托管 MCP

独立 Node.js stdio 服务，将本地文件上传到 Litterbox，或将已有公网媒体直链返回为 MCP 链接。无需模型 Key，不依赖桌面插件或宿主文件接口。

源码与更新：**https://github.com/someone97421/CK-MCP-Repo**。本服务位于 `servers/litterbox`。

## 安装与配置

```bash
 git clone https://github.com/someone97421/CK-MCP-Repo.git
 cd CK-MCP-Repo
 node scripts/install.mjs --server litterbox
```

固定版本手动安装依赖：

```bash
npm --prefix servers/litterbox ci --ignore-scripts --no-audit --no-fund
```

需要 Node.js >=22.19.0。客户端添加 stdio MCP，命令为 `node`，参数为本机 `servers/litterbox/server.mjs` 的绝对路径，无需环境变量。安装脚本会输出本机正确路径；下方示例仅为占位：

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

更新与 agent 装配见根目录 [README](../../README.md) 和 [INSTALL](../../INSTALL.md)。可用 `npm --prefix servers/litterbox run pack` 生成 npm 归档；归档不是 MCPB，解压后仍需安装依赖和配置 stdio。

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

## 验证范围

原上传实现的现场尝试曾返回 `HTTP 412: No file!`，没有实测证明 Litterbox 上传链路成功。本次迁仓保留上传实现，不把服务端失败包装成成功；第三方服务可用性和完整媒体理解链路仍需按实际环境联调。

提供模拟测试，只有需要时才运行：

```bash
npm --prefix servers/litterbox test
```

本次迁仓未重新运行测试、真实上传或模型调用。

官方接口说明：https://litterbox.catbox.moe/tools.php
