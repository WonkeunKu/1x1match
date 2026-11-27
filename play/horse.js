// 말 달리자 (데스게임 시즌1 7회차) — 오아시스에 먼저 말을 세우면 라운드 승리, 3판 2선승
(function () {
  const { h, esc, rnd, seg } = LAB;
  const N = 11, C = 5, OASIS = C * N + C;
  const rc = i => [Math.floor(i / N), i % N];
  const terr = i => { const [r, c] = rc(i); const d = Math.abs(r - C) + Math.abs(c - C); return d === 0 ? 'oasis' : d <= 2 ? 'grass' : 'desert'; };
  const TERR = Array.from({ length: N * N }, (_, i) => terr(i));
  const DIR = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const ROWS = 'abcdefghijk';
  const name = i => { const [r, c] = rc(i); return ROWS[r] + (c + 1); };
  // 시작 배치(방송 화면 기준 추정): 내 말은 왼쪽 위·오른쪽 아래 귀퉁이, 상대는 오른쪽 위·왼쪽 아래 귀퉁이에 5개씩
  const corner = (r0, c0, dr, dc) => [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]].map(([a, b]) => (r0 + a * dr) * N + (c0 + b * dc));
  function initBoard() {
    const b = new Int8Array(N * N);
    [...corner(0, 0, 1, 1), ...corner(10, 10, -1, -1)].forEach(i => b[i] = 1);
    [...corner(0, 10, 1, -1), ...corner(10, 0, -1, 1)].forEach(i => b[i] = 2);
    return b;
  }
  function moves(b, p) {
    const out = [];
    for (let i = 0; i < N * N; i++) {
      if (b[i] !== p) continue; const [r, c] = rc(i);
      for (const [dr, dc] of DIR) {
        let rr = r, cc = c;
        while (true) { const nr = rr + dr, nc = cc + dc; if (nr < 0 || nr >= N || nc < 0 || nc >= N || b[nr * N + nc]) break; rr = nr; cc = nc; }
        if (rr !== r || cc !== c) out.push({ f: i, t: rr * N + cc, k: 's' });
      }
      for (const [dr, dc] of KN) {
        const nr = r + dr, nc = c + dc; if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
        const t = nr * N + nc; if (!b[t] && TERR[t] === 'desert') out.push({ f: i, t, k: 'l' });
      }
    }
    return out;
  }
  const wins = (b, p) => moves(b, p).filter(m => m.t === OASIS);
  // 평가: 다음 수에 이길 수 있는 길(오아시스 옆 막이 + 같은 줄의 내 말)과 중앙선 장악
  function evalFor(b, p) {
    const q = 3 - p; let s = 0;
    const lineScore = who => {
      let v = 0;
      for (const [dr, dc] of DIR) { const g = (C + dr) * N + (C + dc); if (!b[g]) continue; // 오아시스 옆 막이가 있으면 반대편 줄에서 미끄러져 들어올 수 있음
        for (let k = 1; k <= C; k++) { const rr = C - dr * k, cc = C - dc * k; const i = rr * N + cc; if (b[i] === who) { v += 6; break; } if (b[i]) break; } }
      for (let i = 0; i < N * N; i++) if (b[i] === who) { const [r, c] = rc(i); if (r === C || c === C) v += 1.2; if (TERR[i] === 'grass') v += .8; v -= (Math.abs(r - C) + Math.abs(c - C)) * .05; }
      return v;
    };
    return lineScore(p) - lineScore(q) * 1.1;
  }
  let deadline = 0, timeUp = false, nodes = 0;
  function negamax(b, p, d, a, beta) {
    if ((++nodes & 511) === 0 && performance.now() > deadline) timeUp = true;
    if (timeUp) return 0;
    const ms = moves(b, p);
    if (ms.some(m => m.t === OASIS)) return 10000 + d;
    if (d === 0) return evalFor(b, p);
    ms.sort((x, y) => (TERR[y.t] !== 'desert') - (TERR[x.t] !== 'desert'));
    let best = -1e9;
    for (const m of ms) {
      b[m.t] = p; b[m.f] = 0;
      const v = -negamax(b, 3 - p, d - 1, -beta, -a);
      b[m.f] = p; b[m.t] = 0;
      if (timeUp) return 0;
      if (v > best) best = v; if (v > a) a = v; if (a >= beta) break;
    }
    return best;
  }
  function aiMove(b, p, lv) {
    const ms = moves(b, p); const w = ms.find(m => m.t === OASIS); if (w) return w;
    if (lv === 0 && Math.random() < .3) return ms[rnd(ms.length)];
    deadline = performance.now() + [250, 900, 2000][lv]; timeUp = false;
    let best = ms[0];
    for (let d = 1; d <= 8; d++) {
      let bv = -1e9, cand = null, a = -1e9;
      for (const m of ms) {
        b[m.t] = p; b[m.f] = 0;
        let v = -negamax(b, 3 - p, d - 1, -1e9, -a);
        b[m.f] = p; b[m.t] = 0;
        if (timeUp) break;
        v += (Math.random() - .5) * (lv === 0 ? 3 : lv === 1 ? .6 : .05);
        if (v > bv) { bv = v; cand = m; } if (v > a) a = v;
      }
      if (timeUp) break; if (cand) best = cand; if (bv > 9000) break;
    }
    return best;
  }

  LAB.add({
    id: 'horse', name: '말 달리자',
    rules: `<ul>
      <li>11×11 판 한가운데 <b>오아시스</b>, 그 주변 마름모 모양이 <b>초원</b>, 나머지는 <b>사막</b>이에요. 각자 말 10개를 두 귀퉁이에 5개씩 놓고 시작해요.</li>
      <li>내 차례에 말 하나를 아래 방법 중 하나로 움직여요.</li>
      <li><b>슬라이드</b>: 가로·세로로, 판 끝이나 다른 말에 막힐 때까지 쭉 미끄러져요. 중간에 멈출 수 없어요.</li>
      <li><b>L자 이동</b>: 체스 나이트처럼 움직여요. 단, 도착 칸이 <b>비어 있는 사막</b>일 때만 돼요.</li>
      <li>오아시스에 먼저 말을 세우면 그 라운드를 이겨요. 미끄러지다 멈춰야 하니, 오아시스 바로 옆에 막아 줄 말이 있어야 들어갈 수 있어요.</li>
      <li>3라운드 중 2라운드를 먼저 이기면 승리. 라운드마다 선이 바뀌어요.</li>
      <li>시작 배치는 방송 화면을 보고 정한 추정이에요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      const cfg = { opp: 'ai', lv: 1 }, pend = { ...cfg };
      let G = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dp-score"><div><small id="hN0">나 (검정)</small><b id="hS0">0</b></div><div class="dp-mid"><span id="hRound"></span><small id="hTurn"></small></div><div><small id="hN1">AI (주황)</small><b id="hS1">0</b></div></div>
          <svg class="hboard" id="hBoard" viewBox="0 0 572 572"></svg>
          <p class="g-msg" id="hMsg"></p>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정 (새 게임에 적용)</h3>
            <div class="opt"><span>상대</span><div id="hOpp"></div></div>
            <div class="opt"><span>AI 난이도</span><div id="hLv"></div></div>
            <div class="row"><button type="button" id="hUndo">↶ 무르기</button><button type="button" class="primary" id="hNew">새 게임</button></div></div>
          <div class="card"><h3>기록</h3><div class="log" id="hLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('hOpp').appendChild(seg([['ai', 'AI'], ['local', '한 화면 2인']], 'ai', v => pend.opp = v));
      $('hLv').appendChild(seg([[0, '쉬움'], [1, '보통'], [2, '어려움']], 1, v => pend.lv = v));
      $('hNew').onclick = start;
      $('hUndo').onclick = () => {
        if (!G || !G.hist.length || G.busy || G.roundOver) return;
        do { const s = G.hist.pop(); G.b = s.b; G.turn = s.turn; G.log.length = s.log; } while (G.hist.length && cfg.opp === 'ai' && G.turn !== 1);
        G.sel = null; render(); aiMaybe();
      };
      const human = () => !G.roundOver && (cfg.opp === 'local' || G.turn === 1);
      function start() { T.clear(); Object.assign(cfg, pend); G = { round: 0, wins: [0, 0], first: rnd(2) + 1, log: [] }; LAB.coin([who(1), who(2)], G.first - 1); $('hN1').textContent = cfg.opp === 'ai' ? 'AI (주황)' : '주황'; $('hN0').textContent = cfg.opp === 'ai' ? '나 (검정)' : '검정'; newRound(); }
      function newRound() {
        G.round++; G.b = initBoard(); G.turn = G.round === 1 ? G.first : (G.first + G.round - 1 - 1) % 2 + 1; G.sel = null; G.hist = []; G.roundOver = false; G.last = null;
        G.log.push(`— ${G.round}라운드 (${G.turn === 1 ? (cfg.opp === 'ai' ? '나' : '검정') : (cfg.opp === 'ai' ? 'AI' : '주황')} 선) —`);
        render(); aiMaybe();
      }
      const who = p => p === 1 ? (cfg.opp === 'ai' ? '나' : '검정') : (cfg.opp === 'ai' ? 'AI' : '주황');
      function play(m) {
        G.hist.push({ b: Int8Array.from(G.b), turn: G.turn, log: G.log.length });
        G.b[m.t] = G.turn; G.b[m.f] = 0; G.last = m; G.sel = null;
        G.log.push(`${who(G.turn)} ${name(m.f)}→${name(m.t)}${m.k === 'l' ? ' (L자)' : ''}`);
        if (m.t === OASIS) {
          G.roundOver = true; G.wins[G.turn - 1]++; render();
          const champ = G.wins.findIndex(x => x >= 2);
          if (champ >= 0) return T.set(() => LAB.end(cfg.opp === 'ai' ? (champ === 0 ? '승리' : '패배') : who(champ + 1) + ' 승리', `라운드 ${G.wins[0]} : ${G.wins[1]}`, start), 700);
          return T.set(newRound, 1800);
        }
        G.turn = 3 - G.turn;
        if (!moves(G.b, G.turn).length) { G.log.push(`${who(G.turn)} 움직일 수 없어 차례를 넘겨요`); G.turn = 3 - G.turn; }
        render(); aiMaybe();
      }
      function aiMaybe() {
        if (cfg.opp !== 'ai' || G.roundOver || G.turn !== 2) return;
        G.busy = true; render();
        T.set(() => { const t0 = performance.now(); const m = aiMove(Int8Array.from(G.b), 2, cfg.lv); T.set(() => { G.busy = false; play(m); }, Math.max(0, 500 - (performance.now() - t0))); }, 50);
      }
      const PAD = 22, S = 48, X = c => PAD + c * S;
      function render() {
        $('hS0').textContent = G.wins[0]; $('hS1').textContent = G.wins[1];
        LAB.roundBanner('horse', G.round, '3판 2선승');
        $('hRound').textContent = `${G.round}라운드 · 3판 2선승`;
        $('hTurn').textContent = G.roundOver ? '라운드 끝' : `${who(G.turn)} 차례`;
        const ms = human() && !G.busy && G.sel != null ? moves(G.b, G.turn).filter(m => m.f === G.sel) : [];
        let s = '';
        for (let i = 0; i < N * N; i++) { const [r, c] = rc(i); const t = TERR[i];
          s += `<rect x="${X(c)}" y="${X(r)}" width="${S - 2}" height="${S - 2}" rx="5" class="hc ${t}" data-i="${i}"/>`; }
        for (let k = 0; k < N; k++) s += `<text x="${X(k) + S / 2 - 1}" y="14" class="hl">${k + 1}</text><text x="10" y="${X(k) + S / 2 + 3}" class="hl">${ROWS[k]}</text>`;
        if (G.last) for (const i of [G.last.f, G.last.t]) { const [r, c] = rc(i); s += `<rect x="${X(c) + 3}" y="${X(r) + 3}" width="${S - 8}" height="${S - 8}" rx="5" class="hlast"/>`; }
        for (const m of ms) { const [r, c] = rc(m.t); s += `<circle cx="${X(c) + S / 2 - 1}" cy="${X(r) + S / 2 - 1}" r="${m.t === OASIS ? 14 : 9}" class="hdest ${m.t === OASIS ? 'win' : ''}" data-i="${m.t}"/>`; }
        for (let i = 0; i < N * N; i++) { if (!G.b[i]) continue; const [r, c] = rc(i);
          s += `<g class="hp p${G.b[i]} ${G.sel === i ? 'sel' : ''}" data-i="${i}"><circle cx="${X(c) + S / 2 - 1}" cy="${X(r) + S / 2 - 1}" r="17"/><path d="M${X(c) + 17} ${X(r) + 33}l4-14 6-5 4 3 4-2-2 7-4 2 1 9z" class="hh"/></g>`; }
        $('hBoard').innerHTML = s;
        let msg = '';
        if (G.roundOver) msg = `${who(G.b[OASIS])}가 오아시스에 도착했어요!`;
        else if (G.busy) msg = 'AI 생각 중…';
        else if (human()) msg = G.sel == null ? `움직일 ${G.turn === 1 ? '검정' : '주황'} 말을 고르세요` : '갈 곳을 고르세요 (초록 원 = 오아시스)';
        $('hMsg').textContent = msg;
        $('hLog').innerHTML = G.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
        $('hUndo').disabled = !G.hist.length || G.busy || G.roundOver;
      }
      $('hBoard').addEventListener('click', e => {
        const el = e.target.closest('[data-i]'); if (!el || !human() || G.busy) return;
        const i = +el.dataset.i;
        if (G.b[i] === G.turn) { G.sel = G.sel === i ? null : i; return render(); }
        if (G.sel != null) { const m = moves(G.b, G.turn).find(x => x.f === G.sel && x.t === i); if (m) return play(m); }
        G.sel = null; render();
      });
      LAB.ready(root, start); // 설정을 고르고 "게임 시작"을 눌러야 시작
      return () => T.clear();
    }
  });
})();
