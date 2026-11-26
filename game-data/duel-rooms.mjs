// 온라인 대결 방 — 1:1(그라데이션 · 카드 장기 · 컬러 링크 · 수식 신호등 · 포인트 오목)과 여럿(HIT, STAY 2~5인, KBO 주식시장 2~4인)
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
const GR = loadEngine('gradation.js'), CJ = loadEngine('cardjanggi.js'), CL = loadEngine('colorlink.js'), SG = loadEngine('signal.js'), PO = loadEngine('pointomok.js'), HS = loadEngine('hitstay.js'), SK = loadEngine('stock.js');

/* ---------------- 게임별 규칙: 각 게임 파일의 DUEL(init/act/view)을 그대로 씀 ---------------- */
const wrap = D => ({
  init: (prev, opts) => D.init(prev, opts),
  act(st, seat, a) { try { D.act(st, seat, a); } catch (e) { if (e && e.duel) throw new GameError(e.message); throw e; } },
  view: (st, seat) => D.view(st, seat),
  tick: D.tick ? (st, t) => D.tick(st, t) : null,
});
const GAMES = { gradation: wrap(GR.DUEL), cardjanggi: wrap(CJ.DUEL), colorlink: { ...wrap(CL.DUEL), settings: (o, b) => { if ([6, 7, 8].includes(Number(b.n))) o.n = Number(b.n); else if (CL.SHAPES[b.n]) o.n = b.n; } }, signal: wrap(SG.DUEL), pointomok: wrap(PO.DUEL),
  // 여럿이 하는 게임: 자리 수가 설정에 따라 달라지고, 빈자리는 방장이 시작할 때 AI로 채움
  stock: { ...wrap(SK.MULTI), multi: true, extraOpts: o => ({ kind: o.kind === 'player' ? 'player' : 'team' }), settings: (o, b) => { if (b.kind === 'team' || b.kind === 'player') o.kind = b.kind; }, seats: o => SK.MULTI.seats(o), init: (prev, opts, seats) => SK.MULTI.init(prev, opts, seats), tick: (st, t) => SK.MULTI.tick(st, t) },
  hitstay: { ...wrap(HS.MULTI), multi: true, seats: o => HS.MULTI.seats(o), init: (prev, opts, seats) => HS.MULTI.init(prev, opts, seats), tick: (st, t) => HS.MULTI.tick(st, t) } };

/* ---------------- 방 ---------------- */
function newCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c; do { c = Array.from({ length: 4 }, () => A[randomInt(A.length)]).join(''); } while (rooms.has(c)); return c; }
function getRoom(code) { const r = rooms.get(String(code || '').toUpperCase()); if (!r) fail('방을 찾을 수 없어요. 방 코드를 확인하세요.'); return r; }
const seatOf = (room, tok) => room.seats.findIndex(x => x && x.token === tok);

