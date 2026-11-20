// 연봉 블라인드 경매 온라인 방 (4인, 각자 폰). 상태는 서버 메모리에만 있고, 화면에는 SSE로 각자 볼 수 있는 내용만 보낸다.
import { randomBytes, randomInt } from 'node:crypto';
import { CARDS, START_CUBES, CHANCE_AFTER, PLAYERS_PER_GAME } from './auction-cards.mjs';

const BY_ID = Object.fromEntries(CARDS.map(c => [c.id, c]));
const SEATS = 4;
const RELEASE_TICK_MS = 1000;
const ROOM_TTL_MS = 6 * 60 * 60 * 1000;
const TURN_MS = Number(process.env.AUCTION_TURN_MS) || 30000;          // 공개 방: 차례마다 30초, 넘기면 자동 처리
const LOBBY_GONE_MS = Number(process.env.AUCTION_LOBBY_GONE_MS) || 45000;    // 공개 방 대기실: 45초 넘게 연결이 끊긴 사람은 자리에서 빠짐
const rooms = new Map();

/* ---------- helpers ---------- */
const now = () => Date.now();
function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c;
  do { c = Array.from({ length: 4 }, () => A[randomInt(A.length)]).join(''); } while (rooms.has(c));
  return c;
}
const token = () => randomBytes(16).toString('hex');
const cleanName = n => String(n || '').trim().slice(0, 10);
class GameError extends Error {}
const fail = msg => { throw new GameError(msg); };

function publicCard(id) {
  const c = BY_ID[id];
  if (!c) return null;
  const { aav, ...rest } = c;
  return rest;
}
function seatOf(room, tok) { return room.players.findIndex(p => p.token === tok); }

/* ---------- room lifecycle ---------- */
export function createRoom(name, isPublic, user) {
  name = user ? user.nickname : (cleanName(name) || 'Player1');
  const room = {
    code: newCode(), phase: 'lobby', players: [], host: 0, ver: 0, touched: now(),
    clients: new Set(), log: [], public: !!isPublic, created: now(), deadline: null, actorKey: ''
  };
  rooms.set(room.code, room);
  const t = addPlayer(room, name, user);
  return { code: room.code, token: t };
}
function addPlayer(room, name, user) {
  if (room.players.length >= SEATS) fail('방이 가득 찼어요 (4명).');
  if (room.phase !== 'lobby') fail('이미 게임이 시작된 방이에요.');
  if (room.players.some(p => p.name === name)) name = name + (room.players.length + 1);
  const t = token();
  room.players.push({ token: t, name, uid: user ? user.id : null, cubes: START_CUBES, cards: [], chances: [], pendingRelease: null, seenAt: now() });
  return t;
}
export function listRooms() {
  return [...rooms.values()]
    .filter(r => r.public && r.phase === 'lobby' && r.players.length > 0 && r.players.length < SEATS)
    .sort((a, b) => b.players.length - a.players.length || a.created - b.created)
    .slice(0, 30)
    .map(r => ({ code: r.code, host: r.players[r.host] ? r.players[r.host].name : '', count: r.players.length }));
}
export function quickJoin(name, user) {
  name = user ? user.nickname : cleanName(name);
  if (!name) fail('이름을 입력하세요.');
  const open = listRooms()[0];
  if (open) return joinRoom(open.code, name, null, user);
  return createRoom(name, true, user);
}
function removeSeat(room, k, why) {
  const [gone] = room.players.splice(k, 1);
  if (room.host === k) room.host = 0;
  else if (room.host > k) room.host--;
  for (const c of room.clients) { if (c.seat === k) c.seat = -1; else if (c.seat > k) c.seat--; }
  if (!room.players.length) { stopTimer(room); rooms.delete(room.code); return; }
  bump(room, `${gone.name}님이 ${why}`);
}
export function leaveRoom(code, tok) {
  const room = getRoom(code);
  const k = seatOf(room, tok);
  if (k < 0) return;
  if (room.phase !== 'lobby') fail('게임 중에는 나갈 수 없어요. 차례가 오면 자동으로 포기 처리돼요.');
  removeSeat(room, k, '나갔어요.');
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
function getRoom(code) {
  const room = rooms.get(String(code || '').toUpperCase());
  if (!room) fail('방을 찾을 수 없어요. 방 코드를 확인하세요.');
  return room;
}
setInterval(() => {
  for (const [code, r] of rooms) if (now() - r.touched > ROOM_TTL_MS && !r.clients.size) { stopTimer(r); rooms.delete(code); }
}, 10 * 60 * 1000).unref();
const isOnline = (room, k) => !!(room.players[k] && room.players[k].bot) || [...room.clients].some(c => c.seat === k);
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
      try { timeoutAction(room); } catch (e) { console.error(e); }
    }
  }
}, 1000).unref();
function timeoutAction(room) {
  const cur = room.cur;
  let msg;
  if (!cur) {
    const free = room.deck.map((_, i) => i).filter(i => !room.opened[i]);
    const who = room.players[room.opener].name;
    msg = openTile(room, room.opener, free[randomInt(free.length)]);
    msg = `시간 초과 · ${who}님 대신 자동으로 열었어요. ` + msg.replace(/^.*?열었어요: /, '');
  } else if (cur.kind === 'auction') {
    const who = room.players[cur.toAct].name;
    fold(room, cur.toAct);
    msg = `시간 초과 · ${who}님 자동 포기`;
  } else if (cur.kind === 'trade') {
    const pl = room.players[cur.by];
    room.tradeUsed = true;
    const prev = room.opened[cur.tile] || {};
    room.opened[cur.tile] = { status: 'applied', p: cur.by, bid: prev.bid, note: `${pl.name} 시간 초과로 트레이드 소멸` };
    msg = `시간 초과 · ${pl.name}님의 트레이드권이 사라졌어요`;
    nextOpener(room);
  } else return;
  bump(room, msg);
}

