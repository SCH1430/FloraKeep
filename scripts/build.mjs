import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isContentAsset } from './web-assets.mjs';

const project = fileURLToPath(new URL('../', import.meta.url));
const source = join(project, 'src');
const web = join(project, 'web');
const version = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8')).version;
const args = process.argv.slice(2);
const webBuild = args.includes('--web');
const outPosition = args.indexOf('--out');
if (outPosition >= 0 && !args[outPosition + 1]) {
  throw new Error('Pass a path after --out.');
}
const output = resolve(project, args[outPosition + 1] && outPosition >= 0
  ? args[outPosition + 1]
  : webBuild ? 'dist/index.html' : 'index.html');

const modules = [
  'game', 'art', 'media', 'ambience', 'backup', 'exchange', 'classroom-upgrades', 'knowledge', 'terrarium',
  'flight', 'gift', 'atelier', 'playground', 'story-studio', 'delights',
  'garden-upgrades', 'garden-design', 'visual-journal', 'chronicle', 'windowsill', 'cyanotype',
  'workbench', 'save-format', 'features', 'localization', 'app',
];
const script = modules.map(name => {
  const path = join(source, `${name}.js`);
  return readFileSync(path, 'utf8');
}).join('\n').replace("'__FLORA_VERSION__'", JSON.stringify(version));
if (/<\/script\s*>/i.test(script)) {
  throw new Error('An inline script contains an unescaped closing script tag.');
}
const styles = readdirSync(join(source, 'styles')).filter(name => name.endsWith('.css')).sort()
  .map(name => readFileSync(join(source, 'styles', name), 'utf8')).join('\n');
