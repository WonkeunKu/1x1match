// 무거운 13 (데블스플랜: 데드 어게인 감옥매치) 온라인 방. 규칙·AI는 서버가 처리하고, 각자 화면은 SSE로 받음.
// 5~7인, 빈자리는 AI. 접속이 끊긴 사람은 AI가 대신 둠. 로그인한 사람은 끝나면 경기 기록에 남음.
import { randomBytes, randomInt } from 'node:crypto';

/* ================= 규칙 엔진 (예전 1파일판에서 그대로 옮김) ================= */
const COLORS = ['R','G','B'];
const CN = {R:'빨강', G:'초록', B:'파랑', W:'레인보우'};
const LIMIT = 13, SET_ROUNDS = 7, TOTAL_ROUNDS = 14;
const HUES = ['#f5a524','#8e4ec6','#12a594','#e54666','#3e8ef7','#a18072','#d6409f'];
const T = { REVEAL_MS: 2600, ROUND_END_MS: 3800, AUTO_PLACE_MS: 900, AI_DECIDE_MS: 1200 };

function P(st, id){ return st.players.find(p => p.id === id); }
function sumOf(arr){ return arr.reduce((a, c) => a + c.v, 0); }
function addLog(st, e){ e.seq = ++st.logSeq; e.round = st.round; st.log.push(e); if (st.log.length > 250) st.log.shift(); }

function createGame(seats, opts){
  const now = Date.now();
  const st = {
    phase: 'submit', round: 1, startIdx: Math.floor(Math.random() * seats.length),
    stands: {R: [], G: [], B: []},
    players: seats.map((s, i) => ({ id: s.id, name: s.name, isAI: !!s.isAI, connected: true, hue: HUES[i % HUES.length],
      cards: [0,1,2,3,4,5,6], chips: {R:2, G:2, B:2, W:1}, penalty: 0, lastPenSeq: 0 })),
    subs: {}, place: null, order: null, penSeq: 0, lastPenPid: null, roundPens: {},
    log: [], logSeq: 0, opts: Object.assign({submitSec: 120, decideSec: 30}, opts || {}),
    deadline: now + (opts && opts.submitSec || 120) * 1000, aiReady: {}, curAt: now, ranking: null
  };
  addLog(st, {type: 'info', text: '게임 시작! 선 플레이어: ' + st.players[st.startIdx].name});
  scheduleAI(st);
  return st;
}
function scheduleAI(st){
  const now = Date.now(); st.aiReady = {};
  st.players.forEach(p => { st.aiReady[p.id] = now + 1200 + Math.random() * 2600; });
}

function submitMove(st, pid, card, chip){
  if (st.phase !== 'submit') return '제출 단계가 아닙니다';
  const p = P(st, pid); if (!p) return '플레이어 없음';
  card = Number(card);
  if (!p.cards.includes(card)) return '없는 카드';
  if (!(p.chips[chip] > 0)) return '없는 칩';
  st.subs[pid] = {card, chip};
  return null;
}
function allSubmitted(st){ return st.players.every(p => st.subs[p.id]); }

function orderKey(st, i){
  const n = st.players.length, s = st.subs[st.players[i].id];
  return [s.chip === 'W' ? 0 : 1, -s.card, (i - st.startIdx + n) % n];
}
function cmpKey(a, b){ for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return a[k] - b[k]; return 0; }
function computeOrder(st){
  return st.players.map((p, i) => i).sort((a, b) => cmpKey(orderKey(st, a), orderKey(st, b))).map(i => st.players[i].id);
}

