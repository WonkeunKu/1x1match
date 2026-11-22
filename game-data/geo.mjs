// 접속 지역(나라 · 시도)을 IP로 대략 알아냄. 외부 서비스에 보내지 않고 서버에 넣어 둔 표에서 찾음.
// 표: DB-IP IP to City Lite (CC BY 4.0, https://db-ip.com) 를 나라 단위 + 한국은 시도 단위로 줄인 것.
// IP 주소는 저장하지 않고, 찾은 지역 이름만 방문 기록에 남김.
import { readFileSync } from 'node:fs';

let V4 = null, V6 = null, LABELS = [];
try {
  const b4 = readFileSync(new URL('./geo-ipv4.bin', import.meta.url));
  const n4 = b4.readUInt32LE(0);
  V4 = { n: n4, s: new Uint32Array(b4.buffer.slice(b4.byteOffset + 4, b4.byteOffset + 4 + n4 * 4)), c: new Uint16Array(b4.buffer.slice(b4.byteOffset + 4 + n4 * 4, b4.byteOffset + 4 + n4 * 6)) };
  const b6 = readFileSync(new URL('./geo-ipv6.bin', import.meta.url));
  const n6 = b6.readUInt32LE(0);
  V6 = { n: n6, s: new BigUint64Array(b6.buffer.slice(b6.byteOffset + 4, b6.byteOffset + 4 + n6 * 8)), c: new Uint16Array(b6.buffer.slice(b6.byteOffset + 4 + n6 * 8, b6.byteOffset + 4 + n6 * 10)) };
  LABELS = JSON.parse(readFileSync(new URL('./geo-labels.json', import.meta.url), 'utf8'));
} catch (e) { console.error('geo data not loaded', e.message); }

let names = null;
try { names = new Intl.DisplayNames(['ko'], { type: 'region' }); } catch {}
const country = cc => { try { return (names && names.of(cc)) || cc; } catch { return cc; } };

function find(T, x) { // x 이하인 가장 큰 시작점
  let lo = 0, hi = T.n - 1, ans = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (T.s[m] <= x) { ans = m; lo = m + 1; } else hi = m - 1; }
  return ans < 0 ? 0 : T.c[ans];
}
function v4num(ip) { const p = ip.split('.'); if (p.length !== 4) return null; let n = 0; for (const x of p) { const v = Number(x); if (!(v >= 0 && v <= 255) || x === '') return null; n = n * 256 + v; } return n; }
function v6top(ip) { // 앞 64비트
  if (ip.includes('.')) return null;
  let [a, b] = ip.split('::'); if (ip.split('::').length > 2) return null;
  const A = a ? a.split(':') : [], B = b !== undefined ? (b ? b.split(':') : []) : null;
  const parts = B ? [...A, ...Array(8 - A.length - B.length).fill('0'), ...B] : A;
  if (parts.length !== 8) return null;
  let v = 0n; for (let i = 0; i < 4; i++) { const h = parseInt(parts[i] || '0', 16); if (!(h >= 0 && h <= 0xffff)) return null; v = (v << 16n) | BigInt(h); }
  return v;
}
// '한국 · 서울', '미국', '' (모름)
export function regionOf(ip) {
  if (!ip || !V4) return '';
  ip = String(ip).trim().replace(/^::ffff:/i, '');
  let code = 0;
  const n = v4num(ip);
  if (n != null) code = find(V4, n);
  else { const t = v6top(ip); if (t == null || !V6) return ''; code = find(V6, t); }
  const l = LABELS[code] || '';
  if (!l) return '';
  if (l.startsWith('KR:')) return '한국' + (l.slice(3) ? ' · ' + l.slice(3) : '');
  return country(l);
}
export function clientIp(req) {
  const h = req.headers;
  const xf = String(h['x-forwarded-for'] || '').split(',')[0].trim();
  return String(h['cf-connecting-ip'] || h['true-client-ip'] || xf || (req.socket && req.socket.remoteAddress) || '').trim();
}