const assetTypes = { '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
function compactMusic(wave) {
  const canonical = wave.length >= 44 && wave.toString('ascii',0,4)==='RIFF'
    && wave.readUInt16LE(20)===1 && wave.readUInt16LE(22)===1 && wave.readUInt16LE(34)===16
    && wave.toString('ascii',36,40)==='data' && wave.readUInt32LE(40)===wave.length-44;
  if (!canonical || (wave.length-44)%4!==0) return wave;
  const inputFrames=(wave.length-44)/2;
  const outputFrames=inputFrames/2;
  const sampleRate=wave.readUInt32LE(24)/2;
  const output=Buffer.alloc(44+outputFrames*2);
  wave.copy(output,0,0,44);
  output.writeUInt32LE(output.length-8,4);
  output.writeUInt32LE(sampleRate,24);
  output.writeUInt32LE(sampleRate*2,28);
  output.writeUInt32LE(outputFrames*2,40);
  const weights=[1,6,15,20,15,6,1];
  for (let index=0;index<outputFrames;index++) {
    let mixed=0;
    for (let tap=0;tap<weights.length;tap++) {
      const frame=(index*2+tap-3+inputFrames)%inputFrames;
      mixed+=weights[tap]*wave.readInt16LE(44+frame*2);
    }
    output.writeInt16LE(Math.round(mixed/64),44+index*2);
  }
  return output;
}
const assets = {};
const webAssets = {};
const sceneStyles = [];
const sceneFingerprint = createHash('sha256');
const compiledFiles = new Map();
function contentAsset(role,ext,bytes) {
  const hash=createHash('sha256').update(bytes).digest('hex').slice(0,12);
  const name=`flora-${role}-${hash}${ext}`;
  if(!isContentAsset(name))throw new Error(`Unexpected generated filename: ${name}`);
  compiledFiles.set(name,bytes);
  return './'+name;
}
for (const entry of readdirSync(join(source, 'assets')).sort()) {
  const split = entry.lastIndexOf('.');
  const name = entry.slice(0, split);
  const extension=entry.slice(split);
  if (extension === '.webp') {
    const bytes = readFileSync(join(source, 'assets', entry));
    const url = webBuild ? contentAsset(name, extension, bytes) : `data:image/webp;base64,${bytes.toString('base64')}`;
    sceneStyles.push(`--${name}: url("${url}");`);
    sceneFingerprint.update(entry).update(bytes);
    continue;
  }
  const mime = assetTypes[extension];
  if (!mime) continue;
  const sourceBytes=readFileSync(join(source, 'assets', entry));
  const bytes=entry==='music.wav' ? compactMusic(sourceBytes) : sourceBytes;
  assets[name] = `data:${mime};base64,${bytes.toString('base64')}`;
  if(webBuild)webAssets[name]=name==='icon'?'./icon.svg':contentAsset(name,extension,bytes);
}
const template = readFileSync(join(source, 'index.template.html'), 'utf8');
const artifactId = createHash('sha256').update(script).update(styles).update(JSON.stringify(assets)).update(sceneFingerprint.digest()).update(template).digest('hex').slice(0, 16);
const revision = /^[a-f0-9]{40}$/i.test(process.env.GITHUB_SHA || '') ? process.env.GITHUB_SHA : null;
const repository = /^[\w.-]+\/[\w.-]+$/.test(process.env.GITHUB_REPOSITORY || '') ? process.env.GITHUB_REPOSITORY : null;
let sourceUrl = null;
if (revision && repository) {
  try {
    const origin = new URL(process.env.GITHUB_SERVER_URL || 'https://github.com');
    if (origin.protocol === 'https:' && !origin.username && !origin.password) {
      sourceUrl = new URL(`/${repository}/tree/${revision}`, origin).href;
    }
  } catch {
    // A local build is still identifiable by its content fingerprint.
  }
}
const buildInfo = { version, id: artifactId, revision, sourceUrl };
const chosenAssets = webBuild ? webAssets : assets;
const mainScript = `globalThis.__FLORA_STANDALONE__ = ${!webBuild};\nglobalThis.__FLORA_BUILD_INFO__ = ${JSON.stringify(buildInfo)};\nglobalThis.__FLORA_ASSETS__ = ${JSON.stringify(chosenAssets)};\n(() => {\n'use strict';\n${script}\n})();\n`;
const stylesheet = `:root { ${sceneStyles.join(' ')} }\n${styles}`;
const styleMarkup = webBuild
  ? `<link rel="stylesheet" href="${contentAsset('style','.css',stylesheet)}">`
  : `<style>\n${stylesheet}\n</style>`;
const scriptMarkup = webBuild
  ? `<script defer src="${contentAsset('app','.js',mainScript)}"></script>`
  : `<script>\n${mainScript}</script>`;
const html = '<!-- Flora Keep ' + version + ' · scripts/build.mjs -->\n' + template
  .replace('{{ICON}}', () => chosenAssets.icon)
  .replace('{{STYLES}}', () => styleMarkup)
  .replace('{{SCRIPT}}', () => scriptMarkup);

const directory=dirname(output);
mkdirSync(directory, { recursive: true });
if (webBuild) {
  const webEntries = existsSync(web) ? readdirSync(web, { withFileTypes: true })
    .filter(entry => entry.isFile()).sort((a, b) => a.name.localeCompare(b.name)) : [];
  const files = webEntries.map(entry => [entry.name, readFileSync(join(web, entry.name))]);
  const fingerprint = createHash('sha256').update(html);
  for (const [name, contents] of files) fingerprint.update(name).update(contents);
  const buildId = fingerprint.digest('hex').slice(0, 16);
  const shellAssetPaths=[...compiledFiles.keys()].map(name=>JSON.stringify(name)).join(', ');
  for(const [name,contents] of compiledFiles)writeFileSync(join(directory,name),contents);
  for (const [name, contents] of files) {
    const rendered = name === 'sw.js'
      ? contents.toString('utf8').replaceAll('__FLORA_BUILD_ID__', buildId)
        .replace('/* generated-shell-assets */',shellAssetPaths)
      : contents;
    writeFileSync(join(directory, name), rendered);
  }
  writeFileSync(join(directory, 'icon.svg'), readFileSync(join(source, 'assets', 'icon.svg')));
}
writeFileSync(output,html);
if(webBuild){
  for(const entry of readdirSync(directory,{withFileTypes:true})){
    if(entry.isFile()&&isContentAsset(entry.name)&&!compiledFiles.has(entry.name))unlinkSync(join(directory,entry.name));
  }
}
console.log(`${output} (${Buffer.byteLength(html)} bytes)`);