function reveal(st){
  st.players.forEach(p => { const s = st.subs[p.id]; p.cards = p.cards.filter(c => c !== s.card); p.chips[s.chip]--; });
  st.order = computeOrder(st);
  st.place = {main: st.order.slice(), stack: [], passed: [], done: [], cur: null, stage: null};
  st.roundPens = {};
  st.phase = 'reveal';
  st.deadline = Date.now() + T.REVEAL_MS;
  addLog(st, {type: 'info', text: st.round + '라운드 공개'});
}
function startPlacing(st){ st.phase = 'place'; setCur(st); }
function setCur(st){
  const pl = st.place;
  if (pl.main.length){ pl.cur = pl.main[0]; pl.stage = 'main'; }
  else if (pl.stack.length){ pl.cur = pl.stack[pl.stack.length - 1]; pl.stage = 'stack'; }
  else { pl.cur = null; pl.stage = null; endRound(st); return; }
  st.curAt = Date.now();
  st.deadline = needsDecision(st) ? Date.now() + st.opts.decideSec * 1000 : null;
}
function needsDecision(st){
  const pl = st.place; if (st.phase !== 'place' || !pl || !pl.cur) return false;
  if (pl.stage === 'main') return true;
  return st.subs[pl.cur].chip === 'W';
}
function decide(st, pid, action, color){
  if (st.phase !== 'place') return '배치 단계가 아닙니다';
  const pl = st.place; if (pl.cur !== pid) return '내 차례가 아닙니다';
  const sub = st.subs[pid];
  if (action === 'pass'){
    if (pl.stage !== 'main') return '이미 패스했습니다';
    pl.main.shift(); pl.stack.push(pid); pl.passed.push(pid);
    addLog(st, {type: 'pass', pid});
    setCur(st); return null;
  }
  const c = sub.chip === 'W' ? color : sub.chip;
  if (!COLORS.includes(c)) return '받침대 색을 골라주세요';
  if (pl.stage === 'main') pl.main.shift(); else pl.stack.pop();
  doPlace(st, pid, c, sub.card);
  pl.done.push(pid);
  setCur(st); return null;
}
function doPlace(st, pid, c, v){
  const s = st.stands[c], sum = sumOf(s);
  if (sum + v >= LIMIT){
    const pen = s.length, p = P(st, pid);
    p.penalty += pen; p.lastPenSeq = ++st.penSeq; st.lastPenPid = pid;
    st.roundPens[pid] = (st.roundPens[pid] || 0) + pen;
    st.stands[c] = [{v, p: pid}];
    addLog(st, {type: 'bust', pid, color: c, v, pen, before: sum});
  } else {
    s.push({v, p: pid});
    addLog(st, {type: 'place', pid, color: c, v, sum: sum + v});
  }
}
function endRound(st){
  st.phase = 'roundEnd';
  if (st.lastPenPid){ const i = st.players.findIndex(p => p.id === st.lastPenPid); if (i >= 0) st.startIdx = i; }
  st.deadline = Date.now() + T.ROUND_END_MS;
}
function nextRound(st){
  if (st.round >= TOTAL_ROUNDS){
    st.phase = 'over'; st.deadline = null; st.ranking = computeRanking(st);
    addLog(st, {type: 'info', text: '게임 종료'}); return;
  }
  st.round++;
  if (st.round === SET_ROUNDS + 1){
    st.players.forEach(p => { p.cards = [0,1,2,3,4,5,6]; p.chips = {R:2, G:2, B:2, W:1}; });
    addLog(st, {type: 'info', text: '카드·칩 재지급! 받침대는 그대로 이어집니다'});
  }
  st.subs = {}; st.place = null; st.order = null; st.phase = 'submit';
  st.deadline = Date.now() + st.opts.submitSec * 1000;
  addLog(st, {type: 'info', text: st.round + '라운드 시작 · 선: ' + st.players[st.startIdx].name});
  scheduleAI(st);
}
function computeRanking(st){
  const arr = st.players.map(p => ({id: p.id, name: p.name, penalty: p.penalty, seq: p.lastPenSeq}));
  arr.sort((a, b) => a.penalty - b.penalty || a.seq - b.seq);
  let rank = 0;
  arr.forEach((r, i) => {
    if (i === 0 || r.penalty !== arr[i-1].penalty || r.seq !== arr[i-1].seq) rank = i + 1;
    r.rank = rank;
  });
  return arr;
}

