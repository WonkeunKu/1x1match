// 회원 계정과 경기 기록.
// - 운영: Supabase(PostgreSQL)의 match_users / match_history 테이블 (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요)
// - 환경변수가 없으면(내 컴퓨터에서 개발할 때) data/accounts.json 파일에 저장 — 서버가 다시 시작되면 사라질 수 있음
// - 비밀번호는 scrypt로 해시해서만 저장하고, 로그인은 서명한 쿠키(sid)로 유지
import { scrypt as _scrypt, randomBytes, randomInt, timingSafeEqual, createHmac, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const scrypt = promisify(_scrypt);
const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const usingSupabase = !!(SB_URL && SB_KEY);
const SECRET = process.env.SESSION_SECRET || (SB_KEY ? createHash('sha256').update('1x1match:' + SB_KEY).digest('hex') : 'dev-only-secret');
const SESSION_DAYS = 30;

// Render 같은 운영 서버에서 Supabase 설정이 없으면 계정 기능을 막음 (파일 저장은 재배포 때 지워져서 가입한 계정이 사라지기 때문)
const ACCOUNTS_DISABLED = !!process.env.RENDER && !(SB_URL && SB_KEY);
export class AuthError extends Error { constructor(msg, status = 400, field = null) { super(msg); this.status = status; this.field = field; } }
const fail = (msg, field, status = 400) => { throw new AuthError(msg, status, field); };

/* ---------- validation (화면과 같은 규칙) ---------- */
export const NICK_RE = /^(?!\d+$)[0-9A-Za-z가-힣_]{2,10}$/; // 숫자로만 된 닉네임은 전화번호와 헷갈려서 막음
export const pwOk = pw => typeof pw === 'string' && pw.length >= 8 && pw.length <= 64 && /[A-Za-z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);
export const phoneDigits = p => String(p || '').replace(/\D/g, '');
const phoneOk = d => /^01[016789]\d{7,8}$/.test(d);
const nameOk = n => /^[A-Za-z가-힣 ]{2,20}$/.test(n);
// 관리자 계정(전화번호 기준). 관리자만 볼 수 있는 게임(슬리더링크)이 있음
const ADMIN_PHONES = (process.env.ADMIN_PHONES || '01073343125,01034238296,01029903125,01087868296,01071135737').split(',').map(phoneDigits).filter(Boolean);
const isAdminPhone = p => ADMIN_PHONES.includes(phoneDigits(p));
// 대표 계정: 회원 목록·접속 기록을 볼 수 있음
const OWNER_PHONES = (process.env.OWNER_PHONES || '01073343125').split(',').map(phoneDigits).filter(Boolean);
const isOwnerPhone = p => OWNER_PHONES.includes(phoneDigits(p));
const EVENT_GAMES = ['_login', '_visit', '_pv', '_free', '_chal', '_chalrec']; // match_history 에 같이 저장하는 접속 기록 (경기 기록 목록에서는 뺌)

/* ---------- storage ---------- */
async function sb(path, opts = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method: opts.method || 'GET',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'content-type': 'application/json', Prefer: opts.prefer || 'return=representation' },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) { const e = new Error((data && data.message) || `Supabase ${r.status}`); e.code = data && data.code; e.details = data; throw e; }
  return data;
}
const FILE = fileURLToPath(new URL('../data/accounts.json', import.meta.url));
let fileDb = null;
async function fdb() {
  if (fileDb) return fileDb;
  try { fileDb = JSON.parse(await readFile(FILE, 'utf8')); } catch { fileDb = { users: [], history: [], seq: 0 }; }
  return fileDb;
}
async function fsave() { await mkdir(new URL('../data/', import.meta.url), { recursive: true }); await writeFile(FILE, JSON.stringify(fileDb)); }

async function findUser(field, value) {
  if (usingSupabase) {
    const rows = await sb(`match_users?select=id,nickname,name,phone,pw_hash&${field}=eq.${encodeURIComponent(value)}&limit=1`);
    return rows[0] || null;
  }
  return (await fdb()).users.find(u => u[field] === value) || null;
}
async function insertUser(u) {
  if (usingSupabase) {
    try { return (await sb('match_users', { method: 'POST', body: u }))[0]; }
    catch (e) {
      if (e.code === '23505') {
        const msg = String(e.details && (e.details.details || e.details.message) || '');
        if (msg.includes('phone')) fail('이미 가입된 전화번호예요. 전화번호 하나당 계정은 하나만 만들 수 있어요.', 'phone');
        fail('이미 사용 중인 닉네임이에요.', 'nickname');
      }
      throw e;
    }
  }
  const db = await fdb();
  const row = Object.assign({ id: ++db.seq, created_at: new Date().toISOString() }, u);
  db.users.push(row); await fsave();
  return row;
}

