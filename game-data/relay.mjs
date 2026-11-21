// 벽바둑 Ⅱ 온라인용 메시지 중계 (관리자 전용). 게임 규칙은 방장 브라우저가 처리하고,
// 서버는 같은 방 코드에 들어온 브라우저끼리 메시지만 전달한다 (SSE로 받고 POST로 보냄).
import { randomInt } from 'node:crypto';

const rooms = new Map();          // code -> { clients:Set<{res,cid}>, touched, reservedUntil }
const MAX_MSG = 256 * 1024;
const MAX_CLIENTS = 12;
const now = () => Date.now();
const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const okCode = c => /^[A-Z]{4}$/.test(c);

export class RelayError extends Error { constructor(m, status = 400) { super(m); this.status = status; } }

export function newCode() {
  let c;
  do { c = Array.from({ length: 4 }, () => ABC[randomInt(ABC.length)]).join(''); } while (rooms.has(c));
  rooms.set(c, { clients: new Set(), touched: now(), reservedUntil: now() + 60000 });
  return c;
}
export function exists(code) {
  const r = rooms.get(code);
  return !!(r && r.clients.size);
}
function emit(room, data) {
  const line = `data: ${data}\n\n`;
  for (const c of room.clients) { try { c.res.write(line); } catch {} }
}
export function subscribe(code, cid, res) {
  code = String(code || '').toUpperCase();
  cid = String(cid || '').slice(0, 40);
  if (!okCode(code) || !cid) throw new RelayError('잘못된 요청이에요.');
  let room = rooms.get(code);
  if (!room) { room = { clients: new Set(), touched: now(), reservedUntil: 0 }; rooms.set(code, room); }
  if (room.clients.size >= MAX_CLIENTS) throw new RelayError('방이 가득 찼어요.');
  res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
  res.write('retry: 2000\n\n');
  const client = { res, cid };
  room.clients.add(client);
  room.touched = now();
  const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 20000);
  res.on('close', () => {
    clearInterval(ping);
    room.clients.delete(client);
    // 같은 브라우저가 다시 연결돼 있지 않으면 나갔다고 알림
    if (![...room.clients].some(c => c.cid === cid)) emit(room, JSON.stringify({ t: 'bye', from: cid }));
    if (!room.clients.size) rooms.delete(code);
  });
}
export function send(code, body) {
  code = String(code || '').toUpperCase();
  const room = rooms.get(code);
  if (!room || !room.clients.size) throw new RelayError('방을 찾을 수 없어요.', 404);
  const m = body && body.m;
  if (!m || typeof m !== 'object' || typeof m.t !== 'string') throw new RelayError('잘못된 메시지예요.');
  const data = JSON.stringify(m);
  if (data.length > MAX_MSG) throw new RelayError('메시지가 너무 커요.');
  room.touched = now();
  emit(room, data);
}

setInterval(() => {
  const t = now();
  for (const [code, r] of rooms) if (!r.clients.size && t > r.reservedUntil) rooms.delete(code);
}, 60000).unref();
