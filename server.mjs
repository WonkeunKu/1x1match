// 1x1 MATCH — static game site server (no dependencies).
// Serves index.html, auction/, blackwhite/ and keeps /api/health for the hosting platform's health check.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT) || 4174;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};
const PUBLIC = ['index.html', 'auction', 'blackwhite', 'robots.txt', 'favicon.ico'];

async function resolveFile(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  const rel = normalize(p).replace(/^([/\\])+/, '');
  if (rel.split(sep).some(part => part.startsWith('.'))) return null;
  if (rel && !PUBLIC.includes(rel.split(sep)[0])) return null;
  let full = join(ROOT, rel);
  if (!full.startsWith(ROOT)) return null;
  try {
    const s = await stat(full);
    if (s.isDirectory()) full = join(full, 'index.html');
    await stat(full);
    return full;
  } catch { return null; }
}

createServer(async (req, res) => {
  const path = (req.url || '/').split('?')[0];
  if (path === '/api/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  // /auction → /auction/ so relative photo paths resolve
  if ((path === '/auction' || path === '/blackwhite')) {
    res.writeHead(301, { location: path + '/' });
    res.end();
    return;
  }
  const file = await resolveFile(path);
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('페이지를 찾을 수 없어요.');
    return;
  }
  const body = await readFile(file);
  res.writeHead(200, {
    'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    'cache-control': extname(file) === '.html' ? 'no-cache' : 'public, max-age=86400'
  });
  res.end(body);
}).listen(PORT, HOST, () => {
  console.log(`1x1 MATCH running at http://${HOST}:${PORT}`);
});
