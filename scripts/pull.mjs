import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const result = spawnSync(process.execPath, [
  fileURLToPath(new URL('./install.mjs', import.meta.url)),
  ...process.argv.slice(2), '--pull-only',
], { stdio: 'inherit' });
if (result.error) console.error(`拉取失败：${result.error.message}`);
process.exitCode = result.status ?? 1;
