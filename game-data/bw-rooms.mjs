// 9이닝 흑과 백 온라인 1:1 방. 홈런 수는 서버에만 있고, 경기 중에는 카드의 흑·백과 이닝 승패만 내려보낸다.
import { randomBytes, randomInt } from 'node:crypto';
import { POOL } from './bw-cards.mjs';

const SEATS = 2;
const WIN_AT = 5;
const TURN_MS = Number(process.env.BW_TURN_MS) || 30000;        // 공개 방: 카드 내기 30초
const LOBBY_GONE_MS = Number(process.env.BW_LOBBY_GONE_MS) || 45000;
const ROOM_TTL_MS = 6 * 60 * 60 * 1000;
const C = id => POOL[id];
const rooms = new Map();
const now = () => Date.now();

class GameError extends Error {}
const fail = m => { throw new GameError(m); };
const cleanName = n => String(n || '').trim().slice(0, 10);
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
const isOnline = (room, k) => [...room.clients].some(c => c.seat === k);

/* ---------- lobby ---------- */
export function createRoom(name, isPublic, user) {
  name = user ? user.nickname : (cleanName(name) || 'Player1');
  const room = { code: newCode(), phase: 'lobby', players: [], host: 0, public: !!isPublic, created: now(), touched: now(), clients: new Set(), deadline: null, actorKey: '' };
  rooms.set(room.code, room);
  return { code: room.code, token: addPlayer(room, name, user) };
}
function addPlayer(room, name, user) {
  if (room.players.length >= SEATS) fail('방이 가득 찼어요 (2명).');
  if (room.phase !== 'lobby') fail('이미 경기가 시작된 방이에요.');
  if (room.players.some(p => p.name === name)) name += room.players.length + 1;
  const t = token();
  room.players.push({ token: t, name, uid: user ? user.id : null, seenAt: now() });
  return t;
}
export function joinRoom(code, name, tok, user) {
  const room = getRoom(code);
  if (tok && seatOf(room, tok) >= 0) return { code: room.code, token: tok };
  name = user ? user.nickname : cleanName(name);
  if (!name) fail('이름을 입력하세요.');
  const t = addPlayer(room, name, user);
  bump(room, `${room.players[room.players.length - 1].name}님이 들어왔어요.`);
  return { code: room.code, token: t };
}
export function listRooms() {
  return [...rooms.values()]
    .filter(r => r.public && r.phase === 'lobby' && r.players.length === 1)
    .sort((a, b) => a.created - b.created).slice(0, 30)
    .map(r => ({ code: r.code, host: r.players[0].name, count: r.players.length }));
}
export function quickJoin(name, user) {
  name = user ? user.nickname : cleanName(name);
  if (!name) fail('이름을 입력하세요.');
  const open = listRooms()[0];
  return open ? joinRoom(open.code, name, null, user) : createRoom(name, true, user);
}
function removeSeat(room, k, why) {
  const [gone] = room.players.splice(k, 1);
  room.host = 0;
  for (const c of room.clients) { if (c.seat === k) c.seat = -1; else if (c.seat > k) c.seat--; }
  if (!room.players.length) { rooms.delete(room.code); return; }
  bump(room, `${gone.name}님이 ${why}`);
}
export function leaveRoom(code, tok) {
  const room = getRoom(code);
  const k = seatOf(room, tok);
  if (k < 0) return;
  if (room.phase === 'play') fail('경기 중에는 나갈 수 없어요.');
  if (room.phase === 'result') { room.phase = 'lobby'; room.game = null; }
  removeSeat(room, k, '나갔어요.');
}