/* ---------- game setup ---------- */
function startGame(room) {
  room.gameNo = (room.gameNo || 0) + 1;
  room.phase = 'play';
  room.deck = Array(16).fill(null);
  // 이번 게임에 쓸 카드: 선수 풀에서 무작위 13명 + 찬스 카드 3장
  const players = shuffle(CARDS.filter(c => c.type === 'player').map(c => c.id)).slice(0, PLAYERS_PER_GAME);
  room.pool = players.concat(CARDS.filter(c => c.type === 'chance').map(c => c.id));
  room.opened = {};
  room.players.forEach(p => Object.assign(p, { cubes: START_CUBES, cards: [], chances: [], pendingRelease: null }));
  room.opener = 0; // 1라운드는 1번(방장)이 열고, 이후 2·3·4·1번… 순서로 한 칸씩 넘어감. 입찰도 연 사람부터 시계방향
  room.cur = null;
  room.tradeUsed = false;
  room.log = [];
  stopTimer(room);
}
function drawCard(room) {
  const used = new Set(room.deck.filter(Boolean));
  let pool = (room.pool || CARDS.map(c => c.id)).filter(id => !used.has(id));
  const playersOut = room.deck.filter(id => id && BY_ID[id].type === 'player').length;
  const allowed = pool.filter(id => BY_ID[id].type === 'player' || playersOut >= (CHANCE_AFTER[BY_ID[id].kind] || 0));
  if (allowed.length) pool = allowed;
  return pool[randomInt(pool.length)];
}
const allDone = room => room.deck.every((_, i) => room.opened[i] && !['open', 'trading', 'release'].includes(room.opened[i].status));

