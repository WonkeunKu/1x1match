// 1:1 온라인 대결 방 (그라데이션 · 카드 장기 · 컬러 링크 · 수식 신호등)
// 숨긴 정보가 있는 게임이라 판정과 상태는 모두 서버가 들고, 각 사람에게는 자기가 봐도 되는 것만 보냄.
// 게임 규칙 함수는 브라우저용 게임 파일(dg/games 또는 play)을 그대로 불러 씀.
import { randomBytes, randomInt } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

class GameError extends Error {}
const fail = m => { throw new GameError(m); };
const now = () => Date.now();
const tokenNew = () => randomBytes(16).toString('hex');
const rooms = new Map();

function loadEngine(file) {
  for (const dir of ['../play/', '../dg/games/']) {
    const u = new URL(dir + file, import.meta.url);
    if (existsSync(u)) { const m = { exports: {} }; new Function('module', readFileSync(u, 'utf8'))(m); return m.exports; }
  }
  throw new Error('engine not found ' + file);
}
const GR = loadEngine('gradation.js'), CJ = loadEngine('cardjanggi.js'), CL = loadEngine('colorlink.js'), SG = loadEngine('signal.js');

/* ---------------- 게임별 규칙: 각 게임 파일의 DUEL(init/act/view)을 그대로 씀 ---------------- */
const wrap = D => ({
  init: (prev, opts) => D.init(prev, opts),
  act(st, seat, a) { try { D.act(st, seat, a); } catch (e) { if (e && e.duel) throw new GameError(e.message); throw e; } },
  view: (st, seat) => D.view(st, seat),
});
const GAMES = { gradation: wrap(GR.DUEL), cardjanggi: wrap(CJ.DUEL), colorlink: wrap(CL.DUEL), signal: wrap(SG.DUEL) };

/* ---------------- 방 ---------------- */
function newCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c; do { c = Array.from({ length: 4 }, () => A[randomInt(A.length)]).join(''); } while (rooms.has(c)); return c; }
function getRoom(code) { const r = rooms.get(String(code || '').toUpperCase()); if (!r) fail('방을 찾을 수 없어요. 방 코드를 확인하세요.'); return r; }
const seatOf = (room, tok) => room.seats.findIndex(x => x && x.token === tok);

export function createRoom(game, user, opts = {}) {
  if (!GAMES[game]) fail('없는 게임이에요.');
  const room = { code: newCode(), game, opts: { n: opts.n }, seats: [null, null], st: null, clients: new Set(), touched: now(), again: [false, false] };
  rooms.set(room.code, room);
  const token = tokenNew(); room.seats[0] = { token, uid: user.id, name: String(user.nickname || '플레이어').slice(0, 10) };
  return { code: room.code, token, seat: 0 };
}
export function joinRoom(code, game, tok, user) {
  const room = getRoom(code);
  if (game && room.game !== game) fail('다른 게임의 방이에요.');
  const k = seatOf(room, tok); if (k >= 0) return { code: room.code, token: tok, seat: k };
  if (user.id != null) { const j = room.seats.findIndex(x => x && x.uid === user.id); if (j >= 0) return { code: room.code, token: room.seats[j].token, seat: j }; }
  if (room.seats[1]) fail('이미 두 사람이 들어간 방이에요.');
  const token = tokenNew(); room.seats[1] = { token, uid: user.id, name: String(user.nickname || '플레이어').slice(0, 10) };
  room.st = GAMES[room.game].init(null, room.opts); bump(room);
  return { code: room.code, token, seat: 1 };
}
export function act(code, tok, body) {
  const room = getRoom(code), seat = seatOf(room, tok); if (seat < 0) fail('이 방의 참가자가 아니에요.');
  if (!room.st) fail('상대를 기다리는 중이에요.');
  if (body.type === 'again') {
    if (room.st.phase !== 'over') fail('아직 게임이 끝나지 않았어요.');
    room.again[seat] = true;
    if (room.again[0] && room.again[1]) { room.st = GAMES[room.game].init(room.st, room.opts); room.again = [false, false]; }
    bump(room); return;
  }
  GAMES[room.game].act(room.st, seat, body);
  if (room.st.phase === 'over' && !room.recorded) { room.recorded = true; finishHook && finishHook(room); }
  if (room.st.phase !== 'over') room.recorded = false;
  bump(room);
}
let finishHook = null;
export function setFinishHook(fn) { finishHook = fn; }
function viewFor(room, tok) {
  const seat = seatOf(room, tok); const o = 1 - seat;
  const online = k => [...room.clients].some(c => seatOf(room, c.token) === k);
  return { code: room.code, game: room.game, seat, me: room.seats[seat] && room.seats[seat].name, opp: room.seats[o] ? room.seats[o].name : null, oppOnline: online(o),
    again: [room.again[seat], room.again[o]], st: room.st ? GAMES[room.game].view(room.st, seat) : null };
}
function bump(room) { room.touched = now(); for (const c of room.clients) { try { c.res.write(`data: ${JSON.stringify(viewFor(room, c.token))}\n\n`); } catch {} } }
export function subscribe(code, tok, res) {
  const room = getRoom(code); if (seatOf(room, tok) < 0) fail('이 방의 참가자가 아니에요.');
  res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
  res.write('retry: 2000\n\n');
  const client = { res, token: tok }; room.clients.add(client); bump(room);
  const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 20000);
  res.on('close', () => { clearInterval(ping); room.clients.delete(client); bump(room); });
}
export function results(room) { // 기록용: 자리별 결과
  const st = room.st, w = st.winner;
  return room.seats.map((s, k) => ({ uid: s && s.uid, name: s && s.name, result: w === 2 || w < 0 ? 'draw' : w === k ? 'win' : 'lose', opp: room.seats[1 - k] && room.seats[1 - k].name }));
}
setInterval(() => { const t = now(); for (const r of rooms.values()) if (t - r.touched > 6 * 3600e3 || (!r.clients.size && t - r.touched > 30 * 60e3)) { for (const c of r.clients) { try { c.res.end(); } catch {} } rooms.delete(r.code); } }, 5 * 60e3).unref();
export { GameError, GAMES };
