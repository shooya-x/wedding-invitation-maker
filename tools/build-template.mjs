// Builds template.js + audio.js (root) from demo/index.html + css + js + assets.
// Run: node tools/build-template.mjs  (works from any cwd)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO_PLACEHOLDER = '__AUDIO_SRC__';
const MIME = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
};

const cache = new Map();
// "mp3" di proyek ini sebenarnya kontainer MP4/M4A (header ftyp) — label mime ikut isi file,
// kalau tidak browser menolak memutar data URI-nya.
function audioSafeMime(ext, buf) {
  if (ext === '.mp3' && buf.toString('latin1', 4, 8) === 'ftyp') return 'audio/mp4';
  return MIME[ext];
}
function dataUri(absPath) {
  if (!cache.has(absPath)) {
    const ext = absPath.slice(absPath.lastIndexOf('.')).toLowerCase();
    if (!MIME[ext]) throw new Error(`Unsupported asset type "${ext}": ${absPath}`);
    let buf;
    try {
      buf = readFileSync(absPath);
    } catch {
      throw new Error(`Missing asset referenced by build: ${absPath}`);
    }
    cache.set(absPath, `data:${audioSafeMime(ext, buf)};base64,${buf.toString('base64')}`);
  }
  return cache.get(absPath);
}

const css = readFileSync(join(root, 'css/style.css'), 'utf8').replace(
  /url\(\s*(["']?)([^"')]+)\1\s*\)/g,
  (_m, _q, ref) => `url("${dataUri(join(root, 'css', ref))}")`,
);

const js = readFileSync(join(root, 'js/main.js'), 'utf8');

const html = readFileSync(join(root, 'demo/index.html'), 'utf8')
  .replace('<link rel="stylesheet" href="../css/style.css">', `<style>\n${css}</style>`)
  .replace('<script src="../js/main.js"></script>', `<script>\n${js}</script>`)
  .replace(/src="(\.\.\/assets\/images\/galeri-\d+\.svg)"/g, (_m, ref) => `src="${dataUri(join(root, 'demo', ref))}"`)
  .replace(/src="\.\.\/assets\/audio\/[^"]*\.mp3"/i, `src="${AUDIO_PLACEHOLDER}"`);

// Self-check: nothing external may survive in the template.
const galleryCount = (html.match(/data:image\/svg\+xml;base64,/g) || []).length;
for (const [name, ok] of [
  ['gallery images embedded (6)', (html.match(/class="gallery__tile" src="data:image\/svg\+xml;base64,/g) || []).length === 6],
  ['audio placeholder', html.includes(`src="${AUDIO_PLACEHOLDER}"`)],
  ['no src="../assets/', !html.includes('src="../assets/')],
  ['no src="../js/', !html.includes('src="../js/')],
  ['no href="../css/', !html.includes('href="../css/')],
  ['no url("../', !html.includes('url("../')],
]) {
  if (!ok) throw new Error(`Self-check failed: ${name}`);
}

const template =
  `window.WEDDING_TEMPLATE = { html: ${JSON.stringify(html)}, audioPlaceholder: "${AUDIO_PLACEHOLDER}" };\n`;
const audio = `window.WEDDING_AUDIO = "${dataUri(join(root, 'assets/audio/Payung Teduh - Akad.mp3'))}";\n`;

writeFileSync(join(root, 'template.js'), template);
writeFileSync(join(root, 'audio.js'), audio);

console.log(`built template.js  ${Buffer.byteLength(template)} bytes`);
console.log(`built audio.js     ${Buffer.byteLength(audio)} bytes`);
console.log(`embedded svg data URIs: ${galleryCount} | unique files cached: ${cache.size}`);