/* ---------------- AI ---------------- */
function greedyColor(sums, cnt, v, chip){
  const cols = chip === 'W' ? COLORS : [chip];
  let best = null;
  for (const c of cols){
    const cost = sums[c] + v >= LIMIT ? cnt[c] : 0;
    // 안전하면 큐브가 많이 쌓인 곳(남에게 부담) 선호
    const score = cost * 100 - (cost === 0 ? cnt[c] * 0.5 + sums[c] * 0.05 : 0) + Math.random() * 0.01;
    if (!best || score < best.score) best = {c, cost, score};
  }
  return best;
}
// entries: 배치 대기열(이미 순서대로), stack0: 이미 패스한 사람들(뒤가 먼저 배치)
function simRound(standsInfo, entries, stack0, forced){
  const sums = {}, cnt = {};
  COLORS.forEach(c => { sums[c] = standsInfo[c].s; cnt[c] = standsInfo[c].c; });
  const pen = {}, stack = stack0.slice();
  const put = (e, c) => {
    if (sums[c] + e.v >= LIMIT){ pen[e.id] = (pen[e.id] || 0) + cnt[c]; sums[c] = e.v; cnt[c] = 1; }
    else { sums[c] += e.v; cnt[c]++; }
  };
  for (const e of entries){
    let act, col;
    if (forced && forced.id === e.id){ act = forced.action; col = forced.color; }
    else { const g = greedyColor(sums, cnt, e.v, e.chip); act = g.cost > 0 ? 'pass' : 'place'; col = g.c; }
    if (act === 'pass') stack.push(e); else put(e, col);
  }
  while (stack.length){
    const e = stack.pop();
    if (forced && forced.id === e.id && forced.later) put(e, forced.later);
    else put(e, greedyColor(sums, cnt, e.v, e.chip).c);
  }
  return pen;
}
function standsInfo(st){ const o = {}; COLORS.forEach(c => { o[c] = {s: sumOf(st.stands[c]), c: st.stands[c].length}; }); return o; }

function aiDecide(st, pid){
  const pl = st.place, sub = st.subs[pid], info = standsInfo(st);
  const ent = id => ({id, v: st.subs[id].card, chip: st.subs[id].chip});
  const cols = sub.chip === 'W' ? COLORS : [sub.chip];
  const opts = [];
  if (pl.stage === 'stack'){
    const rest = pl.stack.slice(0, -1).map(ent);
    for (const c of cols){
      const pen = simRound(info, [], rest.concat([ent(pid)]), {id: pid, later: c});
      opts.push({action: 'place', color: c, pen});
    }
  } else {
    const main = pl.main.map(ent), stack = pl.stack.map(ent);
    for (const c of cols) opts.push({action: 'place', color: c, pen: simRound(info, main, stack, {id: pid, action: 'place', color: c})});
    opts.push({action: 'pass', pen: simRound(info, main, stack, {id: pid, action: 'pass'})});
  }
  let best = null;
  for (const o of opts){
    const mine = o.pen[pid] || 0;
    const others = Object.keys(o.pen).reduce((a, k) => a + (k === pid ? 0 : o.pen[k]), 0);
    o.score = mine - others * 0.05 + (o.action === 'pass' ? 0.15 : 0) + Math.random() * 0.01; // 동률이면 지금 놓기 선호
    if (!best || o.score < best.score) best = o;
  }
  return {action: best.action, color: best.color};
}

