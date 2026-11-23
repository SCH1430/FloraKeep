import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildExhibit } from './exhibit.mjs';
import { isContentAsset } from './web-assets.mjs';

const project = fileURLToPath(new URL('../', import.meta.url));
const dist = join(project, 'dist');
const { version } = JSON.parse(await readFile(join(project, 'package.json'), 'utf8'));
if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:-[\da-z.-]+)?$/i.test(version)) {
  throw new Error('В package.json требуется корректный номер версии.');
}

for (const args of [[], ['--web']]) {
  const build = spawnSync(process.execPath, ['scripts/build.mjs', ...args], { cwd: project, stdio: 'inherit' });
  if (build.error) throw build.error;
  if (build.status !== 0) throw new Error(`Сборка завершилась с кодом ${build.status ?? build.signal}.`);
}

await copyFile(join(project, 'index.html'), join(dist, 'portable.html'));
const exhibits = await buildExhibit(project, join(dist, 'exhibit'));

const checksumFile = 'SHA256SUMS.txt';
const files = await readdir(join(project, 'web'), { withFileTypes: true });
const compiledAssets=(await readdir(dist,{withFileTypes:true})).filter(file=>file.isFile()&&isContentAsset(file.name));
const names = [
  'icon.svg', 'index.html', 'portable.html',
  ...files.filter(file => file.isFile()).map(file => file.name),
  ...compiledAssets.map(file=>file.name),
  ...exhibits.map(name => `exhibit/${name}`),
].sort();
const hashes = await Promise.all(names.map(async name => {
  const data = await readFile(join(dist, name));
  return `${createHash('sha256').update(data).digest('hex')}  ${name}`;
}));
await writeFile(join(dist, checksumFile), `${hashes.join('\n')}\n`);
process.stdout.write(`Готов выпуск ${version}. Контрольные суммы: dist/${checksumFile}\n`);