/* ---------- turn flow ---------- */
function nextOpener(room) {
  room.cur = null;
  room.opener = (room.opener + 1) % SEATS;
  if (allDone(room)) room.phase = 'result';
}
function openTile(room, seat, i) {
  if (room.cur) fail('진행 중인 경매를 먼저 끝내야 해요.');
  if (seat !== room.opener) fail('지금은 카드를 열 차례가 아니에요.');
  if (!(i >= 0 && i < 16) || room.opened[i]) fail('이미 열린 칸이에요.');
  const id = drawCard(room);
  room.deck[i] = id;
  const c = BY_ID[id];
  if (c.kind === 'release') {
    room.opened[i] = { status: 'release' };
    room.cur = { tile: i, kind: 'release', price: 0, startedAt: now() };
    room.cur.botLimits = room.players.map((p, k) => p.bot ? { seat: k, limit: botReleaseLimit(room, k) } : null).filter(Boolean);
    startTimer(room);
    return `${room.players[seat].name}님이 ${i + 1}번을 열었어요: 방출 카드!`;
  }
  room.opened[i] = { status: 'open' };
  room.cur = { tile: i, kind: 'auction', high: 0, highBy: null, active: Array(SEATS).fill(true), toAct: seat, bids: [] };
  autoFold(room);
  return `${room.players[seat].name}님이 ${i + 1}번을 열었어요: ${c.name}`;
}
const activeSeats = cur => cur.active.map((a, k) => a ? k : -1).filter(k => k >= 0);
function autoFold(room) {
  // 낼 수 있는 큐브가 모자란 사람은 자동으로 포기
  const cur = room.cur;
  for (let guard = 0; guard < SEATS + 1; guard++) {
    if (settle(room)) return;
    const p = room.players[cur.toAct];
    if (p.cubes >= cur.high + 1) return;
    cur.active[cur.toAct] = false;
    cur.bids.push({ seat: cur.toAct, fold: true, auto: true });
    advance(room);
  }
}
function advance(room) {
  const cur = room.cur;
  for (let k = 1; k <= SEATS; k++) {
    const s = (cur.toAct + k) % SEATS;
    if (cur.active[s]) { cur.toAct = s; return; }
  }
}
function settle(room) {
  // 낙찰·유찰이 정해졌으면 처리하고 true
  const cur = room.cur;
  const act = activeSeats(cur);
  if (act.length === 0) {
    room.opened[cur.tile] = { status: 'pass' };
    room.lastEvent = `${cur.tile + 1}번 ${BY_ID[room.deck[cur.tile]].name} 유찰`;
    nextOpener(room);
    return true;
  }
  if (act.length === 1 && cur.highBy === act[0]) {
    award(room, act[0], cur.high);
    return true;
  }
  return false;
}
function placeBid(room, seat, amount) {
  const cur = room.cur;
  if (!cur || cur.kind !== 'auction') fail('지금은 입찰할 수 없어요.');
  if (cur.toAct !== seat) fail('내 차례가 아니에요.');
  amount = Math.floor(Number(amount));
  if (!(amount >= cur.high + 1)) fail(`최소 ${cur.high + 1}개 이상 입찰해야 해요.`);
  if (amount > room.players[seat].cubes) fail(`큐브가 ${room.players[seat].cubes}개뿐이에요.`);
  cur.high = amount; cur.highBy = seat;
  cur.bids.push({ seat, amount });
  advance(room);
  autoFold(room);
}
function fold(room, seat) {
  const cur = room.cur;
  if (!cur || cur.kind !== 'auction') fail('지금은 포기할 경매가 없어요.');
  if (cur.toAct !== seat) fail('내 차례가 아니에요.');
  cur.active[seat] = false;
  cur.bids.push({ seat, fold: true });
  advance(room);
  autoFold(room);
}
function award(room, p, bid) {
  const i = room.cur.tile, id = room.deck[i], c = BY_ID[id], pl = room.players[p];
  pl.cubes -= bid;
  room.lastEvent = `${pl.name}님이 ${c.name}을(를) 큐브 ${bid}개에 낙찰`;
  if (c.type === 'player') {
    if (pl.pendingRelease !== null) {
      room.opened[i] = { status: 'released', p, bid, auto: true };
      room.opened[pl.pendingRelease] = Object.assign({}, room.opened[pl.pendingRelease], { note: `${pl.name} · ${c.name} 방출` });
      pl.pendingRelease = null;
      room.lastEvent += ` → 들고 있던 방출 카드로 바로 방출`;
    } else {
      pl.cards.push(id);
      room.opened[i] = { status: 'won', p, bid };
    }
    nextOpener(room);
    return;
  }
  if (c.kind === 'trade') {
    const othersHave = room.players.some((q, k) => k !== p && q.cards.length);
    if (!pl.cards.length || !othersHave) {
      room.tradeUsed = true;
      room.opened[i] = { status: 'applied', p, bid, note: `${pl.name} 낙찰 · ${pl.cards.length ? '교환할 상대 선수 없어' : '보유 선수 없어'} 소멸` };
      nextOpener(room);
    } else {
      room.opened[i] = { status: 'trading', p, bid };
      room.cur = { tile: i, kind: 'trade', by: p };
    }
    return;
  }
  pl.chances.push(id);
  room.opened[i] = { status: 'won', p, bid };
  nextOpener(room);
}
function doTrade(room, seat, mine, theirs) {
  const cur = room.cur;
  if (!cur || cur.kind !== 'trade' || cur.by !== seat) fail('트레이드할 차례가 아니에요.');
  const hp = room.players[seat];
  if (!hp.cards.includes(mine)) fail('내 선수를 골라주세요.');
  const k = room.players.findIndex((q, j) => j !== seat && q.cards.includes(theirs));
  if (k < 0) fail('데려올 상대 선수를 골라주세요.');
  const op = room.players[k];
  hp.cards = hp.cards.map(x => x === mine ? theirs : x);
  op.cards = op.cards.map(x => x === theirs ? mine : x);
  const t1 = room.deck.indexOf(mine), t2 = room.deck.indexOf(theirs);
  if (room.opened[t1]) room.opened[t1] = Object.assign({}, room.opened[t1], { p: k });
  if (room.opened[t2]) room.opened[t2] = Object.assign({}, room.opened[t2], { p: seat });
  room.tradeUsed = true;
  const prev = room.opened[cur.tile] || {};
  room.opened[cur.tile] = { status: 'applied', p: seat, bid: prev.bid, note: `${hp.name} ${BY_ID[mine].name} ↔ ${op.name} ${BY_ID[theirs].name}` };
  room.lastEvent = `트레이드: ${hp.name}의 ${BY_ID[mine].name} ↔ ${op.name}의 ${BY_ID[theirs].name}`;
  nextOpener(room);
}

