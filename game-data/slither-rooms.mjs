// 슬리더링크 기록 대결 방 (관리자 전용). 방장이 문제를 만들어 올리면 모두 같은 문제를 동시에 풀고,
// 서버가 시작 시각부터 정답 제출까지의 시간을 재서 순위를 매긴다. 정답 여부도 서버가 다시 확인한다.
import { randomBytes, randomInt } from 'node:crypto';

const MAX_PLAYERS = 8;
const COUNTDOWN_MS = 3500;
const ROOM_TTL_MS = 6 * 60 * 60 * 1000;
const SIZES = [5, 7, 10];
const rooms = new Map();
const now = () => Date.now();

class GameError extends Error {}
const fail = m => { throw new GameError(m); };
const token = () => randomBytes(16).toString('hex');
function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c;
  do { c = Array.from({ length: 4 }, () => A[randomInt(A.length)]).join(''); } while (rooms.has(c));
  return c;
}
function getRoom(code) {
  const r = rooms.get(String(code || '').toUpperCase());
  if (!r) fail('방을 찾을 수 없어요. 방 코드를 확인하세요.');
  return r;
}
const seatOf = (room, tok) => room.players.findIndex(p => p.token === tok);
function me(room, tok) {
  const k = seatOf(room, tok);
  if (k < 0) fail('이 방의 참가자가 아니에요.');
  return k;
}

/* ---------- 정답 확인 (화면과 같은 규칙) ---------- */
function makeGeom(n) {
  const R = n, C = n, H = (R + 1) * C, E = H + R * (C + 1);
  const hId = (r, c) => r * C + c, vId = (r, c) => H + r * (C + 1) + c;
  const cellEdges = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) cellEdges.push([hId(r, c), hId(r + 1, c), vId(r, c), vId(r, c + 1)]);
  const vtxEdges = [];
  for (let r = 0; r <= R; r++) for (let c = 0; c <= C; c++) {
    const a = [];
    if (c > 0) a.push(hId(r, c - 1)); if (c < C) a.push(hId(r, c));
    if (r > 0) a.push(vId(r - 1, c)); if (r < R) a.push(vId(r, c));
    vtxEdges.push(a);
  }
  const edgeVtx = new Array(E);
  for (let r = 0; r <= R; r++) for (let c = 0; c < C; c++) edgeVtx[hId(r, c)] = [r * (C + 1) + c, r * (C + 1) + c + 1];
  for (let r = 0; r < R; r++) for (let c = 0; c <= C; c++) edgeVtx[vId(r, c)] = [r * (C + 1) + c, (r + 1) * (C + 1) + c];
  return { E, cellEdges, vtxEdges, edgeVtx };
}
function isSolved(n, clues, lines) {
  const G = makeGeom(n);
  if (lines.length !== G.E) return false;
  for (let i = 0; i < clues.length; i++) {
    if (clues[i] < 0) continue;
    let k = 0; for (const e of G.cellEdges[i]) if (lines[e]) k++;
    if (k !== clues[i]) return false;
  }
  let total = 0, start = -1;
  for (let e = 0; e < G.E; e++) if (lines[e]) { total++; if (start < 0) start = e; }
  if (!total) return false;
  for (const es of G.vtxEdges) { let d = 0; for (const e of es) if (lines[e]) d++; if (d !== 0 && d !== 2) return false; }
  const seen = new Uint8Array(G.E), st = [start]; seen[start] = 1; let cnt = 0;
  while (st.length) { const e = st.pop(); cnt++; for (const v of G.edgeVtx[e]) for (const f of G.vtxEdges[v]) if (lines[f] && !seen[f]) { seen[f] = 1; st.push(f); } }
  return cnt === total;
}

/* ---------- 방 ---------- */
export function createRoom(user) {
  const room = { code: newCode(), players: [], host: null, size: 7, round: null, created: now(), touched: now(), clients: new Set() };
  rooms.set(room.code, room);
  return { code: room.code, token: addPlayer(room, user) };
}
function addPlayer(room, user) {
  const old = room.players.find(p => p.uid === user.id);
  if (old) return old.token;
  if (room.players.length >= MAX_PLAYERS) fail(`방이 가득 찼어요 (${MAX_PLAYERS}명).`);
  const t = token();
  room.players.push({ token: t, uid: user.id, name: user.nickname, status: 'lobby', time: null, round: 0 });
  if (!room.host) room.host = t;
  return t;
}
export function joinRoom(code, tok, user) {
  const room = getRoom(code);
  if (tok && seatOf(room, tok) >= 0) return { code: room.code, token: tok };
  const t = addPlayer(room, user);
  bump(room);
  return { code: room.code, token: t };
}
export function leaveRoom(code, tok) {
  const room = rooms.get(String(code || '').toUpperCase());
  if (!room) return;
  const k = seatOf(room, tok);
  if (k < 0) return;
  const leaving = room.players[k];
  if (leaving.status === 'playing') leaving.status = 'gaveup';
  if (room.round && room.players.filter(q => q.round === room.round.no).every(q => q.status !== 'playing')) recordRound(room);
  room.players.splice(k, 1);
  for (const c of room.clients) if (c.token === tok) { try { c.res.write(`data: ${JSON.stringify({ left: true })}\n\n`); c.res.end(); } catch {} }
  if (!room.players.length) { closeRoom(room); return; }
  if (room.host === tok) room.host = room.players[0].token;
  bump(room);
}
function closeRoom(room) {
  for (const c of room.clients) { try { c.res.end(); } catch {} }
  rooms.delete(room.code);
}

