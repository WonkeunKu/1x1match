// 1x1 MATCH — static game site server (no dependencies).
// Serves index.html, auction/, blackwhite/ and keeps /api/health for the hosting platform's health check.
import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Rooms from './game-data/auction-rooms.mjs';
import * as BwRooms from './game-data/bw-rooms.mjs';
import * as SlitherRooms from './game-data/slither-rooms.mjs';
import * as H13 from './game-data/heavy13-rooms.mjs';
import * as Duel from './game-data/duel-rooms.mjs';
import * as Geo from './game-data/geo.mjs';
H13.setFinishHook((uid, entry) => Accounts.addHistory(uid, entry).catch(e => console.error('heavy13 history', e.message)));
import * as Relay from './game-data/relay.mjs';
import * as Accounts from './game-data/accounts.mjs';

// 로그인한 사람이 방에서 경기를 끝내면 기록을 저장
const saveFinish = (uid, entry) => Accounts.addHistory(uid, entry).catch(e => console.error('history save failed', e.message));
Rooms.setFinishHook(saveFinish);
BwRooms.setFinishHook(saveFinish);
SlitherRooms.setFinishHook(saveFinish);
console.log(Accounts.usingSupabase ? 'Accounts: Supabase' : 'Accounts: local data/accounts.json (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set)');

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
const PUBLIC = ['index.html', 'auction', 'blackwhite', 'history', 'account', 'robots.txt', 'favicon.ico', 'favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'icon-ball.ico', 'icon-ball.svg', 'icon-ball-32.png', 'icon-ball-180.png', 'rules.js', 'slither', 'wallgo', 'wallgo1', 'owner', 'dg', 'freeplay.js', 'heavy13', 'play', 'pv.js', 'support', 'rallypick.js'];

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
      try { return json(res, 200, R.quickJoin((await readJson(req)).name, Accounts.userFromReq(req))); } catch (e) { return fail(e); }
    }
    const m = path.match(re);
    if (!m) return json(res, 404, { error: '없는 주소예요.' });
    const [, code, op] = m;
    try {
      if (req.method === 'GET' && code && op === 'events') return R.subscribe(code, url.searchParams.get('token'), res);
      if (req.method === 'GET' && !code && !op) return json(res, 200, { rooms: R.listRooms() });
      if (req.method !== 'POST') return json(res, 405, { error: 'POST만 돼요.' });
      const body = await readJson(req);
      const user = Accounts.userFromReq(req);
      if (!code && !op) return json(res, 200, R.createRoom(body.name, body.public, user));
      if (op === 'join') return json(res, 200, R.joinRoom(code, body.name, body.token, user));
      if (op === 'leave') { R.leaveRoom(code, body.token); return json(res, 200, { ok: true }); }
      if (op === 'act') { R.act(code, body.token, body); return json(res, 200, { ok: true }); }
      if (op === 'restart') { R.restart(code, body.token); return json(res, 200, { ok: true }); }
      return json(res, 404, { error: '없는 주소예요.' });
    } catch (e) { return fail(e); }
  };
}
const auctionApi = roomApi(Rooms, '/api/auction');