/* ---------- release (real-time) ---------- */
function startTimer(room) {
  stopTimer(room);
  room.timer = setInterval(() => {
    const cur = room.cur;
    if (!cur || cur.kind !== 'release') return stopTimer(room);
    cur.price += 1;
    // 가격을 낼 수 없는 사람이 생기면 그 사람이 자동으로 포기한 것으로 처리
    const broke = room.players.map((p, k) => p.cubes < cur.price ? k : -1).filter(k => k >= 0);
    if (broke.length) { giveUp(room, broke[randomInt(broke.length)], true); return; }
    // AI: 마음속 한계 가격을 넘으면 포기 버튼을 누름
    const quit = (cur.botLimits || []).filter(x => cur.price > x.limit).sort((a, b) => a.limit - b.limit)[0];
    if (quit) { giveUp(room, quit.seat, false); return; }
    bump(room);
  }, RELEASE_TICK_MS);
  room.timer.unref?.();
}
function stopTimer(room) { if (room.timer) { clearInterval(room.timer); room.timer = null; } }
function giveUp(room, seat, auto) {
  const cur = room.cur;
  if (!cur || cur.kind !== 'release') fail('지금은 방출 경매가 아니에요.');
  stopTimer(room);
  const price = auto ? cur.price - 1 : cur.price;
  const bids = room.players.map((q, k) => k === seat ? 0 : Math.min(price, q.cubes));
  room.players.forEach((q, k) => { q.cubes -= bids[k]; });
  const pl = room.players[seat];
  let note;
  if (pl.cards.length) {
    const rid = pl.cards.pop();
    const ti = room.deck.indexOf(rid);
    if (room.opened[ti]) room.opened[ti] = Object.assign({}, room.opened[ti], { status: 'released' });
    note = `${pl.name} · ${BY_ID[rid].name} 방출`;
  } else {
    pl.pendingRelease = cur.tile;
    note = `${pl.name} 낙찰 · 다음 영입 선수 방출 대기`;
  }
  room.opened[cur.tile] = { status: 'applied', p: seat, bids, note };
  room.lastEvent = `${pl.name}님이 ${auto ? '큐브가 모자라 ' : ''}가장 먼저 포기 (가격 ${price}) → ${note}`;
  nextOpener(room);
  bump(room);
}