function aiSubmit(st, pid, N){
  N = N || 220;
  const me = P(st, pid), n = st.players.length, info = standsInfo(st);
  const options = [];
  for (const card of me.cards) for (const chip of ['R','G','B','W']) if (me.chips[chip] > 0) options.push({card, chip});
  if (options.length === 1) return options[0];
  const others = st.players.map((p, i) => ({p, i})).filter(o => o.p.id !== pid);
  const pools = others.map(({p, i}) => {
    const list = []; let tot = 0;
    for (const card of p.cards) for (const chip of ['R','G','B','W']) if (p.chips[chip] > 0){
      const w = p.chips[chip] * (chip === 'W' ? 1 : (info[chip].s + card < LIMIT ? 1 : 0.3));
      tot += w; list.push({card, chip, cum: tot});
    }
    return {p, i, list, tot};
  });
  const samples = [];
  for (let k = 0; k < N; k++){
    samples.push(pools.map(o => {
      const r = Math.random() * o.tot; const pick = o.list.find(x => x.cum >= r) || o.list[o.list.length - 1];
      return {id: o.p.id, v: pick.card, chip: pick.chip, d: (o.i - st.startIdx + n) % n};
    }));
  }
  const myIdx = st.players.findIndex(p => p.id === pid), myD = (myIdx - st.startIdx + n) % n;
  const rLeft = SET_ROUNDS - ((st.round - 1) % SET_ROUNDS), factor = (rLeft - 1) / 6;
  const key = e => [e.chip === 'W' ? 0 : 1, -e.v, e.d];
  let best = null;
  for (const o of options){
    let total = 0;
    const meE = {id: pid, v: o.card, chip: o.chip, d: myD};
    for (const s of samples){
      const entries = s.concat([meE]).sort((a, b) => cmpKey(key(a), key(b)));
      total += simRound(info, entries, [], null)[pid] || 0;
    }
    let cost = total / N;
    if (o.chip === 'W') cost += 0.7 * factor;
    if (o.card === 0) cost += 0.6 * factor;
    if (o.card === 1) cost += 0.15 * factor;
    cost += Math.random() * 0.06;
    if (!best || cost < best.cost) best = {card: o.card, chip: o.chip, cost};
  }
  return {card: best.card, chip: best.chip};
}

/* 호스트 진행 틱: 상태가 바뀌었으면 true */
function hostTick(st, isAuto){
  const now = Date.now();
  if (st.phase === 'submit'){
    let changed = false;
    for (const p of st.players){
      if (st.subs[p.id]) continue;
      const auto = isAuto(p);
      if ((auto && now >= st.aiReady[p.id]) || now >= st.deadline){
        const m = aiSubmit(st, p.id); submitMove(st, p.id, m.card, m.chip); changed = true;
        if (!auto) addLog(st, {type: 'info', text: p.name + ' 시간 초과 → 자동 제출'});
      }
    }
    if (allSubmitted(st)){ reveal(st); return true; }
    return changed;
  }
  if (st.phase === 'reveal'){ if (now >= st.deadline){ startPlacing(st); return true; } return false; }
  if (st.phase === 'place'){
    const pl = st.place, pid = pl.cur; if (!pid) return false;
    const p = P(st, pid);
    if (!needsDecision(st)){
      if (now >= st.curAt + T.AUTO_PLACE_MS){ decide(st, pid, 'place', st.subs[pid].chip); return true; }
      return false;
    }
    if ((isAuto(p) && now >= st.curAt + T.AI_DECIDE_MS) || now >= st.deadline){
      const d = aiDecide(st, pid); decide(st, pid, d.action, d.color); return true;
    }
    return false;
  }
  if (st.phase === 'roundEnd'){ if (now >= st.deadline){ nextRound(st); return true; } return false; }
  return false;
}

/* ================= 방 ================= */
const rooms = new Map();
const now = () => Date.now();
const ROOM_TTL_MS = 6 * 60 * 60 * 1000;
const AI_NAMES = ['AI 자갈', 'AI 짐꾼', 'AI 바위', 'AI 현무암', 'AI 화강암', 'AI 조약돌', 'AI 맷돌'];
class GameError extends Error {}
const fail = m => { throw new GameError(m); };
const tokenNew = () => randomBytes(16).toString('hex');
const pidNew = () => 'p' + randomBytes(5).toString('hex');
function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c; do { c = Array.from({ length: 4 }, () => A[randomInt(A.length)]).join(''); } while (rooms.has(c));
  return c;
}
function getRoom(code) { const r = rooms.get(String(code || '').toUpperCase()); if (!r) fail('방을 찾을 수 없어요. 방 코드를 확인하세요.'); return r; }
const memberOf = (room, tok) => room.members.find(m => m.token === tok);
function me(room, tok) { const m = memberOf(room, tok); if (!m) fail('이 방의 참가자가 아니에요.'); return m; }
const online = (room, pid) => [...room.clients].some(c => { const m = memberOf(room, c.token); return m && m.pid === pid; });

