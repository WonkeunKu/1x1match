// 망각의 지뢰 1·2 (데스게임 시즌1 6회차 / 시즌2 6강) — 내 지뢰는 외우고, 상대 지뢰는 추리하며 보물 찾기
(function () {
  const { h, esc, rnd, shuffle, seg } = LAB;
  const N = 11, ROWS = 'abcdefghijk';
  const rc = i => [Math.floor(i / N), i % N], id = (r, c) => r * N + c, nm = i => { const [r, c] = rc(i); return ROWS[r] + (c + 1); };
  const START = [id(0, 10), id(10, 0)]; // 나: a11, AI: k1
  const ZONE = [[id(0, 9), id(1, 9), id(1, 10)], [id(9, 0), id(9, 1), id(10, 1)]];
  const TREASURE = [id(5, 5), id(0, 0), id(10, 10)];
  const NB8 = i => { const [r, c] = rc(i), o = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < N && nc >= 0 && nc < N) o.push(id(nr, nc)); } return o; };
  const cheb = (a, b) => { const [r1, c1] = rc(a), [r2, c2] = rc(b); return Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2)); };
  const ALLOWED = [...Array(N * N).keys()].filter(i => !TREASURE.includes(i) && START.every(s => cheb(s, i) > 2));

  LAB.add({
    id: 'mines', name: '망각의 지뢰',
    rules: `<ul>
      <li>11×11 판. 가운데(f6)와 두 모서리(a1, k11)에 보물이 있고, 내 출발은 a11, 상대 출발은 k1이에요.</li>
      <li>시작 전에 각자 지뢰를 몰래 묻어요 (출발 지점 2칸 안과 보물 칸은 금지). 지뢰 위치는 판에 표시되지 않아 <b>외워야</b> 해요. 두 사람이 같은 칸에 묻으면 지뢰 2개가 돼요.</li>
      <li>내 차례에 말을 주변 8칸 중 한 곳으로 옮겨요 (상대 말 칸 제외).</li>
      <li><b>빈 칸</b>: 주변 8칸의 지뢰 수만큼 점수 (지뢰 2개 칸은 2점). 이미 누가 점수를 받은 칸은 다시 점수가 없어요.</li>
      <li><b>지뢰</b>: 누구 지뢰든 밟으면 −5점, 지뢰는 사라지고 내 출발 구역 3칸 중 하나로 돌아가요.</li>
      <li><b>보물</b>: 찾은 순서대로 +10 / +15 / +20점 (망각의 지뢰2는 +15 / +20 / +25). 보물 3개가 다 나오면 끝, 점수가 높은 쪽이 이겨요.</li>
      <li><b>망각의 지뢰2</b>: 지뢰 12개 + 시한폭탄 3개(번호 1~3, 주변 점수 계산 때 2점). 내 차례에 "n번 발동"을 선언하면 상대가 두 번 움직인 뒤 그 폭탄 주변 9칸이 터져요(안에 있으면 −5, 출발 구역으로). 출발 구역은 안전. 발동 안 된 폭탄은 밟아도 그냥 지나가요. 70턴이 지나도 끝나요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      let pend = { mode: 1, lv: 1, show: false }, cfg = { ...pend }, G = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dp-score"><div><small>나 (파랑)</small><b id="mMe">0</b></div><div class="dp-mid"><span id="mPhase"></span><small id="mSub"></small></div><div><small>AI (빨강)</small><b id="mAi">0</b></div></div>
          <svg class="mboard" id="mBoard" viewBox="0 0 552 552"></svg>
          <p class="g-msg" id="mMsg"></p>
          <div class="row" id="mActs"></div>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정 (새 게임에 적용)</h3>
            <div class="opt"><span>규칙</span><div id="mMode"></div></div>
            <div class="opt"><span>AI 난이도</span><div id="mLv"></div></div>
            <div class="opt"><span>내 지뢰 위치</span><div id="mShow"></div></div>
            <button type="button" class="primary" id="mNew">새 게임</button></div>
          <div class="card"><h3>진행</h3><div class="log" id="mLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('mMode').appendChild(seg([[1, '망각의 지뢰'], [2, '망각의 지뢰2']], 1, v => pend.mode = v));
      $('mLv').appendChild(seg([[0, '쉬움'], [1, '보통'], [2, '어려움']], 1, v => pend.lv = v));
      $('mShow').appendChild(seg([[false, '가림 (방송 규칙)'], [true, '보임 (연습)']], false, v => pend.show = v));
      $('mNew').onclick = start;

      function start() {
        T.clear(); cfg = { ...pend };
        const nm2 = cfg.mode === 2;
        G = { phase: 'setup', mines: [new Set(), new Set()], bombs: [[], []], need: nm2 ? 12 : 15, pos: START.slice(), score: [0, 0], scored: new Set(), treasures: new Set(TREASURE), found: 0,
          turn: rnd(2), turns: 0, log: [], armed: [], obs: [], placingBomb: false, over: false, boom: [] };
        // AI 지뢰: 보물 가는 길목과 상대(나) 출발 쪽에 많이
        const cand = shuffle(ALLOWED.slice()).sort((a, b) => (cheb(a, START[0]) + Math.min(...TREASURE.map(t => cheb(a, t))) * .6) - (cheb(b, START[0]) + Math.min(...TREASURE.map(t => cheb(b, t))) * .6) + (Math.random() - .5) * 6);
        cand.slice(0, G.need).forEach(i => G.mines[1].add(i));
        if (nm2) G.bombs[1] = cand.slice(G.need, G.need + 3).map((cell, k) => ({ no: k + 1, cell, used: false }));
        G.log.push(`지뢰를 ${G.need}개${nm2 ? ', 시한폭탄 3개를' : ''} 묻으세요. 선: ${G.turn === 0 ? '나' : 'AI'}`);
        render();
      }
      const mineCount = cell => (G.mines[0].has(cell) ? 1 : 0) + (G.mines[1].has(cell) ? 1 : 0);
      const bombAt = cell => G.bombs.flat().filter(b => !b.gone && b.cell === cell);
      function adjScore(cell) { let v = 0; for (const j of NB8(cell)) { v += mineCount(j); v += bombAt(j).length * 2; } return v; }
      function setupClick(i) {
        if (!ALLOWED.includes(i)) return;
        const m = G.mines[0], b = G.bombs[0];
        const hasB = b.find(x => x.cell === i);
        if (m.has(i)) { m.delete(i); } else if (hasB) { G.bombs[0] = b.filter(x => x !== hasB).map((x, k) => ({ ...x, no: k + 1 })); }
        else if (G.placingBomb) { if (b.length < 3) b.push({ no: b.length + 1, cell: i, used: false }); }
        else if (m.size < G.need) m.add(i);
        render();
      }
      function beginPlay() {
        G.phase = 'play'; G.publicCells = new Set([...G.mines[0], ...G.mines[1]]).size;
        G.log.push(`— 시작! 지뢰가 묻힌 칸은 ${G.publicCells}칸이에요 (같은 칸에 2개 묻힌 곳 ${G.mines[0].size + G.mines[1].size - G.publicCells}칸) —`);
        render(); next();
      }
      const legal = p => NB8(G.pos[p]).filter(j => j !== G.pos[1 - p]);
      function move(p, to, declareNo) {
        const who = p ? 'AI' : '나';
        if (declareNo) { const b = G.bombs[p].find(x => x.no === declareNo && !x.used); if (b) { b.used = true; G.armed.push({ owner: p, cell: b.cell, no: b.no, left: 2, b }); G.log.push(`${who}: ${b.no}번 시한폭탄 발동!`); } }
        G.pos[p] = to; G.turns++;
        let txt = `${who} → ${nm(to)}`;
        const mc = mineCount(to);
        if (mc) {
          G.score[p] -= 5; G.mines[0].delete(to); G.mines[1].delete(to);
          txt += ` · 지뢰${mc > 1 ? ' 2개' : ''}! −5`; G.boom.push(to);
          G.log.push(txt); G.obs.push({ cell: to, mine: true });
          G.pendingRespawn = p; render();
          if (p === 1) T.set(() => respawn(1, ZONE[1].filter(z => z !== G.pos[0])[0] ?? ZONE[1][0]), 700);
          return;
        }
        if (G.treasures.has(to)) {
          const val = (cfg.mode === 2 ? [15, 20, 25] : [10, 15, 20])[G.found]; G.found++; G.treasures.delete(to); G.score[p] += val; txt += ` · 보물 +${val}`;
        } else if (!G.scored.has(to)) {
          const v = adjScore(to); G.scored.add(to); G.score[p] += v; txt += ` +${v}`; G.obs.push({ cell: to, v });
        } else txt += ' (이미 점수 받은 칸 +0)';
        G.log.push(txt); afterMove(p);
      }
      function respawn(p, cell) {
        G.pos[p] = cell; G.pendingRespawn = null;
        let txt = `${p ? 'AI' : '나'} 출발 구역 ${nm(cell)}로 돌아감`;
        if (!G.scored.has(cell)) { const v = adjScore(cell); G.scored.add(cell); G.score[p] += v; txt += ` +${v}`; G.obs.push({ cell, v }); }
        G.log.push(txt); afterMove(p);
      }
      function afterMove(p) {
        // 시한폭탄: 상대가 두 번 움직인 뒤 폭발
        for (const a of G.armed.slice()) if (a.owner !== p) { a.left--; if (a.left <= 0) explode(a); }
        if (G.found >= 3 || (cfg.mode === 2 && G.turns >= 70)) return finish();
        G.turn = 1 - p; render(); next();
      }
      function explode(a) {
        G.armed = G.armed.filter(x => x !== a); a.b.gone = true;
        const area = [a.cell, ...NB8(a.cell)];
        G.log.push(`${a.owner ? 'AI' : '내'} ${a.no}번 시한폭탄 폭발 (${nm(a.cell)} 주변)`); G.boom.push(a.cell);
        for (const q of [0, 1]) if (area.includes(G.pos[q]) && !ZONE[q].includes(G.pos[q]) && G.pos[q] !== START[q]) {
          G.score[q] -= 5; const z = ZONE[q].find(c => c !== G.pos[1 - q]) ?? ZONE[q][0]; G.pos[q] = z; G.log.push(`${q ? 'AI' : '나'} 폭발에 휘말려 −5, ${nm(z)}로`);
        }
      }
      function finish() {
        G.over = true; G.phase = 'over'; render();
        const d = G.score[0] - G.score[1];
        LAB.end(d > 0 ? '승리' : d < 0 ? '패배' : '무승부', `최종 ${G.score[0]} : ${G.score[1]}`, start);
      }
      function next() { if (G.over || G.phase !== 'play') return; if (G.turn === 1) T.set(aiTurn, 900); }
      // AI: 자기 지뢰는 기억, 내 지뢰는 점수 결과로 추리
      function humanMineProb() {
        const p = new Float64Array(N * N); const base = Math.max(0, G.mines[0].size) / ALLOWED.length; // 남은 개수는 AI가 직접 알 수 없지만 처음 개수로 근사
        const dens = (G.need - G.boom.length / 2) / ALLOWED.length;
        for (const i of ALLOWED) p[i] = dens;
        for (const o of G.obs) if (o.v != null) {
          const nb = NB8(o.cell); let known = 0; const unk = [];
          for (const j of nb) { known += (G.mines[1].has(j) ? 1 : 0) + bombAt(j).filter(b => G.bombs[1].includes(b)).length * 2; if (ALLOWED.includes(j) && !G.scored.has(j) && !G.mines[1].has(j)) unk.push(j); }
          const rest = Math.max(0, o.v - known);
          const q = unk.length ? Math.min(1, rest / unk.length) : 0;
          for (const j of unk) p[j] = rest === 0 ? 0 : Math.max(p[j], q);
        }
        for (const s of G.scored) p[s] = 0;
        return p;
      }
      function aiTurn() {
        if (G.over) return;
        const lv = cfg.lv, opts = legal(1), prob = humanMineProb();
        const forget = lv === 0 ? .35 : lv === 1 ? .08 : 0;
        let best = opts[0], bv = -1e9;
        for (const c of opts) {
          let v = 0;
          const ownMine = G.mines[1].has(c) && Math.random() >= forget;
          if (ownMine) v -= 50;
          const pm = prob[c] || 0; v -= pm * 8;
          if (G.treasures.has(c)) v += 30;
          if (!G.scored.has(c) && !G.treasures.has(c)) { let known = 0, exp = 0; for (const j of NB8(c)) { known += G.mines[1].has(j) ? 1 : 0; exp += prob[j] || 0; } v += (known + exp) * (1 - pm); }
          const dt = Math.min(...[...G.treasures].map(t => cheb(c, t)), 20); v -= dt * 1.6;
          v += (Math.random() - .5) * (lv === 0 ? 6 : lv === 1 ? 2 : .5);
          if (v > bv) { bv = v; best = c; }
        }
        let dec = null;
        if (cfg.mode === 2) { const ready = G.bombs[1].filter(b => !b.used); const near = ready.find(b => cheb(b.cell, G.pos[0]) <= 2 && !ZONE[0].includes(G.pos[0])); if (near && Math.random() < (lv === 0 ? .3 : .7)) dec = near.no; }
        move(1, best, dec);
      }
      const PAD = 22, S = 46, X = c => PAD + c * S;
      function render() {
        $('mMe').textContent = G.score[0]; $('mAi').textContent = G.score[1];
        const setup = G.phase === 'setup';
        $('mPhase').textContent = setup ? '지뢰 묻기' : G.over ? '게임 끝' : `${G.turn === 0 ? '내' : 'AI'} 차례`;
        $('mSub').textContent = setup ? `지뢰 ${G.mines[0].size}/${G.need}${cfg.mode === 2 ? ` · 폭탄 ${G.bombs[0].length}/3` : ''}` : `보물 ${G.found}/3${cfg.mode === 2 ? ` · ${G.turns}/70턴` : ''}${G.publicCells ? ` · 지뢰 칸 ${G.publicCells}` : ''}`;
        const myTurn = G.phase === 'play' && G.turn === 0 && !G.over;
        const resp = G.pendingRespawn === 0;
        const dests = resp ? ZONE[0].filter(z => z !== G.pos[1]) : myTurn && G.pendingRespawn == null ? legal(0) : [];
        const showMine = setup || cfg.show || G.over;
        let s = '';
        for (let i = 0; i < N * N; i++) { const [r, c] = rc(i);
          const allowed = ALLOWED.includes(i), sc = G.scored.has(i), zone = ZONE[0].includes(i) || ZONE[1].includes(i) || START.includes(i);
          s += `<rect x="${X(c)}" y="${X(r)}" width="${S - 2}" height="${S - 2}" rx="4" class="mc ${zone ? 'zone' : ''} ${sc ? 'scored' : ''} ${setup && !allowed ? 'ban' : ''}" data-i="${i}"/>`; }
        for (let k = 0; k < N; k++) s += `<text x="${X(k) + S / 2 - 1}" y="14" class="hl">${k + 1}</text><text x="10" y="${X(k) + S / 2 + 3}" class="hl">${ROWS[k]}</text>`;
        for (const t of G.treasures) { const [r, c] = rc(t); s += `<path d="M${X(c) + 22} ${X(r) + 8}l12 10-12 18-12-18z" class="mt"/>`; }
        for (const b of G.boom) { const [r, c] = rc(b); s += `<circle cx="${X(c) + 22}" cy="${X(r) + 22}" r="6" class="mboom"/>`; }
        if (showMine) {
          for (const m of G.mines[0]) { const [r, c] = rc(m); s += `<circle cx="${X(c) + 22}" cy="${X(r) + 22}" r="9" class="mm mine0"/>`; }
          for (const b of G.bombs[0]) if (!b.gone) { const [r, c] = rc(b.cell); s += `<rect x="${X(c) + 12}" y="${X(r) + 12}" width="20" height="20" rx="4" class="mm bomb0"/><text x="${X(c) + 22}" y="${X(r) + 27}" class="mno">${b.no}</text>`; }
          if (G.over) { for (const m of G.mines[1]) { const [r, c] = rc(m); s += `<circle cx="${X(c) + 22}" cy="${X(r) + 22}" r="6" class="mm mine1"/>`; } }
        }
        for (const a of G.armed) { const [r, c] = rc(a.cell); s += `<rect x="${X(c) - 44}" y="${X(r) - 44}" width="${S * 3 - 2}" height="${S * 3 - 2}" rx="6" class="marmed"/>`; }
        for (const d of dests) { const [r, c] = rc(d); s += `<circle cx="${X(c) + 22}" cy="${X(r) + 22}" r="8" class="hdest" data-i="${d}"/>`; }
        for (const p of [0, 1]) { const [r, c] = rc(G.pos[p]); s += `<circle cx="${X(c) + 22}" cy="${X(r) + 22}" r="15" class="mp p${p}"/>`; }
        $('mBoard').innerHTML = s;
        // 행동 버튼
        let acts = '';
        if (setup) {
          if (cfg.mode === 2) acts += `<button type="button" id="mTool">${G.placingBomb ? '지뢰 묻기로' : '시한폭탄 묻기로'}</button>`;
          acts += `<button type="button" id="mRand">무작위로 채우기</button><button type="button" class="primary" id="mReady" ${G.mines[0].size === G.need && (cfg.mode === 1 || G.bombs[0].length === 3) ? '' : 'disabled'}>배치 끝 · 시작</button>`;
        } else if (myTurn && cfg.mode === 2 && G.pendingRespawn == null) {
          acts += G.bombs[0].filter(b => !b.used && !b.gone).map(b => `<button type="button" class="${G.declare === b.no ? 'on' : ''}" data-bomb="${b.no}">${b.no}번 발동</button>`).join('');
        }
        $('mActs').innerHTML = acts;
        const tool = $('mTool'); if (tool) tool.onclick = () => { G.placingBomb = !G.placingBomb; render(); };
        const rand = $('mRand'); if (rand) rand.onclick = () => { const free = shuffle(ALLOWED.filter(i => !G.mines[0].has(i) && !G.bombs[0].some(b => b.cell === i))); while (G.mines[0].size < G.need) G.mines[0].add(free.pop()); if (cfg.mode === 2) while (G.bombs[0].length < 3) G.bombs[0].push({ no: G.bombs[0].length + 1, cell: free.pop(), used: false }); render(); };
        const ready = $('mReady'); if (ready) ready.onclick = beginPlay;
        $('mActs').querySelectorAll('[data-bomb]').forEach(b => b.onclick = () => { const n = +b.dataset.bomb; G.declare = G.declare === n ? null : n; render(); });
        let msg = '';
        if (setup) msg = (G.placingBomb ? '시한폭탄을 묻을 칸을 고르세요.' : '지뢰를 묻을 칸을 고르세요.') + ' 회색 칸은 금지 구역, 다시 누르면 빼요. 시작하면 위치가 가려져요.';
        else if (G.over) msg = '게임 끝 — 상대 지뢰(작은 빨간 점)도 공개됐어요';
        else if (resp) msg = '지뢰를 밟았어요! 돌아갈 출발 구역 칸을 고르세요.';
        else if (myTurn) msg = '이동할 칸을 고르세요' + (G.declare ? ` (${G.declare}번 시한폭탄도 함께 발동)` : '');
        else msg = 'AI 차례…';
        $('mMsg').textContent = msg;
        $('mLog').innerHTML = G.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
      }
      $('mBoard').addEventListener('click', e => {
        const el = e.target.closest('[data-i]'); if (!el || !G) return;
        const i = +el.dataset.i;
        if (G.phase === 'setup') return setupClick(i);
        if (G.over) return;
        if (G.pendingRespawn === 0) { if (ZONE[0].includes(i) && i !== G.pos[1]) respawn(0, i); return; }
        if (G.turn === 0 && G.pendingRespawn == null && legal(0).includes(i)) { const d = G.declare; G.declare = null; move(0, i, d); }
      });
      start();
      return () => T.clear();
    }
  });
})();