// 접속 기기를 짧게 (예: 'iPhone · Safari') — 대표 계정의 접속 기록용
function pageName(p) {
  if (p === '/' || p === '/index.html') return '홈';
  const rp = /^\/out\/rallypick\/([a-z-]+)$/.exec(p); // 야구 게임에서 랠리픽 배너를 누른 기록
  if (rp) { const spots = { home: '홈 야구 폴더', auction: '연봉 경매', 'auction-ai': '연봉 경매 AI', blackwhite: '흑과 백 AI', 'blackwhite-online': '흑과 백 온라인' }; return spots[rp[1]] ? '→ 랠리픽 이동 (' + spots[rp[1]] + ')' : null; }
  const map = [['/auction/ai', '연봉 경매 AI'], ['/auction', '연봉 경매'], ['/blackwhite/online', '흑과 백 온라인'], ['/blackwhite', '흑과 백 AI'], ['/slither', '슬리더링크'], ['/wallgo1', '벽바둑 Ⅰ'], ['/wallgo', '벽바둑 Ⅱ'], ['/heavy13', '무거운 13'], ['/play', '데스게임 공개 게임'], ['/history', '경기 기록'], ['/account', '로그인·계정'], ['/support', '고객 문의']];
  const m = map.find(([k]) => p === k || p.startsWith(k + '/'));
  return m ? m[1] : null;
}
function deviceOf(ua) {
  ua = String(ua || '');
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '기타';
  const br = /KAKAOTALK/i.test(ua) ? '카카오톡' : /NAVER/.test(ua) ? '네이버' : /SamsungBrowser/.test(ua) ? '삼성 인터넷' : /Edg\//.test(ua) ? 'Edge' : /Whale/.test(ua) ? 'Whale' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '브라우저';
  return os + ' · ' + br;
}
// 회원가입·로그인·경기 기록
const inqHits = new Map();
setInterval(() => inqHits.clear(), 60 * 60 * 1000).unref();
async function authApi(req, res, path, url) {
  const secure = req.headers['x-forwarded-proto'] === 'https';
  const send = (code, obj, cookie) => {
    const h = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
    if (cookie) h['set-cookie'] = cookie;
    res.writeHead(code, h); res.end(JSON.stringify(obj));
  };
  try {
    const user = Accounts.userFromReq(req);
    if (path === '/api/auth/me' && req.method === 'GET') {
      const u = await Accounts.refreshAdmin(user);
      Accounts.noteVisit(user, deviceOf(req.headers['user-agent']));
      return send(200, { user: u }, u && u.admin && !user.admin ? Accounts.sessionCookie(u, secure) : null);
    }
    if (path === '/api/owner/overview' && req.method === 'GET') {
      if (!(await Accounts.isOwner(user))) return send(404, { error: '없는 주소예요.' });
      return send(200, await Accounts.ownerOverview());
    }
    if (path === '/api/owner/inquiries' && req.method === 'GET') {
      if (!(await Accounts.isOwner(user))) return send(404, { error: '없는 주소예요.' });
      return send(200, { list: await Accounts.listInquiries() });
    }
    if (path === '/api/auth/profile' && req.method === 'GET') return send(200, await Accounts.getProfile(user));
    if (path === '/api/auth/nickname' && req.method === 'GET') return send(200, await Accounts.nicknameAvailable(url.searchParams.get('n')));
    if (path === '/api/history' && req.method === 'GET') {
      if (!user) return send(401, { error: '로그인해야 기록을 볼 수 있어요.' });
      const u = await Accounts.refreshAdmin(user);
      return send(200, { user: u, history: await Accounts.listHistory(user.id) });
    }
    if (req.method !== 'POST') return send(405, { error: 'POST만 돼요.' });
    const body = await readJson(req);
    body.device = deviceOf(req.headers['user-agent']);
    const im = /^\/api\/owner\/inquiries\/(\d+)$/.exec(path);
    if (im) { if (!(await Accounts.isOwner(user))) return send(404, { error: '없는 주소예요.' }); return send(200, await Accounts.setInquiryDone(im[1], body.done)); }
    if (path === '/api/inquiry') { // 고객 문의 남기기 (누구나). 같은 브라우저·주소에서 10분에 5개까지
      if (body.website) return send(200, { ok: true }); // 자동 입력 프로그램용 함정 칸
      const vid = (/(?:^|;\s*)vid=([A-Za-z0-9]{16,40})/.exec(req.headers.cookie || '') || [])[1] || null;
      const key = vid || Geo.clientIp(req), t = Date.now();
      const hits = (inqHits.get(key) || []).filter(x => t - x < 10 * 60 * 1000);
      if (hits.length >= 5) return send(429, { error: '잠시 뒤에 다시 남겨 주세요.' });
      hits.push(t); inqHits.set(key, hits);
      return send(200, await Accounts.createInquiry(user, body, vid));
    }
    if (path === '/api/pv' && req.method === 'POST') { // 방문자 집계 (화면에서 스크립트가 보냄). 브라우저 번호(vid)로 하루 한 번씩
      const ua = req.headers['user-agent'] || '';
      const page = pageName(String(body.path || ''));
      if (!page || /bot|crawl|spider|slurp|preview|scrap|facebookexternalhit|curl|wget|python|node-fetch|headless|lighthouse|uptime|monitor|pingdom/i.test(ua)) return send(200, { ok: true });
      let vid = (/(?:^|;\s*)vid=([A-Za-z0-9]{16,40})/.exec(req.headers.cookie || '') || [])[1], cookie;
      if (!vid) { vid = randomBytes(12).toString('hex'); cookie = `vid=${vid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${365 * 86400}${secure ? '; Secure' : ''}`; }
      Accounts.logPageView(vid, user, page, deviceOf(ua), Geo.regionOf(Geo.clientIp(req))).catch(e => console.error('pv log failed', e.message));
      return send(200, { ok: true }, cookie);
    }
    if (path === '/api/free') { // 비회원 무료 1판 확인
      if (user) return send(200, { ok: true, member: true });
      let vid = (/(?:^|;\s*)vid=([A-Za-z0-9]{16,40})/.exec(req.headers.cookie || '') || [])[1], cookie;
      if (!vid) { vid = randomBytes(12).toString('hex'); cookie = `vid=${vid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${365 * 86400}${secure ? '; Secure' : ''}`; }
      return send(200, await Accounts.freePlay(vid, String(body.game || ''), body.play), cookie);
    }
    if (path === '/api/auth/signup') { const u = await Accounts.signup(body); return send(200, { user: u }, Accounts.sessionCookie(u, secure)); }
    if (path === '/api/auth/login') { const u = await Accounts.login(body); return send(200, { user: u }, Accounts.sessionCookie(u, secure)); }
    if (path === '/api/auth/profile') { const u = await Accounts.updateProfile(user, body); return send(200, { user: u }, Accounts.sessionCookie(u, secure)); }
    if (path === '/api/auth/logout') return send(200, { ok: true }, Accounts.clearCookie(secure));
    if (path === '/api/history') {
      if (!user) return send(401, { error: '로그인하지 않아서 기록을 저장하지 않았어요.' });
      const u = await Accounts.refreshAdmin(user);
      await Accounts.addHistory(user.id, Accounts.cleanClientEntry(body, !!(u && u.admin)));
      return send(200, { ok: true });
    }
    return send(404, { error: '없는 주소예요.' });
  } catch (e) {
    if (e instanceof Accounts.AuthError) return send(e.status, { error: e.message, field: e.field });
    console.error(e);
    return send(500, { error: '서버 오류가 났어요. 잠시 뒤 다시 시도해 주세요.' });
  }
}
const bwApi = roomApi(BwRooms, '/api/bw');

