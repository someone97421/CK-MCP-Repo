import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY = 'https://github.com/someone97421/CK-MCP-Repo.git';
const BRANCH = 'main';
const SERVICES = ['media-understanding', 'litterbox'];
const scriptDirectory = dirname(fileURLToPath(import.meta.url));

function run(command, args, cwd, capture = false) {
  const executable = process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command;
  // Windows 的 npm 是 cmd shim；安装参数固定，不拼接用户输入。
  const result = spawnSync(executable, args, {
    cwd, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit',
    shell: process.platform === 'win32' && command === 'npm',
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} 执行失败${result.error ? `：${result.error.message}` : `（退出码 ${result.status}）`}${capture && result.stderr ? `\n${result.stderr.trim()}` : ''}`);
  }
  return capture ? result.stdout.trim() : '';
}

function options(argv) {
  let destination;
  let pullOnly = false;
  let server = 'all';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dir' || argv[i] === '--server') {
      const option = argv[i];
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`${option} 后需要参数。`);
      const value = argv[++i];
      if (option === '--dir') destination = resolve(value);
      else server = value;
    } else if (argv[i] === '--pull-only') {
      pullOnly = true;
    } else if (argv[i] === '--help') {
      console.log('用法：node install.mjs [--dir 目标目录] [--server all|media-understanding|litterbox] [--pull-only]\n默认安装两个 MCP；在本仓库内运行时复用本仓库，否则安装到当前目录下的 CK-MCP-Repo。\n--pull-only 仅拉取代码，不安装依赖。需要 Node.js >=22.19.0 和 Git。');
      return null;
    } else {
      throw new Error(`未知参数：${argv[i]}`);
    }
  }
  if (!['all', ...SERVICES].includes(server)) throw new Error('--server 仅支持 all、media-understanding、litterbox。');
  const ownRepository = resolve(scriptDirectory, '..');
  destination ||= existsSync(join(ownRepository, '.git')) && existsSync(join(ownRepository, 'servers', SERVICES[0], 'package.json'))
    ? ownRepository : resolve('CK-MCP-Repo');
  return { destination, pullOnly, servers: server === 'all' ? SERVICES : [server] };
}

function isExpectedRepository(remote) {
  return [REPOSITORY, REPOSITORY.slice(0, -4), 'git@github.com:someone97421/CK-MCP-Repo.git', 'ssh://git@github.com/someone97421/CK-MCP-Repo.git'].includes(remote.replace(/\/$/, ''));
}

try {
  const selected = options(process.argv.slice(2));
  if (selected) {
    const [major, minor] = process.versions.node.split('.').map(Number);
    if (major < 22 || (major === 22 && minor < 19)) throw new Error('需要 Node.js 22.19.0 或更高版本。');
    const { destination, pullOnly, servers } = selected;
    run('git', ['--version']);
    if (!existsSync(destination)) {
      run('git', ['clone', '--branch', BRANCH, REPOSITORY, destination]);
    } else if (!existsSync(join(destination, '.git'))) {
      throw new Error(`目标目录已存在但不是本仓库，请用 --dir 指定新的目录：${destination}`);
    } else {
      const origin = run('git', ['remote', 'get-url', 'origin'], destination, true);
      if (!isExpectedRepository(origin)) throw new Error('目标目录的 origin 不是 CK-MCP-Repo；请指定本仓库目录，不会修改其他仓库远端。');
      const branch = run('git', ['branch', '--show-current'], destination, true);
      if (branch !== BRANCH) throw new Error(`目标目录不在 ${BRANCH} 分支，请先自行处理分支后再拉取。`);
      if (run('git', ['status', '--porcelain'], destination, true)) throw new Error('目标仓库有未提交改动，请先处理改动再更新；安装脚本不会覆盖它们。');
      run('git', ['pull', '--ff-only', 'origin', BRANCH], destination);
    }
    const mcpServers = {};
    for (const server of servers) {
      const serviceDirectory = join(destination, 'servers', server);
      if (!existsSync(join(serviceDirectory, 'package-lock.json'))) throw new Error(`${server} 缺少依赖锁文件，请检查拉取结果。`);
      if (!pullOnly) run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], serviceDirectory);
      const entry = { command: 'node', args: [join(serviceDirectory, 'server.mjs')] };
      if (server === 'media-understanding') entry.env = {
        VIDEO_API_BASE_URL: 'https://generativelanguage.googleapis.com',
        VIDEO_API_KEY: 'YOUR_KEY', VIDEO_MODEL_ID: 'YOUR_MODEL_ID',
        VIDEO_API_AUTH: 'x-goog-api-key', VIDEO_TRANSPORT: 'auto', VIDEO_TIMEOUT_SECONDS: '600',
      };
      mcpServers[`ck-${server}`] = entry;
    }
    console.log(`\n${pullOnly ? '代码已拉取' : '依赖已安装'}：${destination}`);
    console.log('将以下 stdio 配置加入 MCP 客户端，替换占位接入信息；保留客户端已有配置。');
    console.log(JSON.stringify({ mcpServers }, null, 2));
    if (pullOnly) console.log('仅拉取模式没有安装依赖；启用 MCP 前请运行安装脚本。');
    console.log('脚本不会启动服务、调用模型、运行测试或写入真实凭据。');
  }
} catch (error) {
  console.error(`装配失败：${error.message}`);
  process.exitCode = 1;
}