export function act(code, tok, body) {
  const room = getRoom(code);
  const k = me(room, tok);
  const p = room.players[k];
  const isHost = room.host === tok;
  const type = body && body.type;
  if (type === 'diff') { // 문제 난이도(0~3): 모두 같은 문제라 같은 값. 기록에 같이 남김
    const lv = Number(body.lv);
    if (room.round && p.round === room.round.no && [0, 1, 2, 3].includes(lv) && room.round.diff == null) room.round.diff = lv;
    return;
  }
  if (type === 'size') {
    if (!isHost) fail('방장만 판 크기를 바꿀 수 있어요.');
    const n = Number(body.n);
    if (!SIZES.includes(n)) fail('판 크기가 올바르지 않아요.');
    room.size = n;
  } else if (type === 'start') {
    if (!isHost) fail('방장만 시작할 수 있어요.');
    const n = Number(body.n), c = String(body.clues || '');
    if (!SIZES.includes(n) || c.length !== n * n || !/^[.0-3]+$/.test(c)) fail('문제가 올바르지 않아요.');
    room.size = n;
    recordRound(room); // 이전 판을 아직 기록하지 않았으면(누가 끝까지 안 풀었으면) 지금까지 결과로 기록
    room.round = { no: (room.round ? room.round.no : 0) + 1, n, clues: c, startAt: now() + COUNTDOWN_MS };
    for (const q of room.players) { q.status = 'playing'; q.time = null; q.round = room.round.no; }
  } else if (type === 'finish') {
    const r = room.round;
    if (!r || p.round !== r.no || p.status !== 'playing') fail('지금은 제출할 수 없어요.');
    const lines = Array.from(String(body.lines || ''), ch => ch === '1');
    const clues = Array.from(r.clues, ch => ch === '.' ? -1 : +ch);
    if (!isSolved(r.n, clues, lines)) fail('아직 정답이 아니에요.');
    p.status = 'done';
    p.time = Math.max(0, now() - r.startAt);
  } else if (type === 'giveup') {
    const r = room.round;
    if (!r || p.round !== r.no || p.status !== 'playing') fail('지금은 포기할 수 없어요.');
    p.status = 'gaveup'; p.time = null;
  } else if (type === 'lobby') {
    if (p.status === 'playing') p.status = 'gaveup';
    p.inLobby = true;
  } else fail('알 수 없는 동작이에요.');
  if (type !== 'lobby') p.inLobby = false;
  if (room.round && room.players.filter(q => q.round === room.round.no).every(q => q.status !== 'playing')) recordRound(room);
  bump(room);
}

/* ---------- 실시간 화면 ---------- */
function viewFor(room, tok) {
  const r = room.round;
  return {
    code: room.code,
    size: room.size,
    host: room.host === tok,
    serverNow: now(),
    round: r ? { no: r.no, n: r.n, clues: r.clues, startAt: r.startAt } : null,
    players: room.players.map(q => ({
      name: q.name, me: q.token === tok, host: q.token === room.host,
      status: r && q.round === r.no ? q.status : 'lobby', time: q.time,
      online: [...room.clients].some(c => c.token === q.token)
    }))
  };
}
function bump(room) {
  room.touched = now();
  for (const c of room.clients) { try { c.res.write(`data: ${JSON.stringify(viewFor(room, c.token))}\n\n`); } catch {} }
}
export function subscribe(code, tok, res) {
  const room = getRoom(code);
  me(room, tok);
  res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
  res.write('retry: 2000\n\n');
  const client = { res, token: tok };
  room.clients.add(client);
  bump(room);
  const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 20000);
  res.on('close', () => { clearInterval(ping); room.clients.delete(client); bump(room); });
}

// 오래 비어 있는 방 정리
setInterval(() => {
  const t = now();
  for (const room of rooms.values()) {
    if (t - room.touched > ROOM_TTL_MS || (!room.clients.size && t - room.touched > 30 * 60 * 1000)) closeRoom(room);
  }
}, 5 * 60 * 1000).unref();

/* ---------- 로그인한 참가자의 경기 기록 ---------- */
let finishHook = null;
export function setFinishHook(fn) { finishHook = fn; }
function recordRound(room) {
  const r = room.round;
  if (!r || r.recorded) return;
  const inRound = room.players.filter(q => q.round === r.no);
  if (!inRound.length) return;
  r.recorded = true;
  const done = inRound.filter(q => q.status === 'done').sort((a, b) => a.time - b.time);
  const list = inRound.map(q => ({ name: q.name, time: q.status === 'done' ? q.time : null, status: q.status === 'done' ? 'done' : 'gaveup' }));
  if (!finishHook) return;
  for (const q of inRound) {
    if (!q.uid) continue;
    const rank = q.status === 'done' ? done.indexOf(q) + 1 : null;
    const entry = { game: 'slither', mode: 'battle', level: null, size: r.n, diff: r.diff == null ? null : r.diff, result: q.status === 'done' ? 'solved' : 'gaveup', time: q.status === 'done' ? q.time : null, rank, total: inRound.length,
      players: list.map(x => Object.assign({}, x, { me: x.name === q.name })) };
    try { finishHook(q.uid, entry); } catch (e) { console.error(e); }
  }
}

export { GameError };