export function createRoom(user, opts = {}) {
  const room = { code: newCode(), members: [], host: null, settings: { count: 5, submitSec: 60, decideSec: 20 }, st: null, clients: new Set(), touched: now(), solo: !!opts.solo };
  rooms.set(room.code, room);
  const t = addMember(room, user);
  return { code: room.code, token: t };
}
function addMember(room, user) {
  const old = user.id != null && room.members.find(m => m.uid === user.id);
  if (old) return old.token;
  if (room.members.length >= 7 && !room.st) fail('방이 가득 찼어요 (7명).');
  const m = { token: tokenNew(), pid: pidNew(), uid: user.id, name: String(user.nickname || '플레이어').slice(0, 10) };
  room.members.push(m);
  if (!room.host) room.host = m.token;
  return m.token;
}
export function joinRoom(code, tok, user) {
  const room = getRoom(code);
  if (tok && memberOf(room, tok)) return { code: room.code, token: tok };
  if (room.solo) fail('혼자 연습 중인 방이에요.');
  const t = addMember(room, user); bump(room);
  return { code: room.code, token: t };
}
export function leaveRoom(code, tok) {
  const room = rooms.get(String(code || '').toUpperCase()); if (!room) return;
  const k = room.members.findIndex(m => m.token === tok); if (k < 0) return;
  const m = room.members[k];
  room.members.splice(k, 1);
  for (const c of room.clients) if (c.token === tok) { try { c.res.write(`data: ${JSON.stringify({ left: true })}\n\n`); c.res.end(); } catch {} }
  // 게임 중이면 그 자리는 AI가 이어서 둠
  if (room.st) { const p = P(room.st, m.pid); if (p && !p.isAI) { p.isAI = true; p.name = p.name + ' (AI)'; addLog(room.st, { type: 'info', text: m.name + ' 나감 → AI가 대신해요' }); } }
  if (!room.members.length) { closeRoom(room); return; }
  if (room.host === tok) room.host = room.members[0].token;
  bump(room);
}
function closeRoom(room) { clearInterval(room.ticker); for (const c of room.clients) { try { c.res.end(); } catch {} } rooms.delete(room.code); }

function startGame(room) {
  const humans = room.members.slice(0, 7);
  const count = Math.max(room.settings.count, humans.length);
  const seats = humans.map(m => ({ id: m.pid, name: m.name }));
  const used = new Set();
  while (seats.length < count) { let nm; do { nm = AI_NAMES[randomInt(AI_NAMES.length)]; } while (used.has(nm)); used.add(nm); seats.push({ id: pidNew(), name: nm, isAI: true }); }
  // 자리 순서를 섞음 (시계방향 순서)
  for (let i = seats.length - 1; i > 0; i--) { const j = randomInt(i + 1); [seats[i], seats[j]] = [seats[j], seats[i]]; }
  room.st = createGame(seats, { submitSec: room.settings.submitSec, decideSec: room.settings.decideSec });
  clearInterval(room.ticker);
  room.ticker = setInterval(() => tick(room), 250);
}
function tick(room) {
  const st = room.st; if (!st || st.phase === 'over') { clearInterval(room.ticker); return; }
  let changed = false;
  try { changed = hostTick(st, p => p.isAI || !online(room, p.id)); } catch (e) { console.error('heavy13 tick', e); }
  if (changed) { if (st.phase === 'over') onOver(room); bump(room); }
}