/* ---------- game ---------- */
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function deal() {
  const seen = new Set(), picked = [];
  for (const id of shuffle(POOL.map(c => c.id))) {
    if (seen.has(C(id).hr)) continue;
    seen.add(C(id).hr); picked.push(id);
    if (picked.length === 9) break;
  }
  const byHr = picked.slice().sort((a, b) => C(b).hr - C(a).hr);
  const hand = picked.sort((a, b) => C(a).team.localeCompare(C(b).team) || C(a).name.localeCompare(C(b).name));
  return { hand, thr: C(byHr[4]).hr };
}
function startGame(room) {
  room.gameNo = (room.gameNo || 0) + 1;
  const d = deal();
  room.phase = 'play';
  room.game = { hand: d.hand, thr: d.thr, lead: randomInt(SEATS), innings: [], pend: [null, null] };
}
const isBlack = (g, id) => C(id).hr >= g.thr;
const wins = (g, p) => g.innings.filter(x => x.res === p).length;
const usedBy = (g, p) => new Set(g.innings.map(x => x.cards[p]));
const over = g => wins(g, 0) >= WIN_AT || wins(g, 1) >= WIN_AT || g.innings.length >= 9;

function play(room, seat, id) {
  const g = room.game;
  if (!g || room.phase !== 'play') fail('경기가 진행 중이 아니에요.');
  id = Number(id);
  if (g.pend[seat] !== null) fail('이번 이닝 카드는 이미 냈어요.');
  if (seat !== g.lead && g.pend[g.lead] === null) fail('선공이 먼저 카드를 내야 해요.');
  if (!g.hand.includes(id) || usedBy(g, seat).has(id)) fail('낼 수 없는 카드예요.');
  g.pend[seat] = id;
  const name = room.players[seat].name;
  if (g.pend[0] === null || g.pend[1] === null) return `${name}님이 ${isBlack(g, id) ? '흑' : '백'} 카드를 냈어요.`;
  // 두 장이 모두 나오면 바로 판정
  const [a, b] = g.pend, ha = C(a).hr, hb = C(b).hr;
  const res = ha === hb ? 'D' : (ha > hb ? 0 : 1);
  g.innings.push({ lead: g.lead, cards: [a, b], res });
  if (res !== 'D') g.lead = res;
  g.pend = [null, null];
  const n = g.innings.length;
  let msg = res === 'D' ? `${n}이닝 무승부` : `${n}이닝 ${room.players[res].name} 승리`;
  if (over(g)) {
    room.phase = 'result';
    const w0 = wins(g, 0), w1 = wins(g, 1);
    msg += ` · 경기 종료! ${w0 === w1 ? '무승부' : room.players[w0 > w1 ? 0 : 1].name + ' 승리'}`;
  }
  return msg;
}

/* ---------- timers ---------- */
setInterval(() => {
  const t = now();
  for (const [code, r] of rooms) if (t - r.touched > ROOM_TTL_MS && !r.clients.size) rooms.delete(code);
}, 10 * 60 * 1000).unref();
setInterval(() => {
  const t = now();
  for (const room of [...rooms.values()]) {
    if (!room.public) continue;
    if (room.phase === 'lobby') {
      room.players.forEach((p, k) => { if (isOnline(room, k)) p.seenAt = t; });
      const k = room.players.findIndex(p => t - p.seenAt > LOBBY_GONE_MS);
      if (k >= 0) removeSeat(room, k, '연결이 끊겨 자리에서 빠졌어요.');
      continue;
    }
    if (room.phase === 'play' && room.deadline && t > room.deadline) {
      const g = room.game;
      const seat = g.pend[g.lead] === null ? g.lead : 1 - g.lead;
      const left = g.hand.filter(id => !usedBy(g, seat).has(id));
      const who = room.players[seat].name;
      const msg = play(room, seat, left[randomInt(left.length)]);
      bump(room, `시간 초과 · ${who}님 카드를 자동으로 냈어요. ${msg}`);
    }
  }
}, 1000).unref();

/* ---------- actions ---------- */
export function act(code, tok, body) {
  const room = getRoom(code);
  const seat = seatOf(room, tok);
  if (seat < 0) fail('이 방의 참가자가 아니에요. 다시 입장하세요.');
  const t = body && body.type;
  if (t === 'start') {
    if (seat !== room.host) fail('방장만 시작할 수 있어요.');
    if (room.players.length !== SEATS) fail('2명이 모여야 시작할 수 있어요.');
    if (room.phase === 'play') fail('이미 진행 중이에요.');
    startGame(room);
    return bump(room, `경기 시작! 1이닝 선공은 ${room.players[room.game.lead].name}님이에요.`);
  }
  if (t === 'play') return bump(room, play(room, seat, body.card));
  fail('알 수 없는 동작이에요.');
}

