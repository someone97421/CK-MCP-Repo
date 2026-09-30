# CK-MCP-Repo

一个 MCP 工具集合仓库。每个 MCP 都位于独立目录，分别维护源码、依赖、配置示例、README 和许可证，可按需安装、单独使用。

| MCP | 简介 |
| --- | --- |
| [音视频理解](servers/media-understanding/README.md) | 使用 Gemini 原生 API 分析视频和音频 |
| [Litterbox 公网托管](servers/litterbox/README.md) | 上传本地文件取得公开临时链接，或返回已有媒体直链 |

## 安装

需要 Git、Node.js >=22.19.0 和 npm。先获取仓库：

```bash
git clone https://github.com/someone97421/CK-MCP-Repo.git
cd CK-MCP-Repo
```

### 按需独立安装

选择需要的 MCP，在对应目录安装依赖：

```bash
cd servers/media-understanding
npm ci --ignore-scripts --no-audit --no-fund
```

或：

```bash
cd servers/litterbox
npm ci --ignore-scripts --no-audit --no-fund
```

然后按该 MCP 的 README 配置客户端。每个 MCP 都是本地 stdio 服务，由客户端启动；GitHub 地址不是 HTTP MCP 连接地址。

### 使用集合安装脚本

也可在仓库根目录使用便捷脚本，更新代码、安装所选 MCP 的依赖并打印客户端配置模板：

```bash
node scripts/install.mjs --server media-understanding
node scripts/install.mjs --server litterbox
```

安装全部 MCP：

```bash
node scripts/install.mjs --server all
```

脚本只更新本仓库的 `main` 分支；有未提交改动时会停止，不覆盖本地文件。它不会修改客户端配置或启动服务。各 MCP 的独立安装不依赖此脚本。

### 让 Agent 安装

将仓库链接和以下指令交给有终端、文件编辑权限的 agent：

> 从 https://github.com/someone97421/CK-MCP-Repo 安装我选中的 MCP。先阅读 INSTALL.md 和对应 MCP 的 README，只安装所需依赖，增量配置我的 MCP 客户端并保留已有配置。真实凭据不得写进仓库。完成后报告启动命令和配置位置；未经授权，不调用收费模型、不上传文件、不运行测试或启动服务。

详细装配流程见 [INSTALL.md](INSTALL.md)，各 MCP 的配置、参数及使用说明见其目录内的 README。
