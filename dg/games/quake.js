// 지각 변동 (데스게임 시즌2 준결승 2라운드, 1대1 규칙) — 무너지는 육각 타일 위에서 상대 말을 모두 고립시키기
(function () {
  const { h, esc, rnd, shuffle, seg } = LAB;
  const R = 7, Cn = 12, NT = R * Cn; // 84칸
  const rc = i => [Math.floor(i / Cn), i % Cn];
  // 홀수 줄이 오른쪽으로 반 칸 밀린 육각 배치 → 큐브 좌표로 직선 방향 계산
  const toCube = (r, c) => { const x = c - (r - (r & 1)) / 2, z = r; return [x, -x - z, z]; };
  const fromCube = (x, y, z) => { const r = z, c = x + (z - (z & 1)) / 2; return [r, c]; };
  const DIRS = [[1, -1, 0], [1, 0, -1], [0, 1, -1], [-1, 1, 0], [-1, 0, 1], [0, -1, 1]];
  const NB = []; const STEP = [];
  for (let i = 0; i < NT; i++) {
    const [r, c] = rc(i), [x, y, z] = toCube(r, c); NB[i] = []; STEP[i] = [];
    for (const [dx, dy, dz] of DIRS) { const [nr, nc] = fromCube(x + dx, y + dy, z + dz); const j = nr >= 0 && nr < R && nc >= 0 && nc < Cn ? nr * Cn + nc : -1; STEP[i].push(j); if (j >= 0) NB[i].push(j); }
  }
  const name = i => { const [r, c] = rc(i); return 'ABCDEFG'[r] + (c + 1); };
  // 상태: tile[i] 1=타일 있음, pc[i] 0/1/2 말
  const clone = s => ({ tile: Int8Array.from(s.tile), pc: Int8Array.from(s.pc), turn: s.turn, moves: s.moves.slice(), count: s.count.slice() });
  const isEdge = (s, i) => s.tile[i] && STEP[i].some(j => j < 0 || !s.tile[j]);
  function slides(s, p) {
    const out = [];
    for (let i = 0; i < NT; i++) if (s.pc[i] === p) for (let d = 0; d < 6; d++) {
      let cur = i;
      while (true) { const j = STEP[cur][d]; if (j < 0 || !s.tile[j] || s.pc[j]) break; cur = j; }
      if (cur !== i) out.push({ f: i, t: cur });
    }
    return out;
  }
  // 이동 후 정리: 출발 타일 제거 → (추가 제거) → 이웃 타일이 없는 타일·말 제거
  function cleanup(s) {
    let changed = true;
    while (changed) { changed = false;
      for (let i = 0; i < NT; i++) if (s.tile[i] && !NB[i].some(j => s.tile[j])) { s.tile[i] = 0; if (s.pc[i]) { s.count[s.pc[i] - 1]--; s.pc[i] = 0; } changed = true; } }
  }
  function applyMove(s, m, rem) {
    const p = s.pc[m.f]; s.pc[m.t] = p; s.pc[m.f] = 0; s.tile[m.f] = 0;
    if (rem != null && s.tile[rem] && !s.pc[rem]) s.tile[rem] = 0;
    cleanup(s); s.moves[p - 1]++; s.turn = 3 - p;
  }
  const needsRemove = (s, p) => s.moves[p - 1] >= 1; // 각자 첫 차례는 출발 타일만, 두 번째 차례부터 하나 더 제거
  // 평가: 말 수 + 각 말이 닿을 수 있는 영역과 이동 가능 방향
  function reach(s, p) {
    let v = 0; const seen = new Uint8Array(NT);
    for (let i = 0; i < NT; i++) if (s.pc[i] === p) {
      let mob = 0; for (let d = 0; d < 6; d++) { const j = STEP[i][d]; if (j >= 0 && s.tile[j] && !s.pc[j]) mob++; }
      v += mob * 1.5; if (!mob) v -= 4;
      if (!seen[i]) { const st = [i]; seen[i] = 1; let sz = 0; while (st.length) { const k = st.pop(); sz++; for (const j of NB[k]) if (s.tile[j] && !seen[j]) { seen[j] = 1; st.push(j); } } v += Math.min(sz, 30) * .3; }
    }
    return v;
  }
  const evalFor = (s, p) => (s.count[p - 1] - s.count[2 - p]) * 40 + reach(s, p) - reach(s, 3 - p);
  function removalCands(s, p, k) {
    const q = 3 - p, set = new Set();
    for (let i = 0; i < NT; i++) if (s.pc[i] === q) for (const j of NB[i]) if (s.tile[j] && !s.pc[j]) set.add(j);
    const rest = shuffle([...Array(NT).keys()].filter(i => s.tile[i] && !s.pc[i] && !set.has(i))).slice(0, k);
    return [...set, ...rest];
  }
  function bestTurn(s, p, lv) {
    const ms = slides(s, p); if (!ms.length) return null;
    const rem = needsRemove(s, p);
    let best = null, bv = -1e9;
    for (const m of ms) {
      const rs = rem ? removalCands(s, p, lv === 2 ? 8 : 4) : [null]; if (!rs.length) rs.push(null);
      for (const r of rs) {
        const t = clone(s); applyMove(t, m, r);
        let v = evalFor(t, p);
        if (t.count[2 - p] === 0) v += 1e5;
        if (lv === 2 && t.count[2 - p] > 0) { // 상대의 가장 아픈 응수 하나를 빠르게 확인
          const om = slides(t, 3 - p); let worst = 1e9;
          for (const o of om.slice(0, 24)) { const u = clone(t); applyMove(u, o, needsRemove(t, 3 - p) ? removalCands(u, 3 - p, 0)[0] : null); worst = Math.min(worst, evalFor(u, p)); }
          if (om.length) v = v * .4 + worst * .6;
        }
        v += (Math.random() - .5) * (lv === 0 ? 30 : lv === 1 ? 4 : .5);
        if (v > bv) { bv = v; best = { m, r }; }
      }
    }
    return best;
  }

  LAB.add({
    id: 'quake', name: '지각 변동',
    rules: `<ul>
      <li>육각 타일 84칸(7줄×12칸)에서 하는 1대1 게임이에요 (방송 준결승 2라운드 규칙).</li>
      <li>각자 말 5개. <b>후 플레이어부터</b> 번갈아 가장자리 빈 칸에 말을 하나씩 놓아요.</li>
      <li>내 차례에 말 하나를 여섯 방향 중 한 방향으로, 판 끝·빈 구멍·다른 말에 막힐 때까지 <b>쭉 미끄러뜨려요</b>. 빈 구멍은 건너뛸 수 없어요.</li>
      <li>말이 떠난 타일은 사라져요. 각자 첫 차례 뒤부터는 <b>원하는 빈 타일 하나를 더 없애요</b>.</li>
      <li>주변 타일이 모두 사라져 고립된 말과, 이어진 타일이 하나도 없는 칸은 바로 없어져요.</li>
      <li>말 5개를 모두 잃은 쪽이 져요. 움직일 수 있는 말이 없으면 차례를 넘겨요.</li>
      <li>미끄러지는 방식(끝까지 감)은 방송 설명을 기준으로 한 해석이에요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      const cfg = { opp: 'ai', lv: 1 }, pend = { ...cfg };
      let G = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dp-score"><div><small id="qN0">나 (파랑)</small><b id="qC0">5</b></div><div class="dp-mid"><span id="qPhase"></span><small id="qTurn"></small></div><div><small id="qN1">AI (빨강)</small><b id="qC1">5</b></div></div>
          <svg class="qboard" id="qBoard" viewBox="0 0 640 380"></svg>
          <p class="g-msg" id="qMsg"></p>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정 (새 게임에 적용)</h3>
            <div class="opt"><span>상대</span><div id="qOpp"></div></div>
            <div class="opt"><span>AI 난이도</span><div id="qLv"></div></div>
            <button type="button" class="primary" id="qNew">새 게임</button></div>
          <div class="card"><h3>기록</h3><div class="log" id="qLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('qOpp').appendChild(seg([['ai', 'AI'], ['local', '한 화면 2인']], 'ai', v => pend.opp = v));
      $('qLv').appendChild(seg([[0, '쉬움'], [1, '보통'], [2, '어려움']], 1, v => pend.lv = v));
      $('qNew').onclick = start;
      const who = p => p === 1 ? (cfg.opp === 'ai' ? '나' : '파랑') : (cfg.opp === 'ai' ? 'AI' : '빨강');
      function start() {
        T.clear(); Object.assign(cfg, pend);
        const first = rnd(2) + 1; // 선 플레이어
        G = { s: { tile: new Int8Array(NT).fill(1), pc: new Int8Array(NT), turn: 3 - first, moves: [0, 0], count: [0, 0] }, first, phase: 'place', placed: [0, 0], sel: null, pendMove: null, log: [`${who(first)}가 선, ${who(3 - first)}부터 말을 놓아요`], over: false };
        $('qN0').textContent = cfg.opp === 'ai' ? '나 (파랑)' : '파랑'; $('qN1').textContent = cfg.opp === 'ai' ? 'AI (빨강)' : '빨강';
        render(); aiMaybe();
      }
      const human = () => !G.over && (cfg.opp === 'local' || G.s.turn === 1);
      function place(i) {
        const s = G.s, p = s.turn; s.pc[i] = p; s.count[p - 1]++; G.placed[p - 1]++;
        G.log.push(`${who(p)} 말 → ${name(i)}`);
        if (G.placed[0] === 5 && G.placed[1] === 5) { G.phase = 'play'; s.turn = G.first; G.log.push('— 이동 시작 —'); }
        else s.turn = 3 - p;
        render(); aiMaybe();
      }
      function commit(m, r) {
        const s = G.s, p = s.turn, before = s.count.slice();
        applyMove(s, m, r);
        let t = `${who(p)} ${name(m.f)}→${name(m.t)}`; if (r != null) t += ` · ${name(r)} 타일 제거`;
        const lost = [before[0] - s.count[0], before[1] - s.count[1]];
        if (lost[0]) t += ` · ${who(1)} 말 ${lost[0]}개 고립`; if (lost[1]) t += ` · ${who(2)} 말 ${lost[1]}개 고립`;
        G.log.push(t); G.sel = null; G.pendMove = null; G.last = { f: m.f, t: m.t, r };
        if (!s.count[0] || !s.count[1]) {
          G.over = true; render();
          const res = !s.count[0] && !s.count[1] ? '무승부' : (!s.count[1] ? (cfg.opp === 'ai' ? '승리' : '파랑 승리') : (cfg.opp === 'ai' ? '패배' : '빨강 승리'));
          return T.set(() => LAB.end(res, `남은 말 ${s.count[0]} : ${s.count[1]}`, start), 600);
        }
        if (!slides(s, s.turn).length) { G.log.push(`${who(s.turn)} 움직일 말이 없어 차례를 넘겨요`); s.turn = 3 - s.turn; if (!slides(s, s.turn).length) { G.over = true; render(); return LAB.end('무승부', '둘 다 움직일 수 없어요', start); } }
        render(); aiMaybe();
      }
      function aiMaybe() {
        if (cfg.opp !== 'ai' || G.over || G.s.turn !== 2) return;
        G.busy = true; render();
        T.set(() => {
          const s = G.s;
          if (G.phase === 'place') {
            const edges = [...Array(NT).keys()].filter(i => isEdge(s, i) && !s.pc[i]);
            // 상대 말 근처를 막고, 내 말끼리는 떨어뜨림
            let best = edges[0], bv = -1e9;
            for (const i of edges) { let v = Math.random() * (cfg.lv === 0 ? 6 : 1); for (let j = 0; j < NT; j++) if (s.pc[j]) { const d = Math.hypot(rc(i)[0] - rc(j)[0], rc(i)[1] - rc(j)[1]); v += s.pc[j] === 2 ? Math.min(d, 5) * .6 : -Math.max(0, 3 - d) * .3; } const mob = (() => { const t = clone(s); t.pc[i] = 2; return slides(t, 2).filter(m => m.f === i).length; })(); v += mob; if (v > bv) { bv = v; best = i; } }
            G.busy = false; place(best);
          } else {
            const b = bestTurn(clone(s), 2, cfg.lv); G.busy = false;
            if (b) commit(b.m, b.r);
          }
        }, 700);
      }
      // 그리기
      const HS = 26, W = Math.sqrt(3) * HS;
      const cx = i => { const [r, c] = rc(i); return 40 + c * W + (r & 1 ? W / 2 : 0); };
      const cy = i => { const [r] = rc(i); return 40 + r * HS * 1.5; };
      const hexPath = (x, y, s) => Array.from({ length: 6 }, (_, k) => { const a = Math.PI / 180 * (60 * k - 30); return `${(x + s * Math.cos(a)).toFixed(1)},${(y + s * Math.sin(a)).toFixed(1)}`; }).join(' ');
      function render() {
        const s = G.s;
        $('qC0').textContent = G.phase === 'place' ? `${G.placed[0]}/5` : s.count[0]; $('qC1').textContent = G.phase === 'place' ? `${G.placed[1]}/5` : s.count[1];
        $('qPhase').textContent = G.phase === 'place' ? '말 배치' : '이동';
        $('qTurn').textContent = G.over ? '게임 끝' : `${who(s.turn)} 차례`;
        let targets = [], remMode = false;
        if (human() && !G.busy) {
          if (G.phase === 'place') targets = [...Array(NT).keys()].filter(i => isEdge(s, i) && !s.pc[i]);
          else if (G.pendMove) { remMode = true; targets = [...Array(NT).keys()].filter(i => s.tile[i] && !s.pc[i] && i !== G.pendMove.f); }
          else if (G.sel != null) targets = slides(s, s.turn).filter(m => m.f === G.sel).map(m => m.t);
        }
        // 이동 대기 중이면 미리 보기
        const view = G.pendMove ? (() => { const t = clone(s); t.pc[G.pendMove.t] = t.pc[G.pendMove.f]; t.pc[G.pendMove.f] = 0; t.tile[G.pendMove.f] = 0; return t; })() : s;
        let out = '';
        for (let i = 0; i < NT; i++) {
          if (!view.tile[i]) { out += `<polygon points="${hexPath(cx(i), cy(i), HS - 2)}" class="qh gone"/>`; continue; }
          const tg = targets.includes(i);
          out += `<polygon points="${hexPath(cx(i), cy(i), HS - 2)}" class="qh ${tg ? (remMode ? 'rem' : 'tg') : ''} ${G.last && (G.last.t === i) ? 'last' : ''}" data-i="${i}"/>`;
        }
        for (let i = 0; i < NT; i++) if (view.pc[i]) out += `<circle cx="${cx(i)}" cy="${cy(i)}" r="13" class="qp p${view.pc[i]} ${G.sel === i ? 'sel' : ''}" data-i="${i}"/>`;
        $('qBoard').innerHTML = out;
        let msg = '';
        if (G.over) msg = '게임 끝';
        else if (G.busy) msg = 'AI 생각 중…';
        else if (!human()) msg = '상대 차례';
        else if (G.phase === 'place') msg = '가장자리 빈 칸에 말을 놓으세요';
        else if (G.pendMove) msg = '없앨 타일을 하나 고르세요 (말이 없는 칸)';
        else if (G.sel == null) msg = '움직일 말을 고르세요' + (needsRemove(s, s.turn) ? ' (이동 뒤 타일 하나를 더 없애요)' : ' (첫 차례는 출발 타일만 사라져요)');
        else msg = '미끄러질 방향의 도착 칸을 고르세요';
        $('qMsg').textContent = msg;
        $('qLog').innerHTML = G.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
      }
      $('qBoard').addEventListener('click', e => {
        const el = e.target.closest('[data-i]'); if (!el || !human() || G.busy) return;
        const i = +el.dataset.i, s = G.s;
        if (G.phase === 'place') { if (isEdge(s, i) && !s.pc[i]) place(i); return; }
        if (G.pendMove) { if (s.tile[i] && !s.pc[i] && i !== G.pendMove.f && i !== G.pendMove.t) commit(G.pendMove, i); return; }
        if (s.pc[i] === s.turn) { G.sel = G.sel === i ? null : i; return render(); }
        if (G.sel != null) { const m = slides(s, s.turn).find(x => x.f === G.sel && x.t === i); if (m) { if (needsRemove(s, s.turn)) { G.pendMove = m; render(); } else commit(m, null); return; } }
        G.sel = null; render();
      });
      LAB.ready(root, start); // 설정을 고르고 "게임 시작"을 눌러야 시작
      return () => T.clear();
    }
  });
})();