/* ---------- views & SSE ---------- */
function bump(room, msg) {
  recordFinish(room);
  room.touched = now();
  if (msg) room.lastEvent = msg;
  const g = room.game;
  if (room.public && room.phase === 'play' && g) {
    const key = `${g.innings.length}|${g.pend.join(',')}`;
    if (key !== room.actorKey) { room.actorKey = key; room.deadline = now() + TURN_MS; }
  } else room.deadline = null;
  for (const c of room.clients) send(c, room);
}
function viewFor(room, seat) {
  const g = room.game;
  const v = {
    code: room.code, gameNo: room.gameNo || 0, phase: room.phase, me: seat, host: room.host, public: room.public,
    players: room.players.map((p, k) => ({ name: p.name, online: isOnline(room, k) })),
    lastEvent: room.lastEvent || null,
    turnLeftMs: room.deadline ? Math.max(0, room.deadline - now()) : null, turnMs: TURN_MS, winAt: WIN_AT
  };
  if (!g || room.phase === 'lobby') return v;
  const done = room.phase === 'result';
  const card = id => Object.assign({ id, name: C(id).name, team: C(id).team, black: isBlack(g, id) }, done ? { hr: C(id).hr } : {});
  v.thr = g.thr;
  v.hand = g.hand.map(card);
  v.lead = g.lead;
  v.innings = g.innings.map(x => ({ lead: x.lead, res: x.res, cards: x.cards.map(card) }));
  // 이번 이닝: 내가 낸 카드는 나에게만 이름까지, 상대 카드는 흑·백만
  v.pend = g.pend.map((id, k) => id === null ? null : (k === seat ? card(id) : { black: isBlack(g, id) }));
  v.wins = [wins(g, 0), wins(g, 1)];
  return v;
}
function send(client, room) {
  if (client.seat < 0) { try { client.res.write(`data: ${JSON.stringify({ kicked: true })}\n\n`); } catch {} return; }
  try { client.res.write(`data: ${JSON.stringify(viewFor(room, client.seat))}\n\n`); } catch {}
}
export function subscribe(code, tok, res) {
  const room = getRoom(code);
  const seat = seatOf(room, tok);
  if (seat < 0) fail('이 방의 참가자가 아니에요.');
  res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
  res.write('retry: 2000\n\n');
  const client = { res, seat };
  room.clients.add(client);
  bump(room);
  const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 20000);
  res.on('close', () => { clearInterval(ping); room.clients.delete(client); bump(room); });
}
export function restart(code, tok) {
  const room = getRoom(code);
  if (seatOf(room, tok) !== room.host) fail('방장만 다시 시작할 수 있어요.');
  if (room.players.length !== SEATS) fail('상대가 나가서 다시 시작할 수 없어요.');
  startGame(room);
  bump(room, `재경기 시작! 1이닝 선공은 ${room.players[room.game.lead].name}님이에요.`);
}

/* ---------- 로그인한 참가자의 경기 기록 ---------- */
let finishHook = null;
export function setFinishHook(fn) { finishHook = fn; }
function recordFinish(room) {
  if (room.phase !== 'result' || room.recordedNo === room.gameNo) return;
  room.recordedNo = room.gameNo;
  if (!finishHook) return;
  room.players.forEach((p, k) => { if (p.uid) { try { finishHook(p.uid, entryFor(room, k)); } catch (e) { console.error(e); } } });
}
function entryFor(room, k) {
  const g = room.game, o = 1 - k, w = wins(g, k), l = wins(g, o);
  return { game: 'bw', mode: 'online', level: null, result: w === l ? 'draw' : w > l ? 'win' : 'lose', myWins: w, oppWins: l, opponent: room.players[o] ? room.players[o].name : '상대', innings: g.innings.length };
}

export { GameError };