export function act(code, tok, body) {
  const room = getRoom(code), m = me(room, tok), isHost = room.host === tok, type = body && body.type;
  if (type === 'settings') {
    if (!isHost) fail('방장만 바꿀 수 있어요.');
    if (room.st && room.st.phase !== 'over') fail('게임 중에는 바꿀 수 없어요.');
    const s = room.settings, n = Number(body.count), a = Number(body.submitSec), d = Number(body.decideSec);
    if ([5, 6, 7].includes(n)) s.count = n;
    if ([30, 60, 90, 120, 180].includes(a)) s.submitSec = a;
    if ([10, 20, 30, 60].includes(d)) s.decideSec = d;
  } else if (type === 'start') {
    if (!isHost) fail('방장만 시작할 수 있어요.');
    if (room.st && room.st.phase !== 'over') fail('이미 게임 중이에요.');
    startGame(room);
  } else if (type === 'lobby') {
    if (!isHost) fail('방장만 할 수 있어요.');
    clearInterval(room.ticker); room.st = null;
  } else {
    const st = room.st; if (!st) fail('게임이 시작되지 않았어요.');
    const p = P(st, m.pid); if (!p) fail('이번 게임 참가자가 아니에요 (관전 중).');
    let err = null;
    if (type === 'submit') err = submitMove(st, m.pid, body.card, String(body.chip || ''));
    else if (type === 'decide') err = decide(st, m.pid, body.action === 'pass' ? 'pass' : 'place', String(body.color || ''));
    else fail('알 수 없는 동작이에요.');
    if (err) fail(err);
    if (type === 'submit' && allSubmitted(st)) reveal(st);
    if (st.phase === 'over') onOver(room);
  }
  bump(room);
}
let finishHook = null;
export function setFinishHook(fn) { finishHook = fn; }
function onOver(room) {
  clearInterval(room.ticker);
  const st = room.st; if (!st || room.recorded === st || !finishHook) return;
  room.recorded = st;
  const rk = st.ranking || computeRanking(st), N = st.players.length;
  for (const m of room.members) {
    if (m.uid == null) continue;
    const mine = rk.find(r => r.id === m.pid); if (!mine) continue;
    finishHook(m.uid, { game: 'heavy13', mode: room.solo ? 'ai' : 'online', level: null, result: mine.rank === 1 ? 'win' : 'lose', rank: mine.rank, total: N, penalty: mine.penalty,
      players: rk.map(r => { const p = st.players.find(x => x.id === r.id); return { name: r.name, ai: !!(p && p.isAI), penalty: r.penalty, rank: r.rank, me: r.id === m.pid }; }) });
  }
}

/* ---------- 실시간 화면 ---------- */
function viewFor(room, tok) {
  const m = memberOf(room, tok), st = room.st;
  const v = {
    code: room.code, host: room.host === tok, me: m ? m.pid : null, solo: room.solo, serverNow: now(), settings: room.settings,
    members: room.members.map(x => ({ name: x.name, me: x.token === tok, host: x.token === room.host, online: online(room, x.pid) }))
  };
  if (st) {
    const g = JSON.parse(JSON.stringify(st)); delete g.aiReady; delete g.opts;
    if (st.phase === 'submit') { const subs = {}; for (const p of st.players) if (st.subs[p.id]) subs[p.id] = m && p.id === m.pid ? st.subs[p.id] : { hidden: true }; g.subs = subs; }
    g.deadlineIn = st.deadline ? st.deadline - now() : null;
    g.decideSec = st.opts.decideSec; g.submitSec = st.opts.submitSec;
    for (const p of g.players) p.online = p.isAI ? true : online(room, p.id);
    g.log = g.log.slice(-40);
    v.game = g;
  }
  return v;
}
function bump(room) {
  room.touched = now();
  for (const c of room.clients) { try { c.res.write(`data: ${JSON.stringify(viewFor(room, c.token))}\n\n`); } catch {} }
}
export function subscribe(code, tok, res) {
  const room = getRoom(code); me(room, tok);
  res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
  res.write('retry: 2000\n\n');
  const client = { res, token: tok };
  room.clients.add(client); bump(room);
  const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 20000);
  res.on('close', () => { clearInterval(ping); room.clients.delete(client); bump(room); });
}
setInterval(() => {
  const t = now();
  for (const room of rooms.values()) if (t - room.touched > ROOM_TTL_MS || (!room.clients.size && t - room.touched > 20 * 60 * 1000)) closeRoom(room);
}, 5 * 60 * 1000).unref();

export { GameError };
export const _engine = { createGame, submitMove, hostTick, aiSubmit, aiDecide, decide, reveal, allSubmitted, computeRanking, sumOf, P };