// 벽바둑 온라인 메시지 중계 (누구나)
async function wallgoApi(req, res, path, url) {
  try {
    if (path === '/api/wallgo/new' && req.method === 'POST') return json(res, 200, { code: Relay.newCode() });
    const m = path.match(/^\/api\/wallgo\/([A-Za-z]{4})\/(events|send|check)$/);
    if (!m) return json(res, 404, { error: '없는 주소예요.' });
    const code = m[1].toUpperCase();
    if (m[2] === 'events' && req.method === 'GET') return Relay.subscribe(code, url.searchParams.get('cid'), res);
    if (m[2] === 'check' && req.method === 'POST') return json(res, 200, { exists: Relay.exists(code) });
    if (m[2] === 'send' && req.method === 'POST') { Relay.send(code, await readJson(req)); return json(res, 200, { ok: true }); }
    return json(res, 405, { error: 'POST만 돼요.' });
  } catch (e) {
    return e instanceof Relay.RelayError ? json(res, e.status, { error: e.message }) : (console.error(e), json(res, 500, { error: '서버 오류가 났어요.' }));
  }
}

// 슬리더링크 기록 대결 (로그인한 사람)
// 슬리더링크 도전장: 시작 시각은 서버가 기억했다가 정답을 확인할 때 시간을 잼 (서버가 다시 켜지면 진행 중이던 도전은 무효)
const chalStarts = new Map(); // token -> { code, uid, n, clues, startAt }
setInterval(() => { const t = Date.now(); for (const [k, v] of chalStarts) if (t - v.startAt > 6 * 3600 * 1000) chalStarts.delete(k); }, 30 * 60 * 1000).unref();
async function chalApi(req, res, path, url, user) {
  if (path === '/api/slither/chal/mine' && req.method === 'GET') return json(res, 200, { list: await Accounts.myChallenges(user) });
  const m = path.match(/^\/api\/slither\/chal(?:\/([A-Za-z0-9]{5}))?(?:\/(start|finish|giveup))?$/);
  if (!m) return json(res, 404, { error: '없는 주소예요.' });
  const code = m[1] && m[1].toUpperCase(), op = m[2];
  if (!code && req.method === 'POST') return json(res, 200, await Accounts.createChallenge(user, await readJson(req)));
  if (code && !op && req.method === 'GET') return json(res, 200, await Accounts.challengeBoard(code, user));
  if (req.method !== 'POST' || !code) return json(res, 405, { error: '잘못된 요청이에요.' });
  const body = await readJson(req);
  if (op === 'start') {
    const c = await Accounts.getChallenge(code);
    const token = randomBytes(12).toString('hex');
    chalStarts.set(token, { code: c.code, uid: user ? user.id : null, n: c.n, clues: c.clues, startAt: Date.now() });
    return json(res, 200, { token, n: c.n, clues: c.clues });
  }
  const s = chalStarts.get(String(body.token || ''));
  if (!s || s.code !== code) return json(res, 400, { error: '시작 기록이 없어요. 처음부터 다시 도전해 주세요.' });
  let status, time = null;
  if (op === 'finish') {
    const lines = Array.from(String(body.lines || ''), ch => ch === '1');
    if (!SlitherRooms.isSolved(s.n, Array.from(s.clues, ch => ch === '.' ? -1 : +ch), lines)) return json(res, 400, { error: '아직 정답이 아니에요.' });
    status = 'solved'; time = Date.now() - s.startAt;
  } else status = 'gaveup';
  chalStarts.delete(String(body.token));
  const recorded = user ? await Accounts.recordChallenge(user, code, status, time) : false;
  const board = await Accounts.challengeBoard(code, user, true);
  return json(res, 200, { status, time, recorded, board });
}
async function slitherApi(req, res, path, url) {
  let user = null;
  try { user = Accounts.userFromReq(req); } catch (e) { console.error(e); }
  if (path.startsWith('/api/slither/chal')) {
    try { return await chalApi(req, res, path, url, user); }
    catch (e) { if (e instanceof Accounts.AuthError) return json(res, e.status, { error: e.message }); console.error(e); return json(res, 500, { error: '서버 오류가 났어요.' }); }
  }
  if (!user) return json(res, 401, { error: '로그인하면 기록 대결을 할 수 있어요.' });
  const m = path.match(/^\/api\/slither\/rooms(?:\/([A-Za-z0-9]{4}))?(?:\/(join|act|events|leave))?$/);
  if (!m) return json(res, 404, { error: '없는 주소예요.' });
  const [, code, op] = m;
  try {
    if (req.method === 'GET' && code && op === 'events') return SlitherRooms.subscribe(code, url.searchParams.get('token'), res);
    if (req.method !== 'POST') return json(res, 405, { error: 'POST만 돼요.' });
    const body = await readJson(req);
    if (!code && !op) return json(res, 200, SlitherRooms.createRoom(user));
    if (op === 'join') return json(res, 200, SlitherRooms.joinRoom(code, body.token, user));
    if (op === 'leave') { SlitherRooms.leaveRoom(code, body.token); return json(res, 200, { ok: true }); }
    if (op === 'act') { SlitherRooms.act(code, body.token, body); return json(res, 200, { ok: true }); }
    return json(res, 404, { error: '없는 주소예요.' });
  } catch (e) {
    return e instanceof SlitherRooms.GameError ? json(res, 400, { error: e.message }) : (console.error(e), json(res, 500, { error: '서버 오류가 났어요.' }));
  }
}

