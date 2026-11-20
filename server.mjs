// 1x1 MATCH — static game site server (no dependencies).
// Serves index.html, auction/, blackwhite/ and keeps /api/health for the hosting platform's health check.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Rooms from './game-data/auction-rooms.mjs';

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

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', ch => { raw += ch; if (raw.length > 10000) { reject(new Error('too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
function json(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(obj));
}

// 연봉 블라인드 경매 온라인 방 API
async function auctionApi(req, res, path, url) {
  const m = path.match(/^\/api\/auction\/rooms(?:\/([A-Za-z0-9]{4}))?(?:\/(join|act|restart|events|leave))?$/);
  if (path === '/api/auction/quick' && req.method === 'POST') { try { return json(res, 200, Rooms.quickJoin((await readJson(req)).name)); } catch (e) { return json(res, e instanceof Rooms.GameError ? 400 : 500, { error: e.message }); } }
  if (!m) return json(res, 404, { error: '없는 주소예요.' });
  const [, code, op] = m;
  try {
    if (req.method === 'GET' && code && op === 'events') return Rooms.subscribe(code, url.searchParams.get('token'), res);
    if (req.method === 'GET' && !code && !op) return json(res, 200, { rooms: Rooms.listRooms() });
    if (req.method !== 'POST') return json(res, 405, { error: 'POST만 돼요.' });
    const body = await readJson(req);
    if (!code && !op) return json(res, 200, Rooms.createRoom(body.name, body.public));
    if (op === 'leave') { Rooms.leaveRoom(code, body.token); return json(res, 200, { ok: true }); }
    if (op === 'join') return json(res, 200, Rooms.joinRoom(code, body.name, body.token));
    if (op === 'act') { Rooms.act(code, body.token, body); return json(res, 200, { ok: true }); }
    if (op === 'restart') { Rooms.restart(code, body.token); return json(res, 200, { ok: true }); }
    return json(res, 404, { error: '없는 주소예요.' });
  } catch (e) {
    if (e instanceof Rooms.GameError) return json(res, 400, { error: e.message });
    console.error(e);
    return json(res, 500, { error: '서버 오류가 났어요. 다시 시도해 주세요.' });
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://x');
  const path = url.pathname;
  if (path.startsWith('/api/auction/')) return auctionApi(req, res, path, url);
  if (path === '/api/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  // /auction → /auction/ so relative photo paths resolve
  if (['/auction', '/blackwhite', '/auction/online'].includes(path)) {
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