/* ---------- password & session ---------- */
async function hashPw(pw) {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}
async function checkPw(pw, stored) {
  const [, s, k] = String(stored).split('$');
  if (!s || !k) return false;
  const key = await scrypt(pw, Buffer.from(s, 'base64'), 64);
  const want = Buffer.from(k, 'base64');
  return want.length === key.length && timingSafeEqual(want, key);
}
const sign = v => createHmac('sha256', SECRET).update(v).digest('base64url');
export function sessionCookie(user, secure) {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  const payload = Buffer.from(JSON.stringify({ id: user.id, n: user.nickname, a: user.admin ? 1 : 0, exp })).toString('base64url');
  return `sid=${payload}.${sign(payload)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? '; Secure' : ''}`;
}
export const clearCookie = secure => `sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
export function userFromReq(req) {
  const m = /(?:^|;\s*)sid=([^;]+)/.exec(req.headers.cookie || '');
  if (!m) return null;
  const [payload, sig] = m[1].split('.');
  if (!payload || !sig) return null;
  const good = sign(payload);
  if (good.length !== sig.length || !timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!s.exp || s.exp < Date.now()) return null;
    return { id: s.id, nickname: s.n, admin: !!s.a };
  } catch { return null; }
}

/* ---------- signup / login ---------- */
export async function nicknameAvailable(n) {
  if (ACCOUNTS_DISABLED) return { available: false, reason: '회원 기능을 준비하고 있어요.' };
  n = String(n || '').trim();
  if (!NICK_RE.test(n)) return { available: false, reason: '닉네임은 2~10자의 한글·영문·숫자·밑줄(_)만 쓸 수 있어요.' };
  return (await findUser('nickname', n)) ? { available: false, reason: '이미 사용 중인 닉네임이에요.' } : { available: true };
}
export async function signup(b) {
  if (ACCOUNTS_DISABLED) fail('회원 기능을 준비하고 있어요. 지금은 로그인 없이 게임을 할 수 있어요.', null, 503);
  const nickname = String(b.nickname || '').trim(), name = String(b.name || '').trim(), phone = phoneDigits(b.phone), pw = b.password;
  if (!NICK_RE.test(nickname)) fail('닉네임은 2~10자의 한글·영문·숫자·밑줄(_)만 쓸 수 있어요.', 'nickname');
  if (!nameOk(name)) fail('이름을 2~20자로 입력하세요.', 'name');
  if (!phoneOk(phone)) fail('휴대폰 번호를 정확히 입력하세요. 예: 010-1234-5678', 'phone');
  if (!pwOk(pw)) fail('비밀번호는 영문, 숫자, 특수문자를 하나 이상 넣어 8자 이상으로 만드세요.', 'password');
  if (pw !== b.password2) fail('비밀번호 확인이 일치하지 않아요.', 'password2');
  if (!b.agree) fail('개인정보 수집·이용에 동의해야 가입할 수 있어요.', 'agree');
  if (await findUser('nickname', nickname)) fail('이미 사용 중인 닉네임이에요.', 'nickname');
  if (await findUser('phone', phone)) fail('이미 가입된 전화번호예요. 전화번호 하나당 계정은 하나만 만들 수 있어요.', 'phone');
  const row = await insertUser({ nickname, name, phone, pw_hash: await hashPw(pw) });
  logEvent(row.id, '_login', b.device).catch(e => console.error('login log failed', e.message));
  return { id: row.id, nickname: row.nickname, admin: isAdminPhone(phone) };
}
/* ---------- 내 정보 보기·수정 ---------- */
async function userById(id) {
  if (usingSupabase) { const rows = await sb(`match_users?select=id,nickname,name,phone,pw_hash&id=eq.${Number(id)}&limit=1`); return rows[0] || null; }
  return (await fdb()).users.find(u => u.id === id) || null;
}
async function patchUser(id, patch) {
  if (usingSupabase) {
    try { return (await sb(`match_users?id=eq.${Number(id)}`, { method: 'PATCH', body: patch }))[0]; }
    catch (e) {
      if (e.code === '23505') {
        const msg = String(e.details && (e.details.details || e.details.message) || '');
        if (msg.includes('phone')) fail('이미 다른 계정에서 쓰는 전화번호예요.', 'phone');
        fail('이미 사용 중인 닉네임이에요.', 'nickname');
      }
      throw e;
    }
  }
  const db = await fdb(); const u = db.users.find(x => x.id === id);
  Object.assign(u, patch); await fsave(); return u;
}
export async function getProfile(user) {
  const u = user && await userById(user.id);
  if (!u) fail('로그인이 필요해요.', null, 401);
  return { nickname: u.nickname, name: u.name, phone: u.phone };
}
// 닉네임·이름은 바로 바꿀 수 있고, 전화번호·비밀번호를 바꿀 때는 지금 비밀번호를 확인함
export async function updateProfile(user, b) {
  const u = user && await userById(user.id);
  if (!u) fail('로그인이 필요해요.', null, 401);
  const patch = {};
  const nickname = b.nickname == null ? u.nickname : String(b.nickname).trim();
  const name = b.name == null ? u.name : String(b.name).trim();
  const phone = b.phone == null ? u.phone : phoneDigits(b.phone);
  const newPw = b.newPassword ? String(b.newPassword) : '';
  if (nickname !== u.nickname) {
    if (!NICK_RE.test(nickname)) fail('닉네임은 2~10자의 한글·영문·숫자·밑줄(_)만 쓸 수 있어요.', 'nickname');
    const other = await findUser('nickname', nickname);
    if (other && other.id !== u.id) fail('이미 사용 중인 닉네임이에요.', 'nickname');
    patch.nickname = nickname;
  }
  if (name !== u.name) { if (!nameOk(name)) fail('이름을 2~20자로 입력하세요.', 'name'); patch.name = name; }
  if (phone !== u.phone) {
    if (!phoneOk(phone)) fail('휴대폰 번호를 정확히 입력하세요. 예: 010-1234-5678', 'phone');
    const other = await findUser('phone', phone);
    if (other && other.id !== u.id) fail('이미 다른 계정에서 쓰는 전화번호예요.', 'phone');
    patch.phone = phone;
  }
  if (newPw) {
    if (!pwOk(newPw)) fail('새 비밀번호는 영문, 숫자, 특수문자를 하나 이상 넣어 8자 이상으로 만드세요.', 'newPassword');
    if (newPw !== b.newPassword2) fail('새 비밀번호 확인이 일치하지 않아요.', 'newPassword2');
  }
  if (patch.phone || newPw) {
    const key = 'pw:' + u.id, a = attempts.get(key);
    if (a && a.until > Date.now()) fail('비밀번호를 5번 틀려서 5분 동안 잠겼어요. 잠시 뒤 다시 시도하세요.', 'currentPassword', 429);
    if (!b.currentPassword) fail('전화번호나 비밀번호를 바꾸려면 지금 비밀번호를 입력하세요.', 'currentPassword');
    if (!(await checkPw(String(b.currentPassword), u.pw_hash))) {
      const n = (a && !(a.until && a.until <= Date.now()) ? a.n : 0) + 1;
      attempts.set(key, { n, until: n >= 5 ? Date.now() + 5 * 60000 : 0 });
      fail('지금 비밀번호가 맞지 않아요.', 'currentPassword', 401);
    }
    attempts.delete(key);
  }
  if (newPw) patch.pw_hash = await hashPw(newPw);
  if (!Object.keys(patch).length) fail('바뀐 내용이 없어요.');
  const row = await patchUser(u.id, patch);
  roleCache.delete(u.id);
  const fresh = row || Object.assign({}, u, patch);
  return { id: u.id, nickname: fresh.nickname, admin: isAdminPhone(fresh.phone), changed: Object.keys(patch).map(k => k === 'pw_hash' ? 'password' : k) };
}

const attempts = new Map(); // 로그인 실패 5번이면 5분 잠금
export async function login(b) {
  if (ACCOUNTS_DISABLED) fail('회원 기능을 준비하고 있어요. 지금은 로그인 없이 게임을 할 수 있어요.', null, 503);
  const id = String(b.id || '').trim(), pw = String(b.password || '');
  if (!id || !pw) fail('전화번호와 비밀번호를 입력하세요.');
  const key = id.toLowerCase();
  const a = attempts.get(key);
  if (a && a.until > Date.now()) fail('로그인을 5번 틀려서 5분 동안 잠겼어요. 잠시 뒤 다시 시도하세요.', null, 429);
  const digits = phoneDigits(id);
  if (!phoneOk(digits) || !/^[\d\-\s]+$/.test(id)) fail('휴대폰 번호로 로그인하세요. 예: 010-1234-5678', 'id');
  const user = await findUser('phone', digits);
  if (!user || !(await checkPw(pw, user.pw_hash))) {
    const n = (a && !(a.until && a.until <= Date.now()) ? a.n : 0) + 1; // 잠금이 풀린 뒤에는 처음부터 다시 셈
    attempts.set(key, { n, until: n >= 5 ? Date.now() + 5 * 60000 : 0 });
    fail('전화번호나 비밀번호가 맞지 않아요.', null, 401);
  }
  attempts.delete(key);
  logEvent(user.id, '_login', b.device).catch(e => console.error('login log failed', e.message));
  return { id: user.id, nickname: user.nickname, admin: isAdminPhone(user.phone) };
}

// 관리자 표시가 없는 예전 로그인 쿠키도 한 번 확인해 줌 (전화번호를 다시 조회)
const roleCache = new Map(); // id -> { admin, owner }
async function rolesOf(id) {
  if (roleCache.has(id)) return roleCache.get(id);
  const row = await findUser('id', id);
  const r = { admin: !!(row && isAdminPhone(row.phone)), owner: !!(row && isOwnerPhone(row.phone)) };
  roleCache.set(id, r);
  return r;
}
export async function refreshAdmin(user) {
  if (!user) return user;
  const r = await rolesOf(user.id);
  return Object.assign({}, user, { admin: user.admin || r.admin, owner: r.owner });
}

/* ---------- 접속 기록 (대표 계정이 봄) ---------- */
const lastVisit = new Map();
const cleanDevice = d => String(d || '').slice(0, 40);
async function logEvent(userId, kind, device) {
  const row = { user_id: userId, game: kind, mode: 'event', level: null, result: { device: cleanDevice(device) } };
  if (usingSupabase) { await sb('match_history', { method: 'POST', body: row, prefer: 'return=minimal' }); return; }
  const db = await fdb();
  db.history.push(Object.assign({ id: ++db.seq, played_at: new Date().toISOString() }, row));
  await fsave();
}
// 로그인을 유지한 채 다시 들어온 것도 접속으로 남김 (한 사람당 3시간에 한 번)
export function noteVisit(user, device) {
  if (!user) return;
  const t = Date.now();
  if (t - (lastVisit.get(user.id) || 0) < 3 * 3600 * 1000) return;
  lastVisit.set(user.id, t);
  logEvent(user.id, '_visit', device).catch(e => console.error('visit log failed', e.message));
}
export async function isOwner(user) {
  if (!user) return false;
  return (await rolesOf(user.id)).owner;
}
export async function ownerOverview() {
  let users, events, plays;
  if (usingSupabase) {
    users = await sb('match_users?select=id,nickname,name,phone,created_at&order=created_at.desc&limit=5000');
    events = await sb(`match_history?select=user_id,game,result,played_at&game=in.(_login,_visit)&order=played_at.desc&limit=1000`);
    plays = await sb(`match_history?select=user_id,game,played_at&game=not.in.(${EVENT_GAMES.join(',')})&order=played_at.desc&limit=10000`);
  } else {
    const db = await fdb();
    users = db.users.slice().sort((a, b) => b.id - a.id);
    const h = db.history.slice().sort((a, b) => b.id - a.id);
    events = h.filter(x => x.game === '_login' || x.game === '_visit').slice(0, 1000);
    plays = h.filter(x => !EVENT_GAMES.includes(x.game));
  }
  users = users.filter(u => u.nickname !== VISITOR_NICK);
  const byId = new Map(users.map(u => [u.id, u]));
  const stat = new Map();
  for (const u of users) stat.set(u.id, { games: 0, byGame: {}, lastPlay: null, lastSeen: null, logins: 0 });
  for (const p of plays) { const st = stat.get(p.user_id); if (!st) continue; st.games++; st.byGame[p.game] = (st.byGame[p.game] || 0) + 1; if (!st.lastPlay) st.lastPlay = p.played_at; }
  for (const e of events) { const st = stat.get(e.user_id); if (!st) continue; if (!st.lastSeen) st.lastSeen = e.played_at; if (e.game === '_login') st.logins++; }
  return {
    users: users.map(u => Object.assign({ id: u.id, nickname: u.nickname, name: u.name, phone: u.phone, created_at: u.created_at, admin: isAdminPhone(u.phone), owner: isOwnerPhone(u.phone) }, stat.get(u.id))),
    events: events.filter(e => byId.has(e.user_id)).map(e => ({ nickname: byId.get(e.user_id).nickname, name: byId.get(e.user_id).name, kind: e.game === '_login' ? 'login' : 'visit', device: (e.result && e.result.device) || '', at: e.played_at })),
    visitors: await visitorSummary(byId)
  };
}

/* ---------- 방문자 집계 (회원·비회원 모두) ----------
   브라우저마다 무작위 번호(vid 쿠키)를 하나 주고, 페이지를 연 기록을 '_pv' 로 남김. 이름·전화번호 같은 개인정보는 저장하지 않음.
   같은 브라우저가 같은 날 같은 페이지를 다시 열면 한 번만 셈. */
const VISITOR_NICK = '__visitors';
const pvSeen = new Set(); let pvDay = '';
const kstDay = t => new Date(t + 9 * 3600 * 1000).toISOString().slice(0, 10);
let visitorUid; // 비회원 기록을 붙일 자리 (user_id 가 비어 있으면 안 되는 DB일 때만 씀)
async function visitorUserId() {
  if (visitorUid) return visitorUid;
  const u = await findUser('nickname', VISITOR_NICK);
  visitorUid = u ? u.id : (await insertUser({ nickname: VISITOR_NICK, name: '방문자 집계', phone: '00000000000', pw_hash: '!' })).id;
  return visitorUid;
}
export async function logPageView(vid, user, page, device, region) {
  if (ACCOUNTS_DISABLED || !vid || !page) return;
  const day = kstDay(Date.now());
  if (day !== pvDay) { pvSeen.clear(); pvDay = day; }
  const key = vid + '|' + page;
  if (pvSeen.has(key)) return;
  pvSeen.add(key);
  const row = { user_id: user ? user.id : null, game: '_pv', mode: 'event', level: null, result: { vid: String(vid).slice(0, 40), page, device: cleanDevice(device), member: !!user, region: String(region || '').slice(0, 40) } };
  if (usingSupabase) {
    if (!row.user_id && visitorUid) row.user_id = visitorUid;
    try { await sb('match_history', { method: 'POST', body: row, prefer: 'return=minimal' }); }
    catch (e) { if (row.user_id) throw e; row.user_id = await visitorUserId(); await sb('match_history', { method: 'POST', body: row, prefer: 'return=minimal' }); }
    return;
  }
  const db = await fdb();
  db.history.push(Object.assign({ id: ++db.seq, played_at: new Date().toISOString() }, row));
  await fsave();
}
/* ---------- 비회원 무료 1판 (게임마다) ----------
   비회원은 브라우저 번호(vid)마다 게임별로 한 판(playId 하나)만 무료. 같은 판을 이어서 하는 건 계속 허용.
   기록은 match_history 에 '_free' 로 남김 (개인정보 없음). */
export const FREE_GAMES = ['auction', 'auction-ai', 'blackwhite', 'blackwhite-online', 'slither', 'wallgo1', 'wallgo', 'heavy13', 'horse', 'mines', 'dinner'];
const freeCache = new Map(); // vid|game -> playId
export async function freePlay(vid, game, playId) {
  if (ACCOUNTS_DISABLED) return { ok: true };
  if (!FREE_GAMES.includes(game)) return { ok: true };
  vid = String(vid).slice(0, 40); playId = String(playId || '').slice(0, 40) || 'x';
  const key = vid + '|' + game;
  let used = freeCache.get(key);
  if (used === undefined) {
    if (usingSupabase) {
      const rows = await sb(`match_history?select=result&game=eq._free&result->>vid=eq.${encodeURIComponent(vid)}&result->>game=eq.${encodeURIComponent(game)}&limit=1`);
      used = rows[0] ? rows[0].result.play : null;
    } else {
      const r = (await fdb()).history.find(x => x.game === '_free' && x.result && x.result.vid === vid && x.result.game === game);
      used = r ? r.result.play : null;
    }
    if (used) freeCache.set(key, used);
  }
  if (used) return { ok: used === playId, first: false };
  freeCache.set(key, playId);
  const row = { user_id: null, game: '_free', mode: 'event', level: null, result: { vid, game, play: playId } };
  try {
    if (usingSupabase) {
      if (visitorUid) row.user_id = visitorUid;
      try { await sb('match_history', { method: 'POST', body: row, prefer: 'return=minimal' }); }
      catch (e) { if (row.user_id) throw e; row.user_id = await visitorUserId(); await sb('match_history', { method: 'POST', body: row, prefer: 'return=minimal' }); }
    } else { const db = await fdb(); db.history.push(Object.assign({ id: ++db.seq, played_at: new Date().toISOString() }, row)); await fsave(); }
  } catch (e) { console.error('free play log failed', e.message); }
  return { ok: true, first: true };
}

async function visitorSummary(byId) {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  let rows;
  if (usingSupabase) rows = await sb(`match_history?select=user_id,result,played_at&game=eq._pv&played_at=gte.${since}&order=played_at.desc&limit=20000`);
  else rows = (await fdb()).history.filter(x => x.game === '_pv' && x.played_at >= since).sort((a, b) => b.id - a.id);
  const now = Date.now(), today = kstDay(now), week = kstDay(now - 6 * 864e5);
  const days = new Map(); // day -> {all:Set, guest:Set, member:Set}
  const pages = new Map(), devices = new Map(), regions = new Map(), weekAll = new Set(), weekGuest = new Set();
  for (const r of rows) {
    const x = r.result || {}; const d = kstDay(Date.parse(r.played_at));
    if (!days.has(d)) days.set(d, { all: new Set(), guest: new Set(), member: new Set() });
    const D = days.get(d); D.all.add(x.vid); (x.member ? D.member : D.guest).add(x.vid);
    if (d >= week) {
      weekAll.add(x.vid); if (!x.member) weekGuest.add(x.vid);
      if (!pages.has(x.page)) pages.set(x.page, new Set()); pages.get(x.page).add(x.vid);
      const dv = (x.device || '기타').split(' · ')[0];
      if (!devices.has(dv)) devices.set(dv, new Set()); devices.get(dv).add(x.vid);
      if (x.region !== undefined) { const rg = x.region || '알 수 없음'; if (!regions.has(rg)) regions.set(rg, new Set()); regions.get(rg).add(x.vid); }
    }
  }
  const dayList = [];
  // 같은 날 로그인 전(비회원)과 후(회원)로 둘 다 잡힌 사람은 회원으로만 셈
  const memberWeek = new Set();
  for (const [d, D] of days) { for (const v of D.member) D.guest.delete(v); if (d >= week) for (const v of D.member) memberWeek.add(v); }
  for (const v of memberWeek) weekGuest.delete(v);
  for (let i = 0; i < 14; i++) { const d = kstDay(now - i * 864e5), D = days.get(d); dayList.push({ day: d, all: D ? D.all.size : 0, guest: D ? D.guest.size : 0, member: D ? D.member.size : 0 }); }
  const T = days.get(today);
  const top = m => [...m].map(([k, v]) => ({ name: k, count: v.size })).sort((a, b) => b.count - a.count);
  return {
    today: { all: T ? T.all.size : 0, guest: T ? T.guest.size : 0, member: T ? T.member.size : 0 },
    week: { all: weekAll.size, guest: weekGuest.size },
    days: dayList, pages: top(pages), devices: top(devices), regions: top(regions),
    recent: rows.slice(0, 150).map(r => ({ at: r.played_at, page: r.result && r.result.page, device: r.result && r.result.device, region: r.result && r.result.region, nickname: r.result && r.result.member && byId.get(r.user_id) ? byId.get(r.user_id).nickname : null }))
  };
}

/* ---------- 슬리더링크 도전장 ----------
   혼자 푼 판을 링크로 공유하면, 누구든 같은 판을 풀어 그 판 순위표에 기록을 남김(한 사람당 첫 기록만).
   판: match_history '_chal' (출제자 user_id), 기록: '_chalrec' (도전자 user_id). 시간은 서버가 시작~정답 확인까지 잼. */
const CHAL_SIZES = [5, 7, 10, 15];
const chalCache = new Map();
const CHAL_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
async function historyRows(game, code) {
  if (usingSupabase) return sb(`match_history?select=user_id,result,played_at&game=eq.${game}&result->>code=eq.${encodeURIComponent(code)}&order=played_at.asc&limit=2000`);
  return (await fdb()).history.filter(h => h.game === game && h.result && h.result.code === code).sort((a, b) => a.id - b.id);
}
async function insertRow(row) {
  if (usingSupabase) { await sb('match_history', { method: 'POST', body: row, prefer: 'return=minimal' }); return; }
  const db = await fdb(); db.history.push(Object.assign({ id: ++db.seq, played_at: new Date().toISOString() }, row)); await fsave();
}
async function namesOf(ids) {
  ids = [...new Set(ids.filter(Boolean).map(Number))];
  const out = new Map(); if (!ids.length) return out;
  if (usingSupabase) { for (const u of await sb(`match_users?select=id,nickname&id=in.(${ids.join(',')})`)) out.set(u.id, u.nickname); }
  else for (const u of (await fdb()).users) if (ids.includes(u.id)) out.set(u.id, u.nickname);
  return out;
}
export async function getChallenge(code) {
  code = String(code || '').toUpperCase();
  if (!/^[A-Z0-9]{5}$/.test(code)) fail('없는 도전장이에요.');
  if (chalCache.has(code)) return chalCache.get(code);
  const r = (await historyRows('_chal', code))[0];
  if (!r) fail('없는 도전장이에요. 링크를 확인하세요.');
  const c = { code, n: r.result.n, clues: r.result.clues, diff: r.result.diff, creator: r.user_id, at: Date.parse(r.played_at) };
  chalCache.set(code, c); return c;
}
export async function createChallenge(user, b) {
  if (!user) fail('로그인하면 도전장을 보낼 수 있어요.');
  const n = Number(b.n), clues = String(b.clues || '');
  if (!CHAL_SIZES.includes(n) || clues.length !== n * n || !/^[.0-3]+$/.test(clues)) fail('공유할 수 없는 판이에요.');
  // 같은 사람이 같은 판을 또 공유하면 원래 링크를 돌려줌
  for (const c of chalCache.values()) if (c.creator === user.id && c.clues === clues) return { code: c.code };
  if (usingSupabase) {
    const old = await sb(`match_history?select=result&game=eq._chal&user_id=eq.${Number(user.id)}&result->>clues=eq.${clues.replace(/\./g, '%2E')}&limit=1`).catch(() => []);
    if (old[0]) return { code: old[0].result.code };
  } else { const old = (await fdb()).history.find(h => h.game === '_chal' && h.user_id === user.id && h.result.clues === clues); if (old) return { code: old.result.code }; }
  let code;
  for (let k = 0; k < 20; k++) { code = Array.from({ length: 5 }, () => CHAL_ABC[randomInt(CHAL_ABC.length)]).join(''); if (!(await historyRows('_chal', code)).length) break; }
  const diff = [0, 1, 2, 3].includes(b.diff) ? b.diff : null;
  await insertRow({ user_id: user.id, game: '_chal', mode: 'event', level: null, result: { code, n, clues, diff } });
  chalCache.set(code, { code, n, clues, diff, creator: user.id, at: Date.now() });
  // 출제자 본인 기록(혼자 풀 때 잰 시간)
  const status = b.result === 'solved' ? 'solved' : 'gaveup';
  const time = status === 'solved' ? Math.max(0, Math.min(86400000, Math.floor(Number(b.time) || 0))) : null;
  await insertRow({ user_id: user.id, game: '_chalrec', mode: 'event', level: null, result: { code, status, time } });
  return { code };
}
export async function challengeBoard(code, user, reveal) {
  const c = await getChallenge(code);
  const rows = await historyRows('_chalrec', c.code);
  const first = new Map();
  for (const r of rows) if (!first.has(r.user_id)) first.set(r.user_id, { uid: r.user_id, status: r.result.status, time: r.result.time, at: Date.parse(r.played_at) });
  const names = await namesOf([...first.keys(), c.creator]);
  const recs = [...first.values()].sort((a, b) => (a.status === 'solved' ? 0 : 1) - (b.status === 'solved' ? 0 : 1) || (a.time ?? 0) - (b.time ?? 0) || a.at - b.at);
  let rank = 0;
  const list = recs.map(r => ({ name: names.get(r.uid) || '탈퇴한 회원', status: r.status, time: r.time, rank: r.status === 'solved' ? ++rank : null, me: !!(user && r.uid === user.id), creator: r.uid === c.creator }));
  const mine = list.find(x => x.me) || null;
  // 다른 사람 기록(출제자 포함)은 내가 이 판을 끝낸 뒤에만 보여 줌 — 미리 보고 맞춰 풀지 못하게
  const open = !!(mine || reveal);
  return { code: c.code, n: c.n, creator: names.get(c.creator) || '탈퇴한 회원', total: list.length, solved: rank, open, list: open ? list : [], mine, diff: open ? c.diff : null };
}
export async function recordChallenge(user, code, status, time) {
  const c = await getChallenge(code);
  const rows = await historyRows('_chalrec', c.code);
  if (rows.some(r => r.user_id === user.id)) return false; // 첫 기록만
  await insertRow({ user_id: user.id, game: '_chalrec', mode: 'event', level: null, result: { code: c.code, status, time } });
  await addHistory(user.id, { game: 'slither', mode: 'challenge', level: null, size: c.n, result: status, time, diff: c.diff, clues: c.clues, code: c.code });
  return true;
}

/* ---------- history ---------- */
export async function addHistory(userId, entry) {
  const row = { user_id: userId, game: entry.game, mode: entry.mode, level: entry.level || null, result: entry };
  if (usingSupabase) { await sb('match_history', { method: 'POST', body: row, prefer: 'return=minimal' }); return; }
  const db = await fdb();
  db.history.push(Object.assign({ id: ++db.seq, played_at: new Date().toISOString() }, row));
  await fsave();
}
export async function listHistory(userId) {
  if (usingSupabase) {
    const rows = await sb(`match_history?select=result,played_at&user_id=eq.${Number(userId)}&game=not.in.(${EVENT_GAMES.join(',')})&order=played_at.desc&limit=300`);
    return rows.map(r => Object.assign({}, r.result, { at: Date.parse(r.played_at) }));
  }
  const db = await fdb();
  return db.history.filter(h => h.user_id === userId && !EVENT_GAMES.includes(h.game)).sort((a, b) => b.id - a.id).slice(0, 300).map(h => Object.assign({}, h.result, { at: Date.parse(h.played_at) }));
}
// 브라우저에서 끝나는 경기(AI 흑과 백, 슬리더링크 혼자 풀기, 벽바둑 Ⅱ)는 화면이 결과를 보내옴 — 모양만 확인해서 저장
export function cleanClientEntry(e, isAdmin) {
  if (!e || typeof e !== 'object') fail('저장할 수 없는 기록이에요.');
  const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(Number(v) || 0)));
  const nm = v => String(v || '').trim().slice(0, 12);
  if (e.game === 'bw' && e.mode === 'ai') {
    const n = v => int(v, 0, 9);
    const result = ['win', 'lose', 'draw'].includes(e.result) ? e.result : null;
    if (!result) fail('저장할 수 없는 기록이에요.');
    return { game: 'bw', mode: 'ai', level: ['low', 'mid', 'high'].includes(e.level) ? e.level : 'mid', result, myWins: n(e.myWins), oppWins: n(e.oppWins), opponent: 'AI', innings: n(e.innings) };
  }
  if (e.game === 'slither' && e.mode === 'solo') {
    const size = [5, 7, 10, 15].includes(Number(e.size)) ? Number(e.size) : null;
    const result = ['solved', 'gaveup'].includes(e.result) ? e.result : null;
    if (!size || !result) fail('저장할 수 없는 기록이에요.');
    const diff = [0, 1, 2, 3].includes(e.diff) ? e.diff : null;
    const clues = typeof e.clues === 'string' && e.clues.length === size * size && /^[.0-3]+$/.test(e.clues) ? e.clues : null; // 다시 풀기용 문제
    return { game: 'slither', mode: 'solo', level: null, size, result, time: result === 'solved' ? int(e.time, 0, 86400000) : null, diff, clues, replay: !!e.replay };
  }
  if ((e.game === 'wallgo' || e.game === 'wallgo1') && ['online', 'local'].includes(e.mode)) {
    const total = int(e.total, 2, 4);
    const players = (Array.isArray(e.players) ? e.players : []).slice(0, 4).map(p => ({ name: nm(p && p.name), ai: !!(p && p.ai), score: int(p && p.score, 0, 49), rank: int(p && p.rank, 1, 4), me: !!(p && p.me) }));
    const rank = int(e.rank, 1, total);
    return { game: e.game, mode: e.mode, level: ['easy', 'normal', 'hard'].includes(e.level) ? e.level : null, result: rank === 1 ? 'win' : 'lose', rank, total, score: int(e.score, 0, 49), best: int(e.best, 0, 49), players };
  }
  fail('저장할 수 없는 기록이에요.');
}
