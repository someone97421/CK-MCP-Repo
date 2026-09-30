# Agent 自动装配指南

本文件供协助用户安装 MCP 的 agent 阅读。唯一源码仓库：

**https://github.com/someone97421/CK-MCP-Repo**

## 交付目标

在用户指定的本地目录取得仓库，安装选中服务的锁定依赖，增量配置用户指定的 MCP 客户端。默认不启动独立后端、不上传文件、不调用计费模型、不运行测试。用户允许连接客户端时，由客户端管理 stdio 进程。

## 服务选择

| 选择 | 目录 | 工具 |
| --- | --- | --- |
| `media-understanding` | `servers/media-understanding` | `analyze_video`、`analyze_audio` |
| `litterbox` | `servers/litterbox` | `litterbox_upload_file`、`litterbox_attach_media_url` |
| `all` | 两个服务目录 | 全部四个工具 |

用户明确选择了服务时不要重复询问。普通音视频分析只需 `media-understanding`；公开文件托管才需要 `litterbox`。

## 装配步骤

1. 确定客户端和安装目录。优先沿用用户已有约定；无法判断客户端配置位置时再询问，不擅自猜测或覆盖文件。
2. 检查 Git、Node.js >=22.19.0 和 npm 是否可用。环境不满足时说明缺项，用户授权安装运行环境后再处理。
3. 从本仓库下载代码，先阅读所选 MCP 目录内的 README。各 MCP 独立维护依赖，在对应目录执行 `npm ci --ignore-scripts --no-audit --no-fund` 即可，不需要安装其他 MCP。也可在仓库根目录运行 `node scripts/install.mjs --server 选中的服务`，或单独下载该脚本并用 `--dir` 指定安装目录；该便捷脚本会更新仓库，固定版本安装使用各 MCP 的独立安装流程。
4. 使用所选 MCP 目录内的 `mcp-config.example.json` 配置客户端，将入口替换为本机 `server.mjs` 的绝对路径；使用安装脚本时也可采用其打印的模板。合并时保留其他 MCP 和用户配置；若名称冲突，确认或复用用户已指定的同一服务条目，不覆盖无关服务。安装依赖不会写客户端配置或启动服务。
5. 对音视频理解，收集用户提供的 Gemini 原生 API 接入点、Key 和模型 ID。选定认证方式及 `inline` / `files` / `auto`。无法确定中转是否支持 Files API 时说明差异；只支持生成接口的中转使用 `inline`。Litterbox 不需要模型 Key。
6. 将真实 Key 写入客户端支持的本地环境变量或私密配置，不写入 Git 跟踪文件、README、安装日志或公开链接。服务本身不自动加载 `.env`；需要文件时使用 Node `--env-file` 参数。
7. 告知用户配置位置、启动命令及如何重连。用户授权连接后确认对应工具可发现；若没有连接权限，明确报告“配置完成，工具发现尚未验证”，不要宣称运行成功。
8. 真视频、音频或上传测试必须取得用户授权和样本。报告实际结果；外部服务报错时保留失败事实，不因为配置成功就声称分析/上传成功。

## 安装命令

首次获取：

```bash
 git clone https://github.com/someone97421/CK-MCP-Repo.git
 cd CK-MCP-Repo
 node scripts/install.mjs --server all
```

已有仓库更新依赖：

```bash
node scripts/install.mjs --server media-understanding
```

仅更新源码：

```bash
node scripts/pull.mjs
```

单文件脚本的直接下载地址：

```text
https://raw.githubusercontent.com/someone97421/CK-MCP-Repo/main/scripts/install.mjs
```

例如用户选择特定位置和 Litterbox：

```bash
node /path/to/downloaded/install.mjs --dir "/path/to/CK-MCP-Repo" --server litterbox
```

`--pull-only` 只拉取仓库，不安装依赖。更新脚本固定 `main`，不处理本地修改、分叉或切换分支；需要固定提交时手动 clone / checkout 后在服务目录执行 `npm ci --ignore-scripts --no-audit --no-fund`。

## MCP 客户端适配

仓库根目录 `mcp-config.example.json` 是通用 `mcpServers` 示例，不保证每个客户端采用相同配置文件格式。以用户客户端的实际配置为准，所有服务都按 stdio 配置：

- `command`：用户安装的 Node 命令；客户端找不到 PATH 中的 Node 时使用 Node 可执行文件绝对路径。
- `args`：服务 `server.mjs` 的本机绝对路径，不依赖客户端当前工作目录。
- `env`：音视频理解的 `VIDEO_*` 配置；Litterbox 无需配置。
- 超时：任务默认最多 600 秒；媒体 Files 清理可能额外等待 15 秒。客户端若支持工具超时设置，按实际需要配置，否则说明可能提前取消。

不要将 GitHub 链接填成远程 HTTP MCP 连接地址。`resource_link` 或 `mediaUrl` 的返回值是否成为原生媒体输入取决于客户端，不是安装成功的必然结果。

## 更新与卸载

更新仓库并安装依赖后重连 MCP，确保旧子进程已由客户端关闭。卸载时先移除选中的客户端条目，关闭对应客户端进程，再删除不再使用的服务或整个安装目录；保留其他 MCP、用户文件和配置。

## 完成报告

简要说明安装了哪项服务、代码目录、配置位置、重连方式和实际验证范围。未授权的真实上传、模型调用或测试一律说明未执行。
