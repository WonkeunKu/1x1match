// 1x1 MATCH — static game site server (no dependencies).
// Serves index.html, auction/, blackwhite/ and keeps /api/health for the hosting platform's health check.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Rooms from './game-data/auction-rooms.mjs';
import * as BwRooms from './game-data/bw-rooms.mjs';

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
const PUBLIC = ['index.html', 'auction', 'blackwhite', 'history', 'robots.txt', 'favicon.ico'];

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

// 온라인 방 API (연봉 경매: /api/auction, 흑과 백: /api/bw) — 두 게임이 같은 주소 구조를 씀
function roomApi(R, prefix) {
  const re = new RegExp('^' + prefix + '/rooms(?:/([A-Za-z0-9]{4}))?(?:/(join|act|restart|events|leave))?$');
  return async (req, res, path, url) => {
    const fail = e => e instanceof R.GameError ? json(res, 400, { error: e.message }) : (console.error(e), json(res, 500, { error: '서버 오류가 났어요. 다시 시도해 주세요.' }));
    if (path === prefix + '/quick' && req.method === 'POST') {
      try { return json(res, 200, R.quickJoin((await readJson(req)).name)); } catch (e) { return fail(e); }
    }
    const m = path.match(re);
    if (!m) return json(res, 404, { error: '없는 주소예요.' });
    const [, code, op] = m;
    try {
      if (req.method === 'GET' && code && op === 'events') return R.subscribe(code, url.searchParams.get('token'), res);
      if (req.method === 'GET' && !code && !op) return json(res, 200, { rooms: R.listRooms() });
      if (req.method !== 'POST') return json(res, 405, { error: 'POST만 돼요.' });
      const body = await readJson(req);
      if (!code && !op) return json(res, 200, R.createRoom(body.name, body.public));
      if (op === 'join') return json(res, 200, R.joinRoom(code, body.name, body.token));
      if (op === 'leave') { R.leaveRoom(code, body.token); return json(res, 200, { ok: true }); }
      if (op === 'act') { R.act(code, body.token, body); return json(res, 200, { ok: true }); }
      if (op === 'restart') { R.restart(code, body.token); return json(res, 200, { ok: true }); }
      return json(res, 404, { error: '없는 주소예요.' });
    } catch (e) { return fail(e); }
  };
}
const auctionApi = roomApi(Rooms, '/api/auction');
const bwApi = roomApi(BwRooms, '/api/bw');

createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://x');
  const path = url.pathname;
  if (path === '/api/auction/ai' && req.method === 'POST') {
    try { const b = await readJson(req); return json(res, 200, Rooms.createAiRoom(b.name, b.level)); }
    catch (e) { return json(res, e instanceof Rooms.GameError ? 400 : 500, { error: e.message }); }
  }
  if (path.startsWith('/api/auction/')) return auctionApi(req, res, path, url);
  if (path.startsWith('/api/bw/')) return bwApi(req, res, path, url);
  if (path === '/api/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  // /auction → /auction/ so relative photo paths resolve
  // 진행자용 경매판은 없앴으므로 /auction 은 온라인 경매로 보냄
  if (path === '/auction' || path === '/auction/' || path === '/auction/index.html') {
    res.writeHead(302, { location: '/auction/online/' });
    res.end();
    return;
  }
  if (['/blackwhite', '/auction/online', '/blackwhite/online', '/auction/ai', '/history'].includes(path)) {
    res.writeHead(301, { location: path + '/' });
    res.end();
    return;
  }
  // 연봉 경매 AI 대전은 온라인 화면과 같은 파일을 쓰고, 화면이 주소를 보고 AI 모드로 바뀜
  const file = path === '/auction/ai/' ? join(ROOT, 'auction/online/index.html') : await resolveFile(path);
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