export function createRoom(game, user, opts = {}) {
  if (!GAMES[game]) fail('없는 게임이에요.');
  const G = GAMES[game], n = G.multi ? G.seats(opts) : 2;
  const room = { code: newCode(), game, multi: !!G.multi, opts: G.multi ? { n, chips: [10, 20, 30, 50].includes(Number(opts.chips)) ? Number(opts.chips) : 30, lv: [0, 1, 2].includes(Number(opts.lv)) ? Number(opts.lv) : 1, ...(G.extraOpts ? G.extraOpts(opts) : {}) } : { n: opts.n }, seats: Array(n).fill(null), st: null, clients: new Set(), touched: now(), again: Array(n).fill(false) };
  rooms.set(room.code, room);
  const token = tokenNew(); room.seats[0] = { token, uid: user.id, name: String(user.nickname || '플레이어').slice(0, 10) };
  return { code: room.code, token, seat: 0 };
}
export function joinRoom(code, game, tok, user) {
  const room = getRoom(code);
  if (game && room.game !== game) fail('다른 게임의 방이에요.');
  const k = seatOf(room, tok); if (k >= 0) return { code: room.code, token: tok, seat: k };
  if (user.id != null) { const j = room.seats.findIndex(x => x && x.uid === user.id); if (j >= 0) return { code: room.code, token: room.seats[j].token, seat: j }; }
  const free = room.st ? -1 : room.seats.findIndex(x => !x);
  if (free < 0) fail(room.multi ? '이미 시작했거나 자리가 꽉 찬 방이에요.' : '이미 두 사람이 들어간 방이에요.');
  const token = tokenNew(); room.seats[free] = { token, uid: user.id, name: uniqName(room, String(user.nickname || '플레이어').slice(0, 10)) };
  bump(room); // 모든 방은 대기실에서 방장이 '게임 시작'을 눌러야 시작 (무거운13과 같은 흐름)
  return { code: room.code, token, seat: free };
}
function uniqName(room, nm) { let x = nm, k = 2; while (room.seats.some(s => s && s.name === x)) x = nm + k++; return x; }
function startGame(room, prev = null) {
  if (room.multi) { let b = 1; room.seats = room.seats.map(s => s || { bot: true, name: `AI ${b++}` }); }
  room.st = room.multi ? GAMES[room.game].init(prev, room.opts, room.seats) : GAMES[room.game].init(prev, room.opts);
  bump(room);
}
export function act(code, tok, body) {
  const room = getRoom(code), seat = seatOf(room, tok); if (seat < 0) fail('이 방의 참가자가 아니에요.');
  if (!room.st) {
    if (body.type === 'start') { if (seat !== 0) fail('방장만 시작할 수 있어요.'); if (!room.multi && !room.seats.every(Boolean)) fail('상대가 들어와야 시작할 수 있어요.'); startGame(room); return; } // 여럿이 하는 방의 빈자리는 AI가 채움
    if (body.type === 'settings') {
      if (seat !== 0) fail('방장만 설정을 바꿀 수 있어요.');
      const G = GAMES[room.game];
      if (room.multi) {
        if (body.n != null) { const n = G.seats({ n: body.n }), people = room.seats.filter(Boolean); if (n < people.length) fail(`이미 ${people.length}명이 들어와 있어요.`); room.seats = [...people, ...Array(n - people.length).fill(null)]; room.again = Array(n).fill(false); room.opts.n = n; }
        if ([10, 20, 30, 50].includes(Number(body.chips))) room.opts.chips = Number(body.chips);
        if ([0, 1, 2].includes(Number(body.lv))) room.opts.lv = Number(body.lv);
      }
      if (G.settings) G.settings(room.opts, body);
      bump(room); return;
    }
    if (body.type === 'leave') { if (seat === 0) fail('방장은 나갈 수 없어요.'); room.seats[seat] = null; room.seats = [...room.seats.filter(Boolean), ...room.seats.filter(x => !x)]; bump(room); return; }
    fail('상대를 기다리는 중이에요.');
  }
  if (body.type === 'again') {
    if (room.st.phase !== 'over') fail('아직 게임이 끝나지 않았어요.');
    room.again[seat] = true;
    if (room.seats.every((s, k) => !s || s.bot || room.again[k])) { room.again = room.again.map(() => false); startGame(room, room.st); return; }
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
  const base = { code: room.code, game: room.game, seat, me: room.seats[seat] && room.seats[seat].name, st: room.st ? GAMES[room.game].view(room.st, seat) : null };
  if (room.multi) return { ...base, multi: true, n: room.seats.length, opts: room.opts, players: room.seats.map((s, k) => s ? { name: s.name, bot: !!s.bot, online: !!s.bot || online(k), again: room.again[k] } : null) };
  return { ...base, opts: room.opts, opp: room.seats[o] ? room.seats[o].name : null, oppOnline: online(o), again: [room.again[seat], room.again[o]] };
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
// 시간이 흐르며 진행되는 게임(포인트 오목 시간제한, HIT STAY의 AI·단계 넘김): 0.25초마다 확인
setInterval(() => { const t = now(); for (const r of rooms.values()) { const G = GAMES[r.game]; if (!G.tick || !r.st || r.st.phase === 'over') continue;
  try { if (G.tick(r.st, t)) { if (r.st.phase === 'over' && !r.recorded) { r.recorded = true; finishHook && finishHook(r); } bump(r); } } catch (e) { console.error('tick', e); } } }, 250).unref();
export { GameError, GAMES };
