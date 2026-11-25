// 기억의 미로 (더 지니어스 시즌3 데스매치) — 보이지 않는 벽 32개가 있는 7×7 미로, 부딪히면 출발점으로
(function () {
  const { h, esc, rnd, shuffle, seg } = LAB;
  const N = 7, START = 6 * N + 0, GOAL = 0 * N + 6;
  const ek = (a, b) => a < b ? a + '-' + b : b + '-' + a;
  const EDGES = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const i = r * N + c; if (c < N - 1) EDGES.push(ek(i, i + 1)); if (r < N - 1) EDGES.push(ek(i, i + N)); }
  const NB = i => { const r = Math.floor(i / N), c = i % N, o = []; if (r) o.push(i - N); if (r < N - 1) o.push(i + N); if (c) o.push(i - 1); if (c < N - 1) o.push(i + 1); return o; };
  function path(walls, from, to) { // walls: Set 차단된 변
    const prev = new Map([[from, -1]]), q = [from];
    while (q.length) { const i = q.shift(); if (i === to) break; for (const j of NB(i)) if (!prev.has(j) && !walls.has(ek(i, j))) { prev.set(j, i); q.push(j); } }
    if (!prev.has(to)) return null; const p = []; for (let x = to; x !== -1; x = prev.get(x)) p.unshift(x); return p;
  }
  function makeWalls() {
    for (let t = 0; t < 500; t++) { const w = new Set(shuffle(EDGES.slice()).slice(0, 32)); const p = path(w, START, GOAL); if (p && p.length >= 13) return w; }
    return new Set(shuffle(EDGES.slice()).slice(0, 32));
  }

  LAB.add({
    id: 'memmaze', name: '기억의 미로', show: '더 지니어스',
    rules: `<ul>
      <li>7×7 미로에 <b>보이지 않는 벽 32개</b>가 있어요. 두 사람 모두 왼쪽 아래에서 출발해 오른쪽 위 도착점을 노려요.</li>
      <li>내 차례에 <b>최대 3칸</b>을 한 칸씩 움직여요(상하좌우). 벽에 부딪히면 그 벽이 잠깐 보이고, <b>출발점으로 돌아가며</b> 차례가 끝나요.</li>
      <li>게임 중 한 번 <b>더블 찬스</b>로 6칸까지 움직일 수 있어요.</li>
      <li>상대가 부딪힌 벽도 같이 보이니 모두 외워 두세요. 먼저 도착점에 닿으면 이겨요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      let pend = { lv: 1, show: false }, cfg = { ...pend }, G = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dp-score"><div><small>나 (파랑)</small><b id="mmMe">—</b></div><div class="dp-mid"><span id="mmTurn"></span><small id="mmSteps"></small></div><div><small>AI (빨강)</small><b id="mmAi">—</b></div></div>
          <svg class="mm-board" id="mmB" viewBox="-6 -6 712 712"></svg>
          <p class="g-msg" id="mmMsg"></p>
          <div class="row"><button type="button" id="mmDouble">더블 찬스 (6칸)</button><button type="button" class="primary" id="mmEnd">차례 끝내기</button></div>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정 (새 게임에 적용)</h3>
            <div class="opt"><span>AI 기억력</span><div id="mmLv"></div></div>
            <div class="opt"><span>찾은 벽 표시</span><div id="mmShow"></div></div>
            <button type="button" class="primary" id="mmNew">새 게임</button></div>
          <div class="card"><h3>기록</h3><div class="log" id="mmLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('mmLv').appendChild(seg([[0, '깜빡깜빡'], [1, '보통'], [2, '완벽']], 1, v => pend.lv = v));
      $('mmShow').appendChild(seg([[false, '가림 (방송 규칙)'], [true, '보임 (연습)']], false, v => pend.show = v));
      $('mmNew').onclick = start;
      $('mmEnd').onclick = () => { if (G && G.turn === 0 && G.steps > 0 && !G.over) endTurn(); };
      $('mmDouble').onclick = () => { if (G && G.turn === 0 && G.dbl[0] && G.steps === 0 && !G.over) { G.dbl[0] = false; G.limit = 6; G.log.push('나: 더블 찬스!'); render(); } };
      const who = p => p ? 'AI' : '나';
      function start() {
        T.clear(); cfg = { ...pend };
        G = { walls: makeWalls(), known: new Set(), aiMem: new Set(), pos: [START, START], turn: rnd(2), steps: 0, limit: 3, dbl: [true, true], log: [], over: false, flash: null };
        G.log.push(`선: ${who(G.turn)}`); LAB.coin(['나', 'AI'], G.turn); render(); aiMaybe();
      }
      function step(p, to) {
        const from = G.pos[p], e = ek(from, to);
        if (G.walls.has(e)) {
          G.known.add(e); if (Math.random() < [0.65, 0.9, 1][cfg.lv]) G.aiMem.add(e);
          G.flash = { e, until: Date.now() + 2200 }; G.pos[p] = START;
          G.log.push(`${who(p)}: 벽에 부딪혀 출발점으로!`); render(); T.set(render, 2300);
          endTurn(); return false;
        }
        G.pos[p] = to; G.steps++;
        if (to === GOAL) { G.over = true; G.log.push(`${who(p)}: 도착!`); render(); T.set(() => LAB.end(p === 0 ? '승리' : '패배', `${who(p)}가 먼저 도착했어요`, start), 500); return false; }
        if (G.steps >= G.limit) { endTurn(); return false; }
        render(); return true;
      }
      function endTurn() { G.turn = 1 - G.turn; G.steps = 0; G.limit = 3; render(); aiMaybe(); }
      function aiMaybe() {
        if (G.over || G.turn !== 1) return;
        T.set(() => {
          const known = new Set(G.aiMem); let p = path(known, G.pos[1], GOAL);
          if (!p) { G.aiMem.clear(); p = path(new Set(), G.pos[1], GOAL); }
          const remain = p.length - 1;
          if (G.dbl[1] && remain >= 4 && remain <= 6 && cfg.lv > 0) { G.dbl[1] = false; G.limit = 6; G.log.push('AI: 더블 찬스!'); }
          const moves = p.slice(1, 1 + G.limit);
          if (cfg.lv === 0 && Math.random() < .25) { const alt = NB(G.pos[1]); moves[0] = alt[rnd(alt.length)]; moves.length = 1; }
          let k = 0;
          const go = () => { if (G.over || G.turn !== 1) return; const ok = step(1, moves[k++]); if (ok && k < moves.length) T.set(go, 550); else if (ok) endTurn(); };
          go();
        }, 900);
      }
      const S = 100;
      function render() {
        $('mmTurn').textContent = G.over ? '게임 끝' : `${who(G.turn)} 차례`;
        $('mmSteps').textContent = G.over ? '' : `${G.steps}/${G.limit}칸 · 더블 찬스 나 ${G.dbl[0] ? '남음' : '씀'} / AI ${G.dbl[1] ? '남음' : '씀'}`;
        $('mmMe').textContent = G.pos[0] === START ? '출발' : `도착까지 ${Math.abs(Math.floor(G.pos[0] / N) - 0) + Math.abs(G.pos[0] % N - 6)}칸+`;
        $('mmAi').textContent = G.pos[1] === START ? '출발' : `도착까지 ${Math.abs(Math.floor(G.pos[1] / N) - 0) + Math.abs(G.pos[1] % N - 6)}칸+`;
        const my = !G.over && G.turn === 0;
        const nb = my ? NB(G.pos[0]) : [];
        let s = '';
        for (let i = 0; i < N * N; i++) { const r = Math.floor(i / N), c = i % N;
          s += `<rect x="${c * S + 3}" y="${r * S + 3}" width="${S - 6}" height="${S - 6}" rx="8" class="mm-c ${i === START ? 'st' : ''} ${i === GOAL ? 'goal' : ''} ${nb.includes(i) ? 'can' : ''}" data-i="${i}"/>`;
          if (i === GOAL) s += `<text x="${c * S + 50}" y="${r * S + 60}" class="mm-l">도착</text>`;
          if (i === START) s += `<text x="${c * S + 50}" y="${r * S + 60}" class="mm-l">출발</text>`;
        }
        const now = Date.now();
        const showE = e => (cfg.show && G.known.has(e)) || G.over && G.walls.has(e) || (G.flash && G.flash.e === e && G.flash.until > now);
        for (const e of EDGES) { if (!showE(e)) continue; const [a, b] = e.split('-').map(Number); const ra = Math.floor(a / N), ca = a % N;
          const flash = G.flash && G.flash.e === e && G.flash.until > now;
          if (b === a + 1) s += `<line x1="${(ca + 1) * S}" y1="${ra * S + 4}" x2="${(ca + 1) * S}" y2="${(ra + 1) * S - 4}" class="mm-w ${flash ? 'flash' : ''}"/>`;
          else s += `<line x1="${ca * S + 4}" y1="${(ra + 1) * S}" x2="${(ca + 1) * S - 4}" y2="${(ra + 1) * S}" class="mm-w ${flash ? 'flash' : ''}"/>`; }
        for (const p of [0, 1]) { const i = G.pos[p], x = (i % N) * S + 50 + (p ? 14 : -14), y = Math.floor(i / N) * S + 50 + (p ? 14 : -14); s += `<circle cx="${x}" cy="${y}" r="17" class="mm-p p${p}"/>`; }
        $('mmB').innerHTML = s;
        $('mmEnd').disabled = !my || G.steps === 0; $('mmDouble').disabled = !my || !G.dbl[0] || G.steps > 0;
        $('mmMsg').textContent = G.over ? '게임 끝 — 벽이 모두 공개됐어요' : my ? `밝은 칸을 눌러 한 칸씩 움직이세요 (${G.limit - G.steps}칸 더 갈 수 있어요)` : 'AI가 움직이는 중…';
        $('mmLog').innerHTML = G.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
      }
      $('mmB').addEventListener('click', e => { const el = e.target.closest('[data-i]'); if (!el || !G || G.over || G.turn !== 0) return; const i = +el.dataset.i; if (NB(G.pos[0]).includes(i)) step(0, i); });
      LAB.ready(root, start); // 설정을 고르고 "게임 시작"을 눌러야 시작
      return () => T.clear();
    }
  });
})();
