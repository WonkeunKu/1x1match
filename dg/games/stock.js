// KBO 주식시장 — 2026 KBO 정규시즌 월별 성적으로 움직이는 구단 주식. 10만 원으로 시작해 6구간(3·4월~9·10월) 동안 사고팔아 최종 자산을 겨뤄요.
// 친구와 방(2~4인, 빈자리는 AI) · 혼자 하기 · AI와 하기. 규칙 코드는 서버(온라인 방)와 브라우저가 함께 씀
(function () {
  // 2026 KBO 정규시즌 팀별 월간 승·패·무 (3월~10월, 우천 취소 제외 720경기, 랠리픽 경기 데이터)
  const T = [
    ['두산', '#8f8cf0', [[1, 1, 1], [11, 14, 0], [13, 13, 0], [14, 10, 1], [12, 7, 1], [10, 7, 1], [8, 11, 1], [4, 3, 0]]],
    ['KIA', '#ff4d5e', [[1, 2, 0], [12, 12, 1], [15, 11, 0], [15, 10, 0], [9, 11, 1], [11, 4, 0], [9, 10, 0], [7, 3, 0]]],
    ['롯데', '#a9bde3', [[2, 1, 0], [7, 16, 1], [12, 13, 0], [12, 12, 1], [9, 12, 0], [8, 7, 0], [11, 11, 0], [3, 5, 1]]],
    ['삼성', '#3f97ff', [[0, 2, 1], [13, 11, 0], [18, 7, 0], [14, 10, 1], [14, 7, 0], [9, 7, 1], [12, 8, 0], [3, 6, 0]]],
    ['LG', '#ef4f9a', [[0, 3, 0], [17, 7, 0], [16, 10, 0], [15, 10, 0], [7, 13, 0], [9, 8, 1], [11, 8, 0], [3, 6, 0]]],
    ['SSG', '#ffd23f', [[3, 0, 0], [14, 10, 0], [5, 20, 1], [8, 16, 1], [7, 13, 2], [11, 6, 1], [12, 6, 0], [5, 3, 0]]],
    ['KT', '#d5dae0', [[3, 0, 0], [16, 9, 0], [13, 11, 1], [11, 12, 0], [14, 4, 1], [9, 7, 1], [17, 6, 1], [7, 0, 1]]],
    ['NC', '#d4ad6e', [[2, 1, 0], [11, 13, 0], [9, 15, 1], [13, 11, 0], [8, 10, 1], [8, 8, 0], [11, 14, 0], [2, 6, 0]]],
    ['한화', '#ff8a1f', [[2, 1, 0], [9, 15, 0], [16, 9, 0], [10, 12, 2], [9, 10, 1], [3, 15, 0], [6, 16, 1], [2, 5, 0]]],
    ['키움', '#d9607f', [[0, 3, 0], [11, 14, 0], [9, 17, 1], [8, 17, 0], [9, 11, 1], [5, 14, 1], [5, 12, 1], [3, 2, 0]]]];
  const P = ['3·4월', '5월', '6월', '7월', '8월', '9·10월'], XL = ['개막', ...P], START = 1e5, MULT = 1.5, NT = T.length;
  const add = (a, b) => a.map((x, i) => x + b[i]);
  const rec = T.map(t => { const m = t[2]; return [add(m[0], m[1]), m[2], m[3], m[4], m[5], add(m[6], m[7])]; });
  const wr = r => r[0] + r[1] ? r[0] / (r[0] + r[1]) : .5;
  const cumR = (i, k) => k ? rec[i].slice(0, k).reduce(add) : null;
  const base = (i, k) => k ? wr(cumR(i, k)) : .5;
  // 평소보다 잘하면 오르고 못하면 내린다: 수익률 = (이번 구간 승률 − 지금까지 승률) × 1.5 (3·4월은 .500 기준)
  const price = [T.map(() => 10000)];
  for (let k = 0; k < 6; k++) price.push(price[k].map((p, i) => Math.max(1, Math.round(p * (1 + MULT * (wr(rec[i][k]) - base(i, k)))))));
  const ORD = T.map((_, i) => i).sort((a, b) => { const w = i => wr(rec[i].reduce(add)); return w(b) - w(a); }); // 시즌 최종 순위 순
  const zeros = () => T.map(() => 0);
  const pval = (p, k) => p.cash + p.hold.reduce((a, h, i) => a + h * price[k][i], 0);
  const sw = T.map((_, i) => wr(rec[i].reduce(add))), top1 = sw.indexOf(Math.max(...sw));
  let perfect = START; for (let k = 0; k < 6; k++) perfect *= Math.max(1, ...price[k + 1].map((p, i) => p / price[k][i]));
  const BENCH = [['매 구간 최고 팀 몰빵 (완벽한 예언)', perfect], [`정규시즌 1위 ${T[top1][0]} 개막부터 보유`, START * price[6][top1] / 1e4], ['10개 구단 똑같이 나눠 보유', T.reduce((a, t, i) => a + START / 10 / 1e4 * price[6][i], 0)], ['현금만 들고 있기', START]];
  const GR = [[2.5, '예언자', '시즌을 이미 본 사람처럼 굴렸어요.'], [1.2, '단장', '이 정도면 트레이드 전권을 맡겨도 됩니다.'], [.6, '전력분석원', '흐름을 읽는 눈이 확실히 있어요.'], [.2, '스카우트', '될 팀을 알아보는 감은 있어요.'], [0, '열혈팬', '원금은 지켰습니다. 응원은 계속됩니다.'], [-9, '직관 요정', '내가 사면 지고 팔면 이기는 그 느낌…']];
  const grade = r => GR.find(x => r >= x[0]);

  // ---------- AI ----------
  const AIS = {
    rand: { label: '감으로 찍기', desc: '아무 팀이나 1~3개 골라요' },
    spread: { label: '분산 투자', desc: '10개 구단에 똑같이 나눠 담아요' },
    blue: { label: '우량주', desc: '지금까지 승률이 가장 높은 2팀을 사요' },
    mom: { label: '모멘텀', desc: '지난 구간 평소보다 잘한 2팀을 사요' },
    oracle: { label: '족집게', desc: '다음 구간 성적을 대략 알고 있어요' } };
  const STYLES = [['rand', 'spread'], ['blue', 'mom'], ['oracle', 'mom', 'blue']]; // 쉬움·보통·어려움
  function rngOf(t) { let h = 1779033703; for (let i = 0; i < t.length; i++) { h = Math.imul(h ^ t.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } let a = h >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
  const shuf = (a, rng) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const byScore = f => ORD.slice().sort((a, b) => f(b) - f(a));
  function aiTargets(style, k, rng) {
    if (style === 'spread') return ORD.slice();
    if (style === 'rand') return shuf(ORD, rng).slice(0, 1 + Math.floor(rng() * 3));
    if (style === 'oracle') { const sc = i => wr(rec[i][k]) - base(i, k) + (rng() - .5) * .16; const o = byScore(sc); return sc(o[0]) > 0 ? o.slice(0, 2).filter(i => sc(i) > 0) : []; }
    if (!k) return shuf(ORD, rng).slice(0, 2);
    if (style === 'blue') return byScore(i => wr(cumR(i, k))).slice(0, 2);
    if (style === 'mom') return byScore(i => wr(rec[i][k - 1]) - base(i, k - 1)).slice(0, 2);
    return [];
  }
  function aiTrade(p, k, rng) {
    const pr = price[k];
    for (let i = 0; i < NT; i++) { p.cash += p.hold[i] * pr[i]; p.hold[i] = 0; p.cost[i] = 0; }
    const tg = aiTargets(p.bot, k, rng);
    if (tg.length) {
      const bud = p.cash / tg.length;
      tg.forEach(i => { const q = Math.floor(bud / pr[i]); if (q > 0) { p.cash -= q * pr[i]; p.hold[i] += q; p.cost[i] += q * pr[i]; } });
      let more = true; while (more) { more = false; for (const i of tg) if (p.cash >= pr[i]) { p.cash -= pr[i]; p.hold[i]++; p.cost[i] += pr[i]; more = true; } }
    }
    p.book[k] = { cash: p.cash, hold: p.hold.slice(), cost: p.cost.slice() }; p.done = k;
  }

  // ---------- 규칙 (AI·혼자·온라인 공용) ----------
  const fail = m => { throw Object.assign(new Error(m), { duel: true }); };
  const baseOf = (p, k) => k && p.book[k - 1] ? p.book[k - 1] : { cash: START, hold: zeros(), cost: zeros() };
  const hist = (p, k) => { const h = [START]; for (let j = 1; j <= k; j++) { const b = p.book[j - 1]; h.push(b ? b.cash + b.hold.reduce((a, x, i) => a + x * price[j][i], 0) : h[j - 1]); } return h; };
  const MULTI = {
    seats: o => Math.max(2, Math.min(4, Number(o && o.n) || 4)),
    init(prev, o, seats) { // seats: [{name, bot}]
      const lv = [0, 1, 2].includes(Number(o && o.lv)) ? Number(o.lv) : 1, st = STYLES[lv]; let b = 0;
      const players = seats.map(x => { const bot = x.bot ? st[b++ % st.length] : null; return { name: bot && /^AI/.test(x.name) ? `AI ${AIS[bot].label}` : x.name, bot, cash: START, hold: zeros(), cost: zeros(), book: {}, done: -1 }; });
      const tot = {}, cnt = {}; players.forEach(p => { tot[p.name] = (tot[p.name] || 0) + 1; }); players.forEach(p => { if (p.bot && tot[p.name] > 1) { const nm = p.name; cnt[nm] = (cnt[nm] || 0) + 1; p.name = nm + ' ' + cnt[nm]; } });
      return { mid: Math.random().toString(36).slice(2, 9), step: 0, phase: 'play', players, lv, log: ['개막 — 모든 구단 10,000원에서 출발'], winner: -1, at: Date.now() + 900, seed: Math.random().toString(36).slice(2) };
    },
    act(s, seat, a) {
      const p = s.players[seat], k = s.step; if (!p || p.bot) fail('참가자가 아니에요.');
      if (s.phase !== 'play') fail('시즌이 끝났어요.');
      if (a.type === 'trade') {
        if (p.done >= k) fail('거래 완료를 누른 뒤에는 거래할 수 없어요. 먼저 완료를 취소하세요.');
        const i = Number(a.i), q = Number(a.q); if (!(i >= 0 && i < NT) || !Number.isInteger(q) || !q) fail('수량을 확인해 주세요.');
        const pr = price[k][i];
        if (q > 0) { if (q * pr > p.cash) fail('현금이 모자라요.'); p.cash -= q * pr; p.hold[i] += q; p.cost[i] += q * pr; }
        else { const n = -q; if (n > p.hold[i]) fail('가진 주식보다 많이 팔 수 없어요.'); const avg = p.cost[i] / p.hold[i]; p.cost[i] -= avg * n; p.hold[i] -= n; p.cash += n * pr; if (!p.hold[i]) p.cost[i] = 0; }
        return;
      }
      if (a.type === 'undo') { if (p.done >= k) fail('거래 완료를 먼저 취소하세요.'); const b = baseOf(p, k); p.cash = b.cash; p.hold = b.hold.slice(); p.cost = b.cost.slice(); return; }
      if (a.type === 'done') { if (p.done >= k) return; p.book[k] = { cash: p.cash, hold: p.hold.slice(), cost: p.cost.slice() }; p.done = k; s.at = Math.max(s.at || 0, Date.now() + 300); return; }
      if (a.type === 'undone') { if (p.done < k) return; p.done = k - 1; delete p.book[k]; return; }
      fail('알 수 없는 행동이에요.');
    },
    // 시간이 흐르며 저절로: AI 거래, 모두 완료하면 결과 공개
    tick(s, now = Date.now()) {
      if (s.phase !== 'play' || (s.at && now < s.at)) return false;
      const k = s.step, bot = s.players.find(p => p.bot && p.done < k);
      if (bot) { aiTrade(bot, k, rngOf(`${s.seed}|${s.players.indexOf(bot)}|${k}`)); s.at = now + 500; return true; }
      if (!s.players.every(p => p.done >= k)) return false;
      s.step = k + 1;
      const best = ORD.map(i => ({ i, c: price[k + 1][i] / price[k][i] - 1 })).sort((a, b) => b.c - a.c);
      s.log.push(`${P[k]} 결과 공개 — 최고 ${T[best[0].i][0]} ${(best[0].c * 100).toFixed(1)}%, 최저 ${T[best[best.length - 1].i][0]} ${(best[best.length - 1].c * 100).toFixed(1)}%`);
      if (s.step >= 6) {
        s.phase = 'over'; const v = s.players.map(p => pval(p, 6)), mx = Math.max(...v);
        const ws = v.map((x, i) => x === mx ? i : -1).filter(i => i >= 0); s.winner = ws.length === 1 ? ws[0] : -1; // 동점이면 -1
        s.log.push('시즌 종료');
      }
      s.at = now + 900; return true;
    },
    view(s, seat) {
      const k = s.step;
      return { mid: s.mid, me: seat, step: k, phase: s.phase, lv: s.lv, winner: s.winner, log: s.log.slice(-40),
        players: s.players.map((p, i) => {
          const own = i === seat, b = own || s.phase === 'over' ? p : baseOf(p, k); // 다른 사람의 이번 구간 거래는 결과 공개 전까지 숨김
          return { name: p.name, bot: p.bot, botLabel: p.bot ? AIS[p.bot].label : '', cash: b.cash, hold: b.hold.slice(), cost: b.cost.slice(), done: p.done >= k, value: pval(p, k), hist: hist(p, k) };
        }) };
    },
  };

  const ENG = { T, P, XL, START, price, rec, ORD, AIS, STYLES, pval, aiTrade, rngOf, MULTI };
  if (typeof module !== 'undefined' && module.exports) { module.exports = ENG; return; }
  if (typeof LAB === 'undefined') return;

  // ---------- 화면 ----------
  const { h, esc } = LAB;
  const won = n => Math.round(n).toLocaleString('ko-KR') + '원';
  const pct = x => (x > 0 ? '+' : '') + (x * 100).toFixed(1) + '%';
  const cls = x => x > .0005 ? 'up' : x < -.0005 ? 'dn' : '';
  const fwr = r => { const w = wr(r); return w >= 1 ? '1.000' : w.toFixed(3).replace(/^0/, ''); };
  const fr = r => `${r[0]}승 ${r[1]}패${r[2] ? ' ' + r[2] + '무' : ''}`;
  const PCOL = ['#f3b641', '#6fc4ea', '#f28f74', '#a9d774'];
  LAB.add({
    id: 'stock', name: 'KBO 주식시장', show: '야구 게임',
    rules: `<ul>
      <li>모두 <b>10만 원</b>으로 시작하고, 10개 구단 주가는 개막 때 모두 <b>10,000원</b>이에요. 2026 정규시즌 실제 월별 성적으로 주가가 움직여요.</li>
      <li>구간은 <b>3·4월, 5월, 6월, 7월, 8월, 9·10월</b> 6개. <b>평소보다 잘하면 오르고, 못하면 내려요.</b> 평소 = 그 팀의 지금까지 시즌 승률.<br>수익률 = (이번 구간 승률 − 지금까지 승률) × 1.5 (무승부 제외, 3·4월은 .500 기준).</li>
      <li>사고팔기를 마치면 <b>거래 완료</b>를 누르세요. 모두 누르면 그 구간 결과가 공개되고 주가가 움직여요. 다른 사람이 이번 구간에 뭘 샀는지는 결과가 나올 때까지 보이지 않아요.</li>
      <li>산 주식은 팔 때까지 계속 들고 가요. 9·10월 결과가 나오면 최종 자산(현금 + 주식)으로 순위를 매겨요.</li>
      <li><b>친구와 하기</b>(2~4인, 빈자리는 AI), <b>혼자 하기</b>(상대 없이 내 수익률 도전), <b>AI와 하기</b> 중에서 골라요. AI는 성향마다 투자 방식이 달라요(어려움의 '족집게'는 다음 구간 성적을 대략 알고 있어요).</li>
    </ul>`,
    mount(root) {
      const T2 = LAB.timers(); LAB.paused = false;
      const roomLink = LAB.roomParam();
      let pend = { n: 4, lv: 1, opp: 'ai' }, S = null, net = null, V = null, room = null, ended = false, sel = -1, cur = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dn-lobby" id="skLobby" hidden></div>
          <div id="skGame" hidden>
            <div class="sk-top"><div class="sk-box"><small id="skTotL">내 총자산</small><b id="skTot">-</b><span id="skTotS"></span></div><div class="sk-box"><small>진행 구간</small><b id="skStep">-</b><span id="skStepS"></span></div><div class="sk-btns"><button type="button" id="skUndo">되돌리기</button><button type="button" class="primary" id="skMain">거래 완료</button></div></div>
            <div class="sk-strip" id="skStrip"></div>
            <div class="sk-chart"><div class="sk-fig" id="skFig"><svg aria-label="구단별 주가와 내 계좌 추이"></svg></div><div class="sk-rep" id="skRep" aria-live="polite"></div></div>
            <div class="sk-mk" id="skMk"></div>
            <div id="skResult" hidden></div>
            <div id="skAgain"></div>
          </div>
        </div>
        <aside class="g-side"><div class="card"><h3>진행 기록</h3><div class="log" id="skLog"></div></div></aside>
        <div class="sk-ov" id="skOv" hidden><div class="sk-sheet" role="dialog" aria-modal="true" aria-labelledby="skShT">
          <h3 id="skShT"></h3><p class="muted" id="skShI"></p>
          <div class="sk-tabs"><button type="button" class="buy" data-mode="buy">매수</button><button type="button" class="sell" data-mode="sell">매도</button></div>
          <div class="sk-qty"><button type="button" data-q="-1" aria-label="1주 줄이기">−</button><input id="skQ" type="number" inputmode="numeric" min="0" step="1" placeholder="0" aria-label="수량(주)"><button type="button" data-q="1" aria-label="1주 늘리기">+</button></div>
          <div class="sk-quick" id="skQuick"></div><p class="sk-est" id="skEst"></p>
          <div class="row"><button type="button" id="skCancel">취소</button><button type="button" class="primary" id="skOk">확인</button></div>
        </div></div>
      </div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      const front = LAB.duelFront({ el: $('skLobby'), gameEl: $('skGame'), friendLabel: '친구와 하기 (2~4인, 빈자리는 AI)', soloLabel: 'AI와 하기',
        alone: { label: '혼자 하기', desc: '상대 없이 10만 원으로 시즌 수익률에 도전해요. 끝나면 등급과 기준(완벽한 예언, 1위 팀 보유 등)과 비교해 줘요.' },
        soloOpts: [{ key: 'n', label: '인원 (나 + AI)', opts: [[2, '2인'], [3, '3인'], [4, '4인']], def: 4 }, { key: 'lv', label: 'AI 실력', opts: [[0, '쉬움'], [1, '보통'], [2, '어려움']], def: 1 }],
        roomOpts: [{ key: 'n', label: '인원', opts: [[2, '2인'], [3, '3인'], [4, '4인']], def: 4 }, { key: 'lv', label: 'AI 실력 (빈자리를 채울 때)', opts: [[0, '쉬움'], [1, '보통'], [2, '어려움']], def: 1 }],
        onStart: (mode, c) => { Object.assign(pend, c, { opp: mode }); start(); }, onLeave: () => reset() });
      function reset() { T2.clear(); if (net) { net.close(); net = null; } S = null; V = null; room = null; ended = false; sel = -1; closeSheet(); }
      function start() {
        reset();
        if (pend.opp === 'net') {
          net = LAB.duel('stock', { front, el: $('skLobby'), opts: () => ({ n: pend.n, lv: pend.lv }), onView: v => { room = v; if (v.st) show(v.st); }, onError: m => toast(m) });
          net.start(); return;
        }
        const seats = pend.opp === 'alone' ? [{ name: '나' }] : [{ name: '나' }, ...Array.from({ length: pend.n - 1 }, (_, k) => ({ name: 'AI', bot: true }))];
        S = MULTI.init(null, { lv: pend.lv }, seats); S.at = 0;
        front.solo(pend.opp === 'alone' ? '혼자 하기' : `AI와 하기 · ${pend.n}인`);
        local(); T2.every(() => { if (S && MULTI.tick(S, Date.now())) local(); }, 200);
      }
      function local() {
        show(MULTI.view(S, 0));
        if (S.phase === 'over' && !ended) { ended = true; const v = MULTI.view(S, 0), me = v.players[0], r = me.value / START - 1, g = grade(r);
          const rank = 1 + v.players.filter(p => p.value > me.value).length;
          T2.set(() => LAB.end(v.players.length > 1 ? `${rank}위 · ${g[1]}` : g[1], `10만 원 → ${won(me.value)} (${pct(r)})${v.players.length > 1 ? ` · ${v.players.length}명 중 ${rank}위` : ''}`, start), 900); }
      }
      async function send(a) {
        if (net) { const e = await net.act(a); if (e) toast(e); return !e; }
        try { MULTI.act(S, 0, a); } catch (e) { toast(e.message); return false; }
        local(); return true;
      }
      let toastT = null;
      function toast(m) { const el = $('skStepS'); if (!el) return; el.textContent = m; el.classList.add('warn'); clearTimeout(toastT); toastT = setTimeout(() => { el.classList.remove('warn'); V && show(V); }, 2200); }

      // ----- 그리기 -----
      const fig = $('skFig'), svg = fig.querySelector('svg');
      function draw() {
        if (!V) return; const W = fig.clientWidth, H = fig.clientHeight; if (!W) return;
        const k = V.step, me = V.players[V.me], L = 40, R = 80, Tp = 14, B = 24;
        const ser = T.map((t, i) => price.slice(0, k + 1).map(r => r[i] / 100)), mine = me.hist.map(v => v / START * 100);
        let all = [...ser.flat(), ...mine, 100], lo = Math.min(...all), hi = Math.max(...all); const pd = (hi - lo) * .08 || 12; lo -= pd; hi += pd;
        const x = j => L + (W - L - R) * j / 6, y = v => Tp + (H - Tp - B) * (1 - (v - lo) / (hi - lo));
        const sp = hi - lo, st = sp > 600 ? 200 : sp > 300 ? 100 : sp > 140 ? 50 : sp > 60 ? 20 : 10; let s = '';
        for (let v = Math.ceil(lo / st) * st; v <= hi; v += st) s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="rgba(241,238,228,${v === 100 ? .35 : .1})" ${v === 100 ? 'stroke-dasharray="4 4"' : ''}/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" class="sk-tk">${v}</text>`;
        XL.forEach((l, j) => s += `<text x="${x(j)}" y="${H - 6}" text-anchor="middle" class="sk-tk${j === k ? ' now' : ''}">${l}</text>`);
        const path = a => a.map((v, j) => (j ? 'L' : 'M') + x(j).toFixed(1) + ',' + y(v).toFixed(1)).join('');
        T.map((_, i) => i).sort((a, b) => (a === sel) - (b === sel)).forEach(i => { const on = sel === i; s += `<path d="${path(ser[i])}" fill="none" stroke="${T[i][1]}" stroke-width="${on ? 3.5 : 1.7}" opacity="${sel < 0 ? .7 : on ? 1 : .15}" stroke-linejoin="round" stroke-linecap="round"/>`; if (!k) s += `<circle cx="${x(0)}" cy="${y(ser[i][0])}" r="3" fill="${T[i][1]}"/>`; });
        s += `<path d="${path(mine)}" fill="none" stroke="#f3b641" stroke-width="4" stroke-linejoin="round"/>`;
        mine.forEach((v, j) => s += `<circle cx="${x(j)}" cy="${y(v)}" r="4.5" fill="#10302a" stroke="#f3b641" stroke-width="2.5"/>`);
        const ym = y(mine[k]); s += `<text x="${x(k) + 9}" y="${ym + 4}" class="sk-el" fill="#f3b641">내 계좌 ${Math.round(mine[k])}</text>`;
        if (sel >= 0) { let ys = y(ser[sel][k]); if (Math.abs(ys - ym) < 17) ys = ys < ym ? ym - 17 : ym + 17; s += `<text x="${x(k) + 9}" y="${ys + 4}" class="sk-el" fill="${T[sel][1]}">${T[sel][0]} ${Math.round(ser[sel][k])}</text>`; }
        svg.innerHTML = s;
      }
      new ResizeObserver(draw).observe(fig);
      function show(v) {
        V = v; const k = v.step, me = v.players[v.me], over = v.phase === 'over', multi = v.players.length > 1, nDone = v.players.filter(p => p.done).length;
        const r = me.value / START - 1;
        $('skTot').textContent = won(me.value); $('skTotS').innerHTML = `<span class="${cls(r)}">${pct(r)}</span> · 현금 ${won(me.cash)}`;
        $('skStep').textContent = over ? '시즌 종료' : `${P[k]} 거래 중`;
        if (!$('skStepS').classList.contains('warn')) $('skStepS').textContent = over ? '' : multi ? `거래 완료 ${nDone}/${v.players.length}` : '결과를 볼 준비가 되면 거래 완료';
        const mb = $('skMain'), ub = $('skUndo');
        ub.hidden = over; mb.hidden = over;
        ub.disabled = me.done; mb.textContent = me.done ? (multi ? `완료 취소 · ${nDone}/${v.players.length}` : '결과 공개 중…') : multi ? `${P[k] || ''} 거래 완료` : `${P[k] || ''} 결과 공개 →`;
        mb.classList.toggle('primary', !me.done);
        // 참가자 줄
        const order = v.players.map((p, i) => i).sort((a, b) => v.players[b].value - v.players[a].value);
        $('skStrip').hidden = !multi;
        $('skStrip').innerHTML = order.map((i, rk) => { const p = v.players[i], rr = p.value / START - 1;
          return `<div class="sk-pc${i === v.me ? ' me' : ''}" style="--pc:${PCOL[i % 4]}"><span class="n"><b class="rk">${1 + v.players.filter(q => q.value > p.value).length}위</b>${esc(i === v.me && !net ? '나' : p.name)}</span>${over ? '' : `<span class="sk-tag ${p.done ? 'ok' : ''}">${p.done ? '완료' : '거래 중'}</span>`}<span class="v"><span>${won(p.value)}</span><span class="${cls(rr)}">${pct(rr)}</span></span></div>`; }).join('');
        // 리포트
        let rep;
        if (!k) rep = `<b class="sk-h">개막 전 · 첫 투자</b><p>모든 구단 10,000원에서 출발해요. 3·4월에 잘 나갈 팀을 사 두고 <b>거래 완료</b>를 누르세요.</p><p><b>평소보다 잘하면 오르고, 못하면 내려요.</b> 지금까지 .500 하던 팀이 이번 구간 .700이면 +30%, .300이면 −30%.</p><p class="muted">구단 이름을 누르면 차트에서 강조돼요.</p>`;
        else { const mc = me.hist[k] / me.hist[k - 1] - 1;
          rep = `<b class="sk-h">${P[k - 1]} 결과</b><div class="sk-me">내 계좌 <b class="${cls(mc)}">${pct(mc)}</b></div><div class="sk-rk">${ORD.map(i => { const c = price[k][i] / price[k - 1][i] - 1; return `<div><span><i class="dot" style="background:${T[i][1]}"></i>${T[i][0]}</span><span class="${cls(c)}">${pct(c)}</span></div>`; }).join('')}</div>`; }
        $('skRep').innerHTML = rep;
        // 시세판
        const lock = over || me.done;
        $('skMk').hidden = over;
        $('skMk').innerHTML = `<div class="sk-row hd"><span>구단</span><span>현재가</span><span>등락</span><span>직전 구간 · 지금까지</span><span>내 보유</span><span></span></div>` + ORD.map(i => {
          const t = T[i], p = price[k][i], ch = k ? p / price[k - 1][i] - 1 : null, rc = k ? rec[i][k - 1] : null, hd = me.hold[i], hv = hd * p, pl = me.cost[i] > 0 ? hv / me.cost[i] - 1 : 0;
          return `<div class="sk-row${sel === i ? ' sel' : ''}"><button type="button" class="sk-tm" data-sel="${i}" aria-pressed="${sel === i}"><i style="background:${t[1]}"></i><b>${t[0]}</b></button>
            <span class="sk-px">${p.toLocaleString('ko-KR')}</span><span class="sk-ch ${ch == null ? 'muted' : cls(ch)}">${ch == null ? '—' : pct(ch)}</span>
            <span class="sk-rc">${rc ? `${fr(rc)} <span class="muted">${fwr(rc)}</span> · 누적 ${fwr(cumR(i, k))}` : '<span class="muted">개막 (.500 기준)</span>'}</span>
            <span class="sk-hold">${hd ? `<b>${hd.toLocaleString('ko-KR')}주</b> · ${won(hv)} <span class="${cls(pl)}">${pct(pl)}</span>` : '<span class="muted">미보유</span>'}</span>
            <span class="sk-act"><button type="button" class="buy" data-buy="${i}" ${lock || me.cash < p ? 'disabled' : ''}>매수</button><button type="button" class="sell" data-sell="${i}" ${lock || !hd ? 'disabled' : ''}>매도</button></span></div>`; }).join('');
        // 결과
        $('skResult').hidden = !over;
        if (over) $('skResult').innerHTML = resultHtml(v);
        $('skAgain').innerHTML = room && over ? (() => { const mine = room.players[v.me] && room.players[v.me].again, wait = room.players.filter(p => p && !p.bot && !p.again).map(p => p.name);
          return `<div class="dn-again">${mine ? `<span class="muted">${esc(wait.join(', '))} 기다리는 중…</span>` : '<button type="button" class="primary" data-again>다시 하기</button>'}</div>`; })() : room && !over && room.players ? (room.players.some(p => p && !p.bot && !p.online) ? '<p class="muted" style="text-align:center">연결이 끊긴 참가자가 있어요. 다시 들어오면 이어서 해요.</p>' : '') : '';
        $('skLog').innerHTML = v.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
        draw();
      }
      function resultHtml(v) {
        const me = v.players[v.me], r = me.value / START - 1, g = grade(r);
        const order = v.players.map((p, i) => i).sort((a, b) => v.players[b].value - v.players[a].value);
        const rows = [['내 계좌', me.value, 1], ...BENCH.map(b => [b[0], b[1], 0])], mx = Math.max(...rows.map(x => x[1]));
        return `<div class="sk-res"><div class="sk-grade"><small>최종 등급</small><b>${g[1]}</b><p>${g[2]} 10만 원 → <b>${won(me.value)}</b> <span class="${cls(r)}">${pct(r)}</span></p></div>
          ${v.players.length > 1 ? `<div class="sk-final">${order.map((i, n) => { const p = v.players[i], rr = p.value / START - 1; return `<div class="sk-fr${i === v.me ? ' me' : ''}" style="--pc:${PCOL[i % 4]}"><b class="rk">${1 + v.players.filter(q => q.value > p.value).length}위</b><span>${esc(p.name)}</span><span class="mono">${won(p.value)}</span><span class="${cls(rr)}">${pct(rr)}</span><span class="chips">${ORD.map(t => p.hold[t] ? `<span class="tchip" style="--tc:${T[t][1]}">${T[t][0]} ${p.hold[t]}</span>` : '').join('') || '<span class="muted">현금만</span>'}</span></div>`; }).join('')}</div>` : ''}
          <div class="sk-bench">${rows.map(x => `<div class="${x[2] ? 'me' : ''}"><span>${x[0]}</span><b class="${cls(x[1] / START - 1)}">${pct(x[1] / START - 1)}</b><i><em style="width:${Math.max(1, x[1] / mx * 100).toFixed(1)}%"></em></i></div>`).join('')}</div>
          <div class="sk-tbl"><table><thead><tr><th>구단</th>${P.map(p => `<th>${p}</th>`).join('')}<th>최종가</th></tr></thead><tbody>${ORD.map(i => `<tr><td><i class="dot" style="background:${T[i][1]}"></i>${T[i][0]}</td>${P.map((_, k) => { const c = price[k + 1][i] / price[k][i] - 1, q = rec[i][k]; return `<td><span class="${cls(c)}">${pct(c)}</span><small>${q[0]}-${q[1]}${q[2] ? '-' + q[2] : ''}</small></td>`; }).join('')}<td><b>${price[6][i].toLocaleString('ko-KR')}</b></td></tr>`).join('')}</tbody></table></div></div>`;
      }
      // ----- 거래 창 -----
      const maxQ = () => { const me = V.players[V.me], p = price[V.step][cur.i]; return cur.mode === 'buy' ? Math.floor(me.cash / p) : me.hold[cur.i]; };
      function openSheet(i, mode) { cur = { i, mode }; $('skOv').hidden = false; renderSheet(); setTimeout(() => $('skQ').focus(), 30); }
      function closeSheet() { $('skOv').hidden = true; cur = null; }
      function renderSheet() {
        const { i, mode } = cur, me = V.players[V.me], p = price[V.step][i];
        wrap.querySelector('.sk-sheet').style.setProperty('--pc', T[i][1]);
        $('skShT').textContent = `${T[i][0]} ${mode === 'buy' ? '매수' : '매도'}`;
        $('skShI').innerHTML = `현재가 <b>${won(p)}</b> · 보유 <b>${me.hold[i]}주</b> · 현금 <b>${won(me.cash)}</b>`;
        wrap.querySelectorAll('.sk-tabs button').forEach(b => { b.setAttribute('aria-pressed', b.dataset.mode === mode); b.disabled = b.dataset.mode === 'buy' ? me.cash < p : !me.hold[i]; });
        $('skQuick').innerHTML = [1, 2, 3, 5].map(n => `<button type="button" data-n="${n}">+${n}주</button>`).join('') + `<button type="button" data-n="max">${mode === 'buy' ? '최대' : '전량'}</button>`;
        $('skQ').value = ''; upd();
      }
      function upd() {
        if (!cur) return; const me = V.players[V.me], p = price[V.step][cur.i], q = Math.max(0, Math.floor(+$('skQ').value || 0)), m = maxQ();
        $('skEst').innerHTML = (q ? (q > m ? `<span class="up">${m}주보다 많이 ${cur.mode === 'buy' ? '살' : '팔'} 수 없어요</span>` : `${q}주 × ${won(p)} = <b>${won(q * p)}</b>${cur.mode === 'buy' ? ` · 남는 현금 <b>${won(me.cash - q * p)}</b>` : ''}`) : `<span class="muted">몇 주를 ${cur.mode === 'buy' ? '살지' : '팔지'} 입력하세요</span>`) + `<br><span class="muted">최대 <b>${m}주</b> ${cur.mode === 'buy' ? '매수' : '매도'} 가능</span>`;
        $('skOk').disabled = !q || q > m; $('skOk').textContent = cur.mode === 'buy' ? '매수 확인' : '매도 확인';
      }
      const stepQ = d => { const q = Math.max(0, Math.min(maxQ(), Math.floor(+$('skQ').value || 0) + d)); $('skQ').value = q || ''; upd(); };
      $('skQ').addEventListener('input', upd);
      $('skQ').addEventListener('keydown', e => { if (e.key === 'Enter' && !$('skOk').disabled) $('skOk').click(); if (e.key === 'Escape') closeSheet(); });
      $('skOv').addEventListener('click', e => {
        if (e.target.id === 'skOv') return closeSheet();
        const qb = e.target.closest('[data-q]'); if (qb) return stepQ(+qb.dataset.q);
        const nb = e.target.closest('[data-n]'); if (nb) { if (nb.dataset.n === 'max') { $('skQ').value = maxQ() || ''; upd(); } else stepQ(+nb.dataset.n); return; }
        const tb = e.target.closest('[data-mode]'); if (tb && !tb.disabled) { cur.mode = tb.dataset.mode; renderSheet(); }
      });
      $('skCancel').onclick = closeSheet;
      $('skOk').onclick = async () => { const q = Math.floor(+$('skQ').value || 0); if (!q || q > maxQ()) return; const { i, mode } = cur; closeSheet(); await send({ type: 'trade', i, q: mode === 'buy' ? q : -q }); };
      $('skMk').addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b || b.disabled) return;
        if (b.dataset.sel != null) { const i = +b.dataset.sel; sel = sel === i ? -1 : i; show(V); }
        else if (b.dataset.buy != null) openSheet(+b.dataset.buy, 'buy'); else if (b.dataset.sell != null) openSheet(+b.dataset.sell, 'sell');
      });
      $('skUndo').onclick = () => send({ type: 'undo' });
      $('skMain').onclick = () => { if (!V) return; const me = V.players[V.me]; send({ type: me.done ? 'undone' : 'done' }); };
      wrap.addEventListener('click', e => { if (e.target.closest('[data-again]') && net) net.act({ type: 'again' }); });

      if (roomLink) { pend.opp = 'net'; start(); } else front.menu();
      return () => { T2.clear(); if (net) net.close(); };
    }
  });
})();