// 무거운 13 온라인 방. 로그인하면 닉네임으로, 아니면 입력한 이름으로 참가
async function h13Api(req, res, path, url) {
  let user = null;
  try { user = Accounts.userFromReq(req); } catch (e) { console.error(e); }
  const m = path.match(/^\/api\/h13\/rooms(?:\/([A-Za-z0-9]{4}))?(?:\/(join|act|events|leave))?$/);
  if (!m) return json(res, 404, { error: '없는 주소예요.' });
  const [, code, op] = m;
  try {
    if (req.method === 'GET' && code && op === 'events') return H13.subscribe(code, url.searchParams.get('token'), res);
    if (req.method !== 'POST') return json(res, 405, { error: 'POST만 돼요.' });
    const body = await readJson(req);
    const who = user || { id: null, nickname: String(body.name || '').trim().slice(0, 10) || '손님' };
    if (!code && !op) return json(res, 200, H13.createRoom(who, { solo: !!body.solo }));
    if (op === 'join') return json(res, 200, H13.joinRoom(code, body.token, who));
    if (op === 'leave') { H13.leaveRoom(code, body.token); return json(res, 200, { ok: true }); }
    if (op === 'act') { H13.act(code, body.token, body); return json(res, 200, { ok: true }); }
    return json(res, 404, { error: '없는 주소예요.' });
  } catch (e) {
    return e instanceof H13.GameError ? json(res, 400, { error: e.message }) : (console.error(e), json(res, 500, { error: '서버 오류가 났어요.' }));
  }
}

