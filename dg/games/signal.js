// 수식 신호등 (데블스 플랜 시즌3 결승 3회전) — 9칸 수식을 몰래 만들고, 색 힌트(빨강·노랑·초록)로 상대 수식을 먼저 맞히면 승리 (Nerdle 대결)
(function () {
  const L = 9;
  const DIG = '0123456789'.split(''), OPS = ['+', '-', '×', '÷', '^'], SYM = [...OPS, '='];
  const CH = [...DIG, ...SYM];
  const isD = c => c >= '0' && c <= '9';
  const rnd = n => Math.floor(Math.random() * n);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- 정확한 계산 (분수, BigInt) ----------
  const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
  const Q = (n, d = 1n) => { if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; };
  const add = (a, b) => Q(a.n * b.d + b.n * a.d, a.d * b.d), sub = (a, b) => Q(a.n * b.d - b.n * a.d, a.d * b.d);
  const mul = (a, b) => Q(a.n * b.n, a.d * b.d), div = (a, b) => b.n === 0n ? null : Q(a.n * b.d, a.d * b.n);
  function pow(a, b) { // b는 0 이상 정수만
    if (b.d !== 1n || b.n < 0n) return null;
    if (a.n === 0n && b.n === 0n) return null;
    if (b.n > 4000n && !(a.n === 0n || (a.n === 1n && a.d === 1n))) return null; // 너무 큰 수
    return Q(a.n ** b.n, a.d ** b.n);
  }
  // 문자열 식(=없는 한 쪽) 계산. 문법이 틀리면 null
  function evalSide(s) {
    if (!s.length || !isD(s[0]) || !isD(s[s.length - 1])) return null;
    const nums = [], ops = []; let cur = '';
    for (const c of s) {
      if (isD(c)) cur += c;
      else { if (!cur) return null; if (cur.length > 1 && cur[0] === '0') return null; nums.push(Q(BigInt(cur))); ops.push(c); cur = ''; }
    }
    if (cur.length > 1 && cur[0] === '0') return null; nums.push(Q(BigInt(cur)));
    let n = nums.slice(), o = ops.slice();
    for (let i = o.length - 1; i >= 0; i--) if (o[i] === '^') { const v = pow(n[i], n[i + 1]); if (!v) return null; n.splice(i, 2, v); o.splice(i, 1); }
    const n2 = [n[0]], o2 = [];
    for (let i = 0; i < o.length; i++) {
      if (o[i] === '×') n2[n2.length - 1] = mul(n2[n2.length - 1], n[i + 1]);
      else if (o[i] === '÷') { const v = div(n2[n2.length - 1], n[i + 1]); if (!v) return null; n2[n2.length - 1] = v; }
      else { n2.push(n[i + 1]); o2.push(o[i]); }
    }
    let v = n2[0]; for (let i = 0; i < o2.length; i++) v = o2[i] === '+' ? add(v, n2[i + 1]) : sub(v, n2[i + 1]);
    return v;
  }
  // 올바른 수식인지: 9칸, 기호 연속 금지, 처음·끝은 숫자, '=' 1개 이상, 모든 변의 값이 같음
  function check(eq) {
    const s = Array.isArray(eq) ? eq : [...eq];
    if (s.length !== L) return '9칸을 모두 채워야 해요';
    if (s.some(c => !CH.includes(c))) return '숫자 0~9와 + - × ÷ = ^ 만 쓸 수 있어요';
    if (!s.includes('=')) return '= 가 있어야 해요';
    if (!isD(s[0]) || !isD(s[L - 1])) return '처음과 끝은 숫자여야 해요';
    for (let i = 1; i < L; i++) if (!isD(s[i]) && !isD(s[i - 1])) return '기호를 연달아 쓸 수 없어요';
    const sides = s.join('').split('=');
    let v0 = null;
    for (const side of sides) {
      for (const num of side.split(/[+\-×÷^]/)) if (num.length > 1 && num[0] === '0') return '두 자리 이상 숫자는 0으로 시작할 수 없어요';
      const v = evalSide(side); if (!v) return '계산할 수 없는 식이에요(0으로 나누기 등)';
      if (v0 && (v.n !== v0.n || v.d !== v0.d)) return '양쪽 값이 같지 않아요';
      v0 = v;
    }
    return '';
  }
  // 색: 2 초록(자리까지 맞음) 1 노랑(있지만 자리 다름) 0 빨강(없음). 같은 글자 개수까지 따짐
  function feedback(secret, guess) {
    const out = Array(L).fill(0), left = {};
    for (let i = 0; i < L; i++) if (guess[i] === secret[i]) out[i] = 2; else left[secret[i]] = (left[secret[i]] || 0) + 1;
    for (let i = 0; i < L; i++) if (out[i] !== 2 && left[guess[i]] > 0) { out[i] = 1; left[guess[i]]--; }
    return out;
  }

  // ---------- 후보 찾기 ----------
  // hist: [{g:[..], f:[..]}] 에서 자리별 허용 글자와 글자 개수 범위
  function constraints(hist) {
    const allow = Array.from({ length: L }, () => new Set(CH)), min = {}, max = {};
    for (const { g, f } of hist) {
      const cnt = {}, hasRed = {};
      for (let i = 0; i < L; i++) {
        if (f[i] === 2) allow[i] = new Set([g[i]]);
        else allow[i].delete(g[i]);
        if (f[i] > 0) cnt[g[i]] = (cnt[g[i]] || 0) + 1; else hasRed[g[i]] = true;
      }
      for (const c in cnt) min[c] = Math.max(min[c] || 0, cnt[c]);
      for (const c in hasRed) max[c] = Math.min(max[c] ?? 99, cnt[c] || 0);
    }
    for (let i = 0; i < L; i++) for (const c of [...allow[i]]) if (max[c] === 0) allow[i].delete(c);
    return { allow, min, max };
  }
  const consistent = (eq, hist) => hist.every(({ g, f }) => feedback(eq, g).every((x, i) => x === f[i]));
  // 조건에 맞는 수식을 무작위 순서로 찾음. 수식 모양: [식]=[숫자] 또는 [숫자]=[식] 을 먼저, 모자라면 양쪽 모두 식
  function findCandidates(hist, want, budget) {
    const { allow, min, max } = constraints(hist);
    const found = new Set(), out = [];
    let steps = 0;
    const counts = {};
    const okCountsFinal = s => { const c = {}; s.forEach(x => c[x] = (c[x] || 0) + 1); for (const k in min) if ((c[k] || 0) < min[k]) return false; for (const k in max) if ((c[k] || 0) > max[k]) return false; return true; };
    const push = s => { const k = s.join(''); if (found.has(k)) return; if (!okCountsFinal(s) || check(s) || !consistent(s, hist)) return; found.add(k); out.push(s.slice()); };
    // 위치 a..b-1 에 들어갈 식을 무작위 DFS로 만들며 cb(문자열) 호출
    function exprDFS(a, b, cb) {
      const s = [];
      (function g(i, lastOp, numLen, lead0) {
        if (out.length >= want || ++steps > budget) return;
        if (i === b) { if (!lastOp) cb(s); return; }
        const opts = shuffle([...allow[i]].filter(c => c !== '='));
        for (const c of opts) {
          if ((max[c] ?? 99) <= (counts[c] || 0)) continue;
          if (isD(c)) { if (numLen === 1 && lead0) continue; }
          else { if (lastOp || i === a || i === b - 1) continue; }
          counts[c] = (counts[c] || 0) + 1; s.push(c);
          if (isD(c)) g(i + 1, false, numLen + 1, numLen === 0 ? c === '0' : lead0); else g(i + 1, true, 0, false);
          s.pop(); counts[c]--;
          if (out.length >= want || steps > budget) return;
        }
      })(a, true, 0, false);
    }
    const eqPos = shuffle([...Array(L).keys()].filter(i => i > 0 && i < L - 1 && allow[i].has('=')));
    // 1) 식 = 숫자
    for (const k of eqPos) {
      if (out.length >= want || steps > budget) break;
      counts['='] = 1;
      exprDFS(0, k, left => {
        const v = evalSide(left.join('')); if (!v || v.d !== 1n || v.n < 0n) return;
        const r = v.n.toString(); if (r.length !== L - 1 - k) return;
        const s = [...left, '=', ...r]; push(s);
      });
      // 2) 숫자 = 식
      exprDFS(k + 1, L, right => {
        const v = evalSide(right.join('')); if (!v || v.d !== 1n || v.n < 0n) return;
        const l = v.n.toString(); if (l.length !== k) return;
        push([...l, '=', ...right]);
      });
      counts['='] = 0;
    }
    // 3) 그래도 없으면 양쪽 모두 식 (예산 안에서)
    if (out.length < Math.min(2, want)) for (const k of eqPos) {
      if (out.length >= want || steps > budget * 2) break;
      counts['='] = 1;
      exprDFS(0, k, left => { const lv = evalSide(left.join('')); if (!lv) return; const save = left.slice();
        exprDFS(k + 1, L, right => { const rv = evalSide(right.join('')); if (rv && rv.n === lv.n && rv.d === lv.d) push([...save, '=', ...right]); }); });
      counts['='] = 0;
    }
    // 4) '='가 둘 이상인 수식 등: 9칸 전체를 조건대로 채워 봄 (예산 안에서)
    if (!out.length && steps <= budget * 2) {
      const s = [];
      (function g(i, lastOp, numLen, lead0) {
        if (out.length >= want || ++steps > budget * 4) return;
        if (i === L) { if (!lastOp) push(s); return; }
        for (const c of shuffle([...allow[i]])) {
          if ((max[c] ?? 99) <= (counts[c] || 0)) continue;
          if (isD(c)) { if (numLen === 1 && lead0) continue; } else if (lastOp || i === 0 || i === L - 1) continue;
          counts[c] = (counts[c] || 0) + 1; s.push(c);
          if (isD(c)) g(i + 1, false, numLen + 1, numLen === 0 ? c === '0' : lead0); else g(i + 1, true, 0, false);
          s.pop(); counts[c]--;
          if (out.length >= want || steps > budget * 4) return;
        }
      })(0, true, 0, false);
    }
    return out;
  }
  // 사람이 봐도 자연스러운 수식: 기호 1~3개, 숫자는 3자리 이하, ×0·^0·^1 같은 꼼수 없이
  const nice = e => { const t = e.join(''); const ops = t.replace(/[0-9=]/g, '').length; return ops >= 1 && ops <= 3 && !/\d{4}/.test(t) && !/(^|[^0-9])0([^0-9]|$)/.test(t) && !/\^(\d\d|1(?!\d))|÷1(?!\d)|×1(?!\d)|(^|[^0-9])1×/.test(t); };
  function randomSecret() { let any = null; for (let t = 0; t < 40; t++) { const c = findCandidates([], 1, 20000); if (!c.length) continue; any = any || c[0]; if (nice(c[0])) return c[0]; } return any || [...'48÷6+2=10']; }
  const OPEN = ['48÷6+2=10', '3^2+15=24', '7×6-12=30', '96÷8-3=9', '15+27=42', '2^5-9=23', '18÷3×7=42'].map(s => [...s]).filter(s => !check(s));

  // AI 다음 추측. lv 0: 최근 힌트 일부만 씀 · 1: 조건에 맞는 후보 중 하나 · 2: 후보들을 가장 잘 나누는 것
  function aiGuess(hist, lv) {
    if (!hist.length) return OPEN[rnd(OPEN.length)].slice();
    // 난이도: 쉬움은 최근 힌트 1~2개만, 보통은 가끔 오래된 힌트를 잊음, 어려움은 전부 기억
    // (사람과 비슷한 속도가 되도록 시뮬레이션으로 맞춤: 어려움 약 4턴, 보통 약 6턴, 쉬움 약 9턴)
    if (Math.random() < [.3, .4, 0][lv]) return randomSecret(); // 감으로 아무 수식이나 던져 봄
    const use = lv === 0 ? hist.slice(-2) : hist;
    const cand = findCandidates(use, lv === 2 ? 40 : 6, lv === 2 ? 120000 : 60000);
    if (!cand.length) return randomSecret();
    if (lv < 2 || cand.length <= 2) return cand[rnd(cand.length)];
    let best = cand[0], bs = 1e9;
    for (const g of cand) { const parts = {}; for (const s of cand) { const k = feedback(s, g).join(''); parts[k] = (parts[k] || 0) + 1; } const score = Object.values(parts).reduce((a, b) => a + b * b, 0); if (score < bs) { bs = score; best = g; } }
    return best;
  }

  // ---------- 1:1 대결 규칙 (AI 대전·온라인 대전 공용, 서버도 불러 씀) ----------
  const fail = m => { throw Object.assign(new Error(m), { duel: true }); };
  const MAXT = 15;
  const DUEL = {
    init() { return { phase: 'secret', secret: [null, null], pending: [null, null], hist: [[], []], turn: 0, winner: -1 }; },
    act(s, seat, a) {
      if (a.type === 'secret') {
        if (s.phase !== 'secret' || s.secret[seat]) fail('지금은 수식을 낼 수 없어요.');
        const eq = [...(a.eq || [])].map(String); const err = check(eq); if (err) fail(err);
        s.secret[seat] = eq; if (s.secret[0] && s.secret[1]) s.phase = 'guess'; return;
      }
      if (a.type === 'guess') {
        if (s.phase !== 'guess' || s.pending[seat]) fail('지금은 추측을 낼 수 없어요.');
        const g = [...(a.g || [])].map(String); if (g.length !== L || g.some(c => !CH.includes(c))) fail('9칸을 숫자와 기호로 채워 주세요.');
        s.pending[seat] = g;
        if (s.pending[0] && s.pending[1]) {
          s.turn++;
          const f = [feedback(s.secret[1], s.pending[0]), feedback(s.secret[0], s.pending[1])];
          s.hist[0].push({ g: s.pending[0], f: f[0] }); s.hist[1].push({ g: s.pending[1], f: f[1] }); s.pending = [null, null];
          const win = f.map(x => x.every(y => y === 2));
          if (win[0] || win[1] || s.turn >= MAXT) { s.phase = 'over'; s.winner = win[0] && win[1] ? 2 : win[0] ? 0 : win[1] ? 1 : 2; }
        }
        return;
      }
      fail('알 수 없는 행동이에요.');
    },
    view(s, seat) {
      const o = 1 - seat;
      return { phase: s.phase, turn: s.turn, mySecret: s.secret[seat], oppReady: !!s.secret[o], oppSecret: s.phase === 'over' ? s.secret[o] : null,
        mine: s.hist[seat], theirs: s.hist[o], waiting: !!s.pending[seat], oppWaiting: !!s.pending[o], winner: s.winner < 0 ? -1 : s.winner === 2 ? 2 : s.winner === seat ? 0 : 1 };
    },
    ai(v, lv) {
      if (v.phase === 'secret' && !v.mySecret) return { type: 'secret', eq: randomSecret() };
      if (v.phase === 'guess' && !v.waiting) return { type: 'guess', g: aiGuess(v.mine, lv) };
      return null;
    },
  };

  const ENG = { L, CH, check, feedback, findCandidates, aiGuess, randomSecret, evalSide, DUEL };
  if (typeof module !== 'undefined' && module.exports) { module.exports = ENG; return; }
  if (typeof LAB === 'undefined') return;

  // ---------- 화면 ----------
  const { h, esc, seg } = LAB;
  LAB.add({
    id: 'signal', name: '수식 신호등', show: '데블스플랜',
    rules: `<ul>
      <li>각자 <b>9칸짜리 수식</b>을 몰래 만들어요. 숫자 0~9와 기호 + - × ÷ = ^ 를 여러 번 써도 되고, 수식은 <b>올바르게 성립</b>해야 해요.</li>
      <li>기호는 연달아 쓸 수 없고, 곱하기를 생략할 수 없어요(제곱 ^ 뒤엔 숫자). 두 자리 이상 숫자는 0으로 시작할 수 없어요. 계산 순서는 ^ → × ÷ → + − 예요.</li>
      <li>매 턴 두 사람이 동시에 상대 수식을 추측해 적어요. 추측은 <b>성립하지 않아도 돼요</b>.</li>
      <li><b>빨강</b>: 그 글자가 상대 수식에 없음 · <b>노랑</b>: 있지만 자리가 다름 · <b>초록</b>: 자리까지 맞음. 같은 글자가 정답보다 많이 쓰이면 넘치는 만큼은 빨강이에요.</li>
      <li>상대 수식을 먼저 맞히면 승리. 같은 턴에 둘 다 맞히면 무승부예요. (이 사이트 버전: 시간 제한 없음, ${MAXT}턴이 지나면 무승부)</li>
      <li>상대는 <b>AI</b> 또는 <b>사람</b>(각자 자기 기기로 같은 방에 들어와 1:1)이에요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      const roomLink = LAB.roomParam();
      let pend = { lv: 1, opp: roomLink ? 'net' : 'ai' }, cfg = { ...pend }, st = null, net = null, input = [], busy = false, lastArgs = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dn-lobby" id="sgLobby" hidden></div>
          <div id="sgGame">
          <div class="dp-score"><div><small>나</small><b id="sgMe">-</b></div><div class="dp-mid"><span id="sgTurn"></span><small id="sgSub"></small></div><div><small id="sgOpN">상대</small><b id="sgAi">-</b></div></div>
          <div class="sg-boards"><div><div class="sg-h" id="sgH1">내 추측 → 상대 수식</div><div class="sg-rows" id="sgMine"></div></div><div><div class="sg-h"><span id="sgH2">상대 추측 → 내 수식</span> <span id="sgMySecret" class="sg-secret"></span></div><div class="sg-rows" id="sgTheirs"></div></div></div>
          <div class="sg-input" id="sgInput"></div>
          <p class="g-msg" id="sgMsg"></p>
          <div class="sg-keys" id="sgKeys"></div>
          <div class="row" id="sgBtns"><button type="button" id="sgDel">지우기</button><button type="button" id="sgRand">무작위 수식</button><button type="button" class="primary" id="sgGo">확인</button></div>
          <div id="sgAgain"></div>
          </div>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정 (새 게임에 적용)</h3>
            <div class="opt"><span>상대</span><div id="sgOpp2"></div></div>
            <div class="opt" id="sgLvOpt"><span>AI 난이도</span><div id="sgLv"></div></div>
            <button type="button" class="primary" id="sgNew">새 게임</button></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('sgOpp2').appendChild(seg([['ai', 'AI'], ['net', '사람 (온라인)']], pend.opp, v => { pend.opp = v; $('sgLvOpt').hidden = v !== 'ai'; }));
      $('sgLvOpt').hidden = pend.opp !== 'ai';
      $('sgLv').appendChild(seg([[0, '쉬움'], [1, '보통'], [2, '어려움']], 1, v => pend.lv = v));
      $('sgNew').onclick = start;
      function start() {
        T.clear(); cfg = { ...pend }; input = []; lastArgs = null;
        if (net) { net.close(); net = null; }
        if (cfg.opp === 'net') {
          $('sgGame').hidden = true;
          net = LAB.duel('signal', { el: $('sgLobby'), onView: v => { if (!v.st) { $('sgGame').hidden = true; return; } net.hideLobby(); $('sgGame').hidden = false; show(v.st, v.opp || '상대', v); }, onError: m => { $('sgMsg').textContent = m; } });
          net.start(); return;
        }
        $('sgLobby').hidden = true; $('sgGame').hidden = false;
        st = DUEL.init(); local(); aiStep();
      }
      const local = () => show(DUEL.view(st, 0), 'AI', null);
      function aiStep() {
        if (!st || st.phase === 'over') return;
        const a = DUEL.ai(DUEL.view(st, 1), cfg.lv);
        if (a) T.set(() => { try { DUEL.act(st, 1, a); } catch (e) { console.error(e); } local(); afterLocal(); }, a.type === 'secret' ? 50 : 400);
      }
      function afterLocal() { if (st.phase === 'over' && !st.ended) { st.ended = true; const w = st.winner; T.set(() => LAB.end(w === 0 ? '승리' : w === 1 ? '패배' : '무승부', w === 0 ? `${st.turn}턴 만에 AI 수식을 맞혔어요` : w === 1 ? `AI가 ${st.turn}턴 만에 내 수식을 맞혔어요. AI 수식은 ${st.secret[1].join('')}` : `무승부 · AI 수식은 ${st.secret[1].join('')}`, start), 900); } }
      async function send(a) {
        if (busy) return '';
        if (net) { busy = true; const e = await net.act(a); busy = false; return e; }
        try { DUEL.act(st, 0, a); } catch (e) { $('sgMsg').textContent = e.message; return e.message; }
        local(); aiStep(); afterLocal(); return '';
      }
      const type = c => { const v = lastArgs && lastArgs[0]; if (!v || v.phase === 'over' || v.waiting || (v.phase === 'secret' && v.mySecret)) return; if (input.length < L) input.push(c); show(...lastArgs); };
      $('sgKeys').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) type(b.dataset.k); });
      $('sgDel').onclick = () => { input.pop(); lastArgs && show(...lastArgs); };
      $('sgRand').onclick = () => { input = randomSecret(); lastArgs && show(...lastArgs); };
      $('sgGo').onclick = async () => {
        const v = lastArgs && lastArgs[0]; if (!v || v.phase === 'over') return;
        if (v.phase === 'secret') { const err = check(input); if (err) { $('sgMsg').textContent = err; return; } const eq = input.slice(); input = []; const e = await send({ type: 'secret', eq }); if (e) input = eq; return; }
        if (input.length !== L) { $('sgMsg').textContent = '9칸을 모두 채워 주세요'; return; }
        const g = input.slice(); input = []; const e = await send({ type: 'guess', g }); if (e) { input = g; show(...lastArgs); }
      };
      wrap.addEventListener('click', e => { if (e.target.closest('[data-again]')) send({ type: 'again' }); });
      const row = r => `<div class="sg-row">${r.g.map((c, i) => `<span class="sgt f${r.f[i]}">${esc(c)}</span>`).join('')}</div>`;
      function show(v, oppName, room) {
        lastArgs = [v, oppName, room];
        $('sgOpN').textContent = oppName; $('sgH1').textContent = `내 추측 → ${oppName} 수식`; $('sgH2').textContent = `${oppName} 추측 → 내 수식`;
        $('sgTurn').textContent = v.phase === 'secret' ? '수식 만들기' : `${v.turn + (v.phase === 'over' ? 0 : 1)}턴`;
        $('sgSub').textContent = v.phase === 'over' ? '게임 끝' : '먼저 맞히면 승리';
        const best = rows => rows.length ? Math.max(...rows.map(r => r.f.filter(x => x === 2).length)) + '/9' : '-';
        $('sgMe').textContent = best(v.mine); $('sgAi').textContent = best(v.theirs);
        $('sgMine').innerHTML = v.mine.map(row).join('') || '<span class="muted">아직 추측 없음</span>';
        $('sgTheirs').innerHTML = v.theirs.map(row).join('') || '<span class="muted">아직 추측 없음</span>';
        $('sgMySecret').textContent = v.mySecret ? `(내 수식 ${v.mySecret.join('')})` : '';
        const typing = !(v.phase === 'over' || v.waiting || (v.phase === 'secret' && v.mySecret));
        $('sgInput').innerHTML = Array.from({ length: L }, (_, i) => `<span class="sgt in ${typing && i === input.length ? 'cur' : ''}">${esc(input[i] || '')}</span>`).join('');
        const bestc = {}; for (const r of v.mine) r.g.forEach((c, i) => { bestc[c] = Math.max(bestc[c] ?? -1, r.f[i]); });
        $('sgKeys').innerHTML = CH.map(c => `<button type="button" class="sgk ${bestc[c] != null && v.phase !== 'secret' ? 'f' + bestc[c] : ''} ${isD(c) ? '' : 'op'}" data-k="${c}">${c}</button>`).join('');
        $('sgKeys').hidden = $('sgBtns').hidden = !typing; $('sgInput').hidden = !typing;
        $('sgRand').hidden = v.phase !== 'secret';
        $('sgGo').textContent = v.phase === 'secret' ? '이 수식으로 제출' : '추측 제출';
        const err = v.phase === 'secret' && input.length === L ? check(input) : '';
        $('sgMsg').textContent = v.phase === 'over' ? (v.winner === 0 ? `승리! ${v.turn}턴 만에 맞혔어요` : v.winner === 1 ? `패배 — ${oppName}가 먼저 맞혔어요` : '무승부') + (v.oppSecret ? ` · ${oppName} 수식: ${v.oppSecret.join('')}` : '')
          : v.phase === 'secret' ? (v.mySecret ? `${oppName}가 수식을 만드는 중…` : (err || `${oppName}가 맞힐 내 수식을 만드세요 (예: 48÷6+2=10)`))
          : v.waiting ? `${oppName}의 추측을 기다리는 중…` : `${oppName} 수식을 추측해 9칸을 채우세요 (성립하지 않아도 돼요)${v.oppWaiting ? ` · ${oppName}는 이미 냈어요` : ''}`;
        $('sgAgain').innerHTML = room && v.phase === 'over' ? LAB.duelAgain(room) : room && !room.oppOnline ? '<p class="muted">상대 연결이 끊겼어요. 다시 들어오면 이어서 해요.</p>' : '';
      }
      if (roomLink) start(); else LAB.ready(root, start);
      return () => { T.clear(); if (net) net.close(); };
    }
  });
})();