/* ---------- results ---------- */
function totals(room) {
  return room.players.map(p => {
    const vals = p.cards.map(id => BY_ID[id].aav);
    let sum = vals.reduce((a, b) => a + b, 0);
    let doubled = null;
    if (p.chances.includes('double') && vals.length) {
      const min = Math.min(...vals);
      doubled = p.cards[vals.indexOf(min)];
      sum += min;
    }
    return { sum, doubled };
  });
}

/* ---------- actions ---------- */
export function act(code, tok, body) {
  const room = getRoom(code);
  const seat = seatOf(room, tok);
  if (seat < 0) fail('이 방의 참가자가 아니에요. 다시 입장하세요.');
  const t = body && body.type;
  let msg = null;
  if (t === 'start') {
    if (seat !== room.host) fail('방장만 시작할 수 있어요.');
    if (room.players.length !== SEATS) fail('4명이 모두 들어와야 시작할 수 있어요.');
    if (room.phase === 'play') fail('이미 진행 중이에요.');
    startGame(room);
    msg = `게임 시작! 첫 카드는 ${room.players[room.opener].name}님이 열어요.`;
  } else if (room.phase !== 'play') {
    fail('게임이 진행 중이 아니에요.');
  } else if (t === 'open') msg = openTile(room, seat, Number(body.tile));
  else if (t === 'bid') placeBid(room, seat, body.amount);
  else if (t === 'fold') fold(room, seat);
  else if (t === 'trade') doTrade(room, seat, body.mine, body.theirs);
  else if (t === 'giveup') return giveUp(room, seat, false);
  else fail('알 수 없는 동작이에요.');
  bump(room, msg);
}

/* ---------- views & SSE ---------- */
function bump(room, msg) {
  recordFinish(room);
  scheduleBots(room);
  room.ver++;
  room.touched = now();
  if (msg) room.lastEvent = msg;
  if (room.public && room.phase === 'play') {
    const c = room.cur;
    const key = c ? `${c.tile}|${c.kind}|${c.toAct ?? c.by ?? ''}|${c.high ?? ''}` : `open|${room.opener}|${room.deck.filter(Boolean).length}`;
    if (c && c.kind === 'release') room.deadline = null;
    else if (key !== room.actorKey) { room.actorKey = key; room.deadline = now() + TURN_MS; }
  } else room.deadline = null;
  for (const c of room.clients) send(c, room);
}
function viewFor(room, seat) {
  const result = room.phase === 'result';
  const v = {
    code: room.code, gameNo: room.gameNo || 0, phase: room.phase, ver: room.ver, me: seat, host: room.host, public: room.public, ai: room.ai || null,
    turnLeftMs: room.deadline ? Math.max(0, room.deadline - now()) : null, turnMs: TURN_MS,
    players: room.players.map((p, k) => ({
      name: p.name, cubes: p.cubes, cards: p.cards, chances: p.chances,
      pendingRelease: p.pendingRelease !== null, online: isOnline(room, k), bot: !!p.bot
    })),
    lastEvent: room.lastEvent || null
  };
  if (room.phase === 'lobby') return v;
  v.opener = room.opener;
  v.tiles = room.deck.map((id, i) => room.opened[i] ? Object.assign({ card: publicCard(id) }, room.opened[i]) : null);
  if (room.cur) {
    const cur = room.cur;
    v.cur = { tile: cur.tile, kind: cur.kind, card: publicCard(room.deck[cur.tile]) };
    if (cur.kind === 'auction') Object.assign(v.cur, { high: cur.high, highBy: cur.highBy, active: cur.active, toAct: cur.toAct, bids: cur.bids.slice(-8) });
    if (cur.kind === 'release') Object.assign(v.cur, { price: cur.price, tickMs: RELEASE_TICK_MS });
    if (cur.kind === 'trade') v.cur.by = cur.by;
  }
  // 연봉은 낙찰받은 본인만 (결과 발표 때는 모두)
  v.salaries = {};
  const show = result ? room.players.flatMap(p => p.cards) : room.players[seat].cards;
  for (const id of show) v.salaries[id] = BY_ID[id].aav;
  if (result) {
    for (const id of room.deck) if (id && BY_ID[id].type === 'player') v.salaries[id] = BY_ID[id].aav;
    v.totals = totals(room);
  }
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
  startGame(room);
  bump(room, `새 게임 시작! 첫 카드는 ${room.players[room.opener].name}님이 열어요.`);
}

