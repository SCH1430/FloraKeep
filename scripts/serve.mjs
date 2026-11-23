import { createReadStream } from 'node:fs';
import { access, readFile, realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { basename, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { brotliCompress, constants } from 'node:zlib';
import { isContentAsset } from './web-assets.mjs';

const mimeTypes = {
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
};

function inside(folder, file) {
  const name = relative(folder, file);
  return Boolean(name) && !isAbsolute(name) && name !== '..' && !name.startsWith(`..${sep}`);
}

const compress=promisify(brotliCompress);
function acceptsBrotli(raw='') {
  const choices=String(raw).toLowerCase().split(',').map(token=>token.split(';').map(part=>part.trim()));
  const [encoding,...parameters]=choices.find(([name])=>name==='br')||choices.find(([name])=>name==='*')||[];
  const quality=parameters.find(parameter=>parameter.trim().startsWith('q='));
  return Boolean(encoding)&&(!quality||Number(quality.split('=')[1])>0);
}

export async function createFloraServer(folder, { preview = false } = {}) {
  const root = await realpath(folder);
  await access(resolve(root, 'index.html'));
  const compressedAssets=new Map();
  function compressedFile(file) {
    if(!compressedAssets.has(file)){
      if(compressedAssets.size>=12)compressedAssets.delete(compressedAssets.keys().next().value);
      const bytes=readFile(file).then(data=>compress(data,{params:{[constants.BROTLI_PARAM_QUALITY]:5}}));
      compressedAssets.set(file,bytes);
      bytes.catch(()=>compressedAssets.delete(file));
    }
    return compressedAssets.get(file);
  }

  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Flora-Channel', preview ? 'preview' : 'stable');
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }

    let file;
    let info;
    try {
      const { pathname } = new URL(request.url, 'http://localhost');
      const requested = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
      const target = resolve(root, requested);
      if (!inside(root, target)) throw new Error('Path outside web folder');
      file = await realpath(target);
      if (!inside(root, file)) throw new Error('Path outside web folder');
      info = await stat(file);
      if (!info.isFile()) throw new Error('Expected a regular file');
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Файл не найден.');
      return;
    }

    const extension=extname(file).toLowerCase();
    const cacheable=isContentAsset(basename(file));
    const canCompress=cacheable&&info.size>=1024&&['.css','.js'].includes(extension);
    const packed=canCompress&&acceptsBrotli(request.headers?.['accept-encoding'])
      ? await compressedFile(file).catch(()=>null) : null;
    response.writeHead(200, {
      'Cache-Control': cacheable ? 'public, max-age=31536000, immutable' : 'no-cache',
      'Content-Type': mimeTypes[extension] ?? 'application/octet-stream',
      'Content-Length': packed?.length??info.size,
      ...(canCompress?{Vary:'Accept-Encoding'}:{}),
      ...(packed?{'Content-Encoding':'br'}:{}),
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    if(packed){
      response.end(packed);
      return;
    }
    await pipeline(createReadStream(file), response).catch(() => response.destroy());
  });
}

export const channelPort = ({ preview = false } = {}) => preview ? 4174 : 4173;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.some(value => value !== '--preview') || args.length !== new Set(args).size) {
    throw new Error('Использование: node scripts/serve.mjs [--preview]');
  }
  const preview = args.includes('--preview');
  const port = channelPort({ preview });
  const target = fileURLToPath(new URL('../dist/', import.meta.url));
  const server = await createFloraServer(target, { preview }).catch(error => {
    throw new Error('Не удалось открыть dist. Сначала выполните node scripts/release.mjs.', { cause: error });
  });
  server.listen(port, '127.0.0.1', () => {
    process.stdout.write(`${preview ? 'Пробный' : 'Обычный'} сад: http://127.0.0.1:${port}/\n`);
  });
}