// 1:1 온라인 대결 (그라데이션 · 카드 장기 · 컬러 링크 · 수식 신호등)
async function duelApi(req, res, path, url) {
  let user = null;
  try { user = Accounts.userFromReq(req); } catch (e) { console.error(e); }
  const m = path.match(/^\/api\/duel(?:\/([A-Za-z0-9]{4}))?(?:\/(join|act|events))?$/);
  if (!m) return json(res, 404, { error: '없는 주소예요.' });
  const [, code, op] = m;
  try {
    if (req.method === 'GET' && code && op === 'events') return Duel.subscribe(code, url.searchParams.get('token'), res);
    if (req.method !== 'POST') return json(res, 405, { error: 'POST만 돼요.' });
    const body = await readJson(req);
    const who = user || { id: null, nickname: String(body.name || '').trim().slice(0, 10) || '손님' };
    if (!code && !op) return json(res, 200, Duel.createRoom(String(body.game || ''), who, body.opts || {}));
    if (op === 'join') return json(res, 200, Duel.joinRoom(code, body.game, body.token, who));
    if (op === 'act') { Duel.act(code, body.token, body); return json(res, 200, { ok: true }); }
    return json(res, 404, { error: '없는 주소예요.' });
  } catch (e) {
    return e instanceof Duel.GameError ? json(res, 400, { error: e.message }) : (console.error(e), json(res, 500, { error: '서버 오류가 났어요.' }));
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://x');
  const path = url.pathname;
  if (path === '/api/auction/ai' && req.method === 'POST') {
    try { const b = await readJson(req); return json(res, 200, Rooms.createAiRoom(b.name, b.level, Accounts.userFromReq(req))); }
    catch (e) { return json(res, e instanceof Rooms.GameError ? 400 : 500, { error: e.message }); }
  }
  if (path.startsWith('/api/auth/') || path === '/api/history' || path === '/api/free' || path === '/api/pv' || path === '/api/inquiry' || path.startsWith('/api/owner/')) return authApi(req, res, path, url);
  if (path.startsWith('/api/auction/')) return auctionApi(req, res, path, url);
  if (path.startsWith('/api/bw/')) return bwApi(req, res, path, url);
  if (path.startsWith('/api/slither/')) return slitherApi(req, res, path, url);
  if (path.startsWith('/api/h13/')) return h13Api(req, res, path, url);
  if (path === '/api/duel' || path.startsWith('/api/duel/')) return duelApi(req, res, path, url);
  if (path.startsWith('/api/wallgo/')) return wallgoApi(req, res, path, url);
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
  // 대표 계정 전용 관리 페이지
  if (path === '/owner' || path.startsWith('/owner/')) {
    let ok = false;
    try { ok = await Accounts.isOwner(Accounts.userFromReq(req)); } catch (e) { console.error(e); }
    if (!ok) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }); res.end('페이지를 찾을 수 없어요.'); return; }
    if (path === '/owner') { res.writeHead(301, { location: '/owner/' }); res.end(); return; }
  }
  // 새로 추가한 게임(바그찰·데스게임)은 공개 전이라 대표·관리자 계정만 열림. 다른 사람에게는 없는 페이지
  if (path === '/dg' || path.startsWith('/dg/')) {
    let ok = false;
    try { const u = await Accounts.refreshAdmin(Accounts.userFromReq(req)); ok = !!(u && (u.admin || u.owner)); } catch (e) { console.error(e); }
    if (!ok) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }); res.end('페이지를 찾을 수 없어요.'); return; }
    if (path === '/dg') { res.writeHead(301, { location: '/dg/' }); res.end(); return; }
  }
  const adminPage = path === '/owner/' || path.startsWith('/owner/') || path.startsWith('/dg/');
  if (['/slither', '/wallgo', '/wallgo1', '/blackwhite', '/auction/online', '/blackwhite/online', '/auction/ai', '/history', '/account'].includes(path)) {
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
  const ext = extname(file).toLowerCase();
  // 그림·글꼴은 하루 보관, 화면·스크립트(html/js/css)는 매번 바뀌었는지 확인 (게임을 고치면 바로 반영되게)
  const etag = '"' + createHash('sha1').update(body).digest('base64').slice(0, 16) + '"';
  const headers = {
    'content-type': TYPES[ext] || 'application/octet-stream',
    'cache-control': adminPage ? 'private, no-store' : ['.html', '.js', '.css', '.json'].includes(ext) ? 'no-cache' : 'public, max-age=86400',
    etag
  };
  if (!adminPage && req.headers['if-none-match'] === etag) { res.writeHead(304, headers); res.end(); return; }
  res.writeHead(200, headers);
  res.end(body);
}).listen(PORT, HOST, () => {
  console.log(`1x1 MATCH running at http://${HOST}:${PORT}`);
});