/* ---------- AI 대전 (나 + AI 3명) ---------- */
// AI는 연봉을 '대충' 알아요: 난이도별 오차 안에서 착각한 값(est)으로 판단하고, 남의 연봉을 엿보지 않음
const BOT_DELAY = Number(process.env.AUCTION_BOT_DELAY_MS) || 900; // AI가 생각하는 척 기다리는 시간 (900~1800ms)
const BOT_NAMES = ['AI 김박사', 'AI 이코치', 'AI 박스카우트', 'AI 최분석', 'AI 정단장'];
// noise: 연봉을 잘못 아는 폭, jitter: 그때그때 기분, push: 입찰 적극성, endgame: 끝으로 갈수록 남은 큐브를 쓰는 정도
const LEVELS = {
  low: { noise: 0.6, jitter: 0.4, push: 1.25, endgame: 0 },
  mid: { noise: 0.25, jitter: 0.15, push: 0.9, endgame: 0.5 },
  high: { noise: 0.08, jitter: 0.04, push: 0.7, endgame: 1.0 }
};
export function createAiRoom(name, level, user) {
  if (!LEVELS[level]) level = 'mid';
  const { code, token: t } = createRoom(cleanName(name) || 'Player1', false, user);
  const room = rooms.get(code);
  room.ai = level;
  const names = shuffle(BOT_NAMES).slice(0, 3);
  const styles = shuffle([0.85, 1.0, 1.2]); // 신중형 · 보통 · 공격형
  for (let k = 0; k < 3; k++) {
    const est = {};
    for (const c of CARDS) if (c.type === 'player') est[c.id] = c.aav * (1 + (Math.random() * 2 - 1) * LEVELS[level].noise);
    room.players.push({ token: token(), name: names[k], cubes: START_CUBES, cards: [], chances: [], pendingRelease: null, seenAt: now(), bot: { est, style: styles[k] } });
  }
  startGame(room);
  room.lastEvent = `AI 대전 시작 (난이도 ${({ low: '하', mid: '중', high: '상' })[level]}). 첫 카드는 ${room.players[room.opener].name}님이 열어요.`;
  return { code, token: t };
}
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const estOf = (room, k, id) => room.players[k].bot.est[id];
function cubesPerEok(room, k) {
  // 남은(아직 안 열린) 선수들의 내 추정 연봉 합 중 내가 가져갈 몫(약 1/4)에 내 큐브를 나눠 씀
  const opened = new Set(room.deck.filter(Boolean));
  const cur = room.cur && room.deck[room.cur.tile];
  // AI도 이번 게임에 어떤 선수가 숨어 있는지는 모름 → 남은 선수 수 × 아직 안 나온 선수들의 평균 추정 연봉
  const openedPlayers = [...opened].filter(id => BY_ID[id].type === 'player' && id !== cur).length;
  const left = Math.max(0, PLAYERS_PER_GAME - openedPlayers);
  const unseen = CARDS.filter(c => c.type === 'player' && (!opened.has(c.id) || c.id === cur));
  const avg = unseen.reduce((s, c) => s + estOf(room, k, c.id), 0) / Math.max(1, unseen.length);
  const rest = left * avg;
  return room.players[k].cubes / Math.max(20, rest * 0.3);
}
function botWorth(room, k, id) {
  const c = BY_ID[id], p = room.players[k];
  const mine = p.cards.map(x => estOf(room, k, x));
  if (c.type === 'player') return p.pendingRelease !== null ? 0 : estOf(room, k, id);
  if (c.kind === 'double') return mine.length ? Math.min(...mine) * 0.8 : 8;
  if (c.kind === 'trade') {
    const theirs = room.players.flatMap((q, j) => j === k ? [] : q.cards.map(x => estOf(room, k, x)));
    if (!mine.length || !theirs.length) return 0;
    return Math.max(0, Math.max(...theirs) - Math.min(...mine)) * 0.7;
  }
  return 0;
}
function botReleaseLimit(room, k) {
  const p = room.players[k];
  const lose = p.cards.length ? estOf(room, k, p.cards[p.cards.length - 1]) : 6; // 선수가 없으면 다음 영입 선수를 잃을 위험만
  const lv = LEVELS[room.ai] || LEVELS.mid;
  const limit = lose * cubesPerEok(room, k) * p.bot.style * (1 + (Math.random() * 2 - 1) * lv.jitter) * 0.6;
  return Math.max(0, Math.floor(limit));
}
function botAct(room) {
  const cur = room.cur;
  if (room.phase !== 'play') return null;
  if (!cur) {
    const k = room.opener; if (!room.players[k].bot) return null;
    const free = room.deck.map((_, i) => i).filter(i => !room.opened[i]);
    return openTile(room, k, free[randomInt(free.length)]);
  }
  if (cur.kind === 'auction') {
    const k = cur.toAct, p = room.players[k]; if (!p.bot) return null;
    const lv = LEVELS[room.ai] || LEVELS.mid;
    const id = room.deck[cur.tile];
    const progress = room.deck.filter(Boolean).length / 16; // 큐브는 남겨봐야 점수가 안 되므로 후반일수록 더 씀
    const willing = Math.floor(botWorth(room, k, id) * cubesPerEok(room, k) * p.bot.style * lv.push * (1 + lv.endgame * progress) * (1 + (Math.random() * 2 - 1) * lv.jitter));
    const cap = Math.min(p.cubes, willing);
    if (cur.high + 1 <= cap) {
      const step = room.ai === 'high' ? 1 : 1 + (Math.random() < 0.3 ? 1 : 0);
      placeBid(room, k, Math.min(cap, cur.high + step));
      return room.cur === cur ? `${p.name}님 ${cur.high}개 입찰` : null;
    }
    fold(room, k);
    return room.cur === cur ? `${p.name}님 포기` : null;
  }
  if (cur.kind === 'trade') {
    const k = cur.by, p = room.players[k]; if (!p.bot) return null;
    const mine = p.cards.slice().sort((a, b) => estOf(room, k, a) - estOf(room, k, b))[0];
    const theirs = room.players.flatMap((q, j) => j === k ? [] : q.cards).sort((a, b) => estOf(room, k, b) - estOf(room, k, a))[0];
    doTrade(room, k, mine, theirs);
    return null;
  }
  return null;
}
function scheduleBots(room) {
  if (!room.ai || room.botTimer || room.phase !== 'play') return;
  const cur = room.cur;
  const k = !cur ? room.opener : cur.kind === 'auction' ? cur.toAct : cur.kind === 'trade' ? cur.by : -1;
  if (k < 0 || !room.players[k] || !room.players[k].bot) return;
  room.botTimer = setTimeout(() => {
    room.botTimer = null;
    try { const msg = botAct(room); bump(room, msg); } catch (e) { console.error(e); }
  }, BOT_DELAY + randomInt(BOT_DELAY + 1));
  room.botTimer.unref?.();
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
  const sums = totals(room).map(t => Math.round(t.sum * 100) / 100);
  return {
    game: 'auction', mode: room.ai ? 'ai' : 'online', level: room.ai || null,
    rank: 1 + sums.filter(x => x > sums[k]).length, total: room.players.length, score: sums[k],
    players: room.players.map((p, j) => ({ name: p.name, score: sums[j], me: j === k, bot: !!p.bot })),
    mine: room.players[k].cards.map(id => ({ name: BY_ID[id].name, aav: BY_ID[id].aav }))
  };
}

export { GameError };
