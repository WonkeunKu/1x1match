// 컬러 링크 (데블스 플랜 시즌3 결승 2회전) — 같은 색 말 2개를 잇는 경로들이 서로 겹치지 않게 말을 놓는 게임. 상대 배치가 불가능하다고 보면 '불가능 선언'
(function () {
  const COLORS = 'ABCDEFGHIJKLMN'.split('');
  const MINLEN = 6; // 경로 칸 수(양 끝 말 포함) 최소
  const rnd = n => Math.floor(Math.random() * n);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- 풀이기: 모든 색을 겹치지 않게 이을 수 있는지 ----------
  // pieces: { 색: [칸, 칸?] }  반환 { ok, paths:{색:[칸...]}, exhaustive }
  function solve(N, pieces, budget) {
    const NN = N * N, piece = new Int16Array(NN).fill(-1), used = new Uint8Array(NN);
    const cols = Object.keys(pieces).filter(c => pieces[c].length);
    cols.forEach((c, k) => pieces[c].forEach(i => piece[i] = k));
    const nb = []; for (let i = 0; i < NN; i++) { const r = Math.floor(i / N), c = i % N, a = []; if (r) a.push(i - N); if (r < N - 1) a.push(i + N); if (c) a.push(i - 1); if (c < N - 1) a.push(i + 1); nb.push(a); }
    const free = i => piece[i] < 0 && !used[i];
    const dist = (a, b) => Math.abs(Math.floor(a / N) - Math.floor(b / N)) + Math.abs(a % N - b % N);
    let steps = 0, aborted = false;
    const paths = {};
    const comp = new Int16Array(NN), csize = [];
    function label() {
      comp.fill(-1); csize.length = 0; let id = 0;
      for (let s = 0; s < NN; s++) if (free(s) && comp[s] < 0) { let n = 0; const st = [s]; comp[s] = id;
        while (st.length) { const x = st.pop(); n++; for (const y of nb[x]) if (free(y) && comp[y] < 0) { comp[y] = id; st.push(y); } }
        csize.push(n); id++; }
    }
    const compsAround = i => { const s = new Set(); for (const y of nb[i]) if (comp[y] >= 0) s.add(comp[y]); return s; };
    // 남은 색들이 아직 이어질 가능성이 있는지 (필요조건)
    function feasible(todo, head, target, curLen) {
      label();
      if (head != null) { // 지금 그리는 경로
        const ha = compsAround(head);
        if (target != null) { if (!nb[head].includes(target) || curLen + 1 < MINLEN) { const tb = compsAround(target); let ok = false; for (const x of ha) if (tb.has(x)) { ok = true; break; } if (!ok && !(nb[head].includes(target) && curLen + 1 >= MINLEN)) return false; } }
        else if (curLen < MINLEN) { let ok = false; for (const x of ha) if (csize[x] >= MINLEN - curLen) { ok = true; break; } if (!ok) return false; }
      }
      for (const c of todo) {
        const p = pieces[c];
        if (p.length === 2) { const a = compsAround(p[0]), b = compsAround(p[1]); let ok = false; for (const x of a) if (b.has(x) && csize[x] >= MINLEN - 2) { ok = true; break; } if (!ok) return false; }
        else { const a = compsAround(p[0]); let ok = false; for (const x of a) if (csize[x] >= MINLEN - 1) { ok = true; break; } if (!ok) return false; }
      }
      return true;
    }
    function solveFrom(todo) {
      if (!todo.length) return true;
      // 선택지가 가장 적은 색부터
      let bi = 0, bs = 1e9;
      for (let k = 0; k < todo.length; k++) { const p = pieces[todo[k]]; let s = 0; for (const e of p) s += nb[e].filter(free).length; s = s * 10 + (p.length === 2 ? dist(p[0], p[1]) : 9); if (s < bs) { bs = s; bi = k; } }
      const c = todo[bi], rest = todo.filter((_, k) => k !== bi), p = pieces[c];
      const start = p[0], target = p.length === 2 ? p[1] : null;
      const path = [start];
      function grow(head) {
        if (++steps > budget) { aborted = true; return false; }
        if (aborted) return false;
        const len = path.length;
        // 혼자인 말은 6칸이 되면 여기서 끝낼 수 있음(끝 칸에 짝을 놓음)
        if (target == null && len >= MINLEN) { paths[c] = path.slice(); if (feasible(rest, null, null, 0) && solveFrom(rest)) return true; if (aborted) return false; }
        let cand = nb[head].filter(y => free(y) || (y === target && len + 1 >= MINLEN));
        if (target != null) cand.sort((a, b) => (a === target ? -1 : b === target ? 1 : 0) || (len + 1 < MINLEN - 1 ? 0 : dist(a, target) - dist(b, target)));
        for (const y of cand) {
          if (y === target) { path.push(y); paths[c] = path.slice(); if (feasible(rest, null, null, 0) && solveFrom(rest)) return true; path.pop(); if (aborted) return false; continue; }
          used[y] = 1; path.push(y);
          if (feasible(rest, y, target, len + 1) && grow(y)) return true;
          used[y] = 0; path.pop(); if (aborted) return false;
        }
        return false;
      }
      const ok = grow(start);
      if (!ok) delete paths[c];
      return ok;
    }
    label();
    const ok = feasible(cols, null, null, 0) && solveFrom(cols);
    return { ok, paths: ok ? { ...paths } : null, exhaustive: !aborted, steps };
  }

  // ---------- 판 상태 ----------
  function newRound(N, first) { return { N, cells: Array(N * N).fill(null), first, turn: first, placedThisTurn: [], turnNo: 0, last: [], over: false }; }
  const piecesOf = R => { const m = {}; R.cells.forEach((c, i) => { if (c) (m[c] = m[c] || []).push(i); }); return m; };
  const countOf = (R, c) => R.cells.filter(x => x === c).length;
  // 이번 차례에 놓아야 할 개수: 라운드 첫 차례만 1개, 이후 2개(서로 다른 색)
  const need = R => R.turnNo === 0 ? 1 : 2;
  function canPlace(R, c, i) { return !R.cells[i] && countOf(R, c) < 2 && !R.placedThisTurn.some(x => x.c === c); }
  function legalAny(R) { const empties = R.cells.filter(x => !x).length; const colorsLeft = COLORS.filter(c => countOf(R, c) < 2).length; return empties >= need(R) && colorsLeft >= need(R); }

  // ---------- AI ----------
  const BUD = [3000, 12000, 15000];
  // 놓을 수 있는 후보: 혼자인 말의 짝을 놓거나 새 색을 놓음
  function randomPlacement(R) {
    const out = [], empt = shuffle(R.cells.map((x, i) => x ? -1 : i).filter(i => i >= 0));
    const colorsOK = shuffle(COLORS.filter(c => countOf(R, c) < 2));
    for (let k = 0; k < need(R); k++) { const c = colorsOK.find(c => !out.some(o => o.c === c)); const i = empt[k]; if (c == null || i == null) return null; out.push({ c, i }); }
    return out;
  }
  function withPlacement(R, pl) { const R2 = { ...R, cells: R.cells.slice() }; pl.forEach(({ c, i }) => R2.cells[i] = c); return R2; }
  function aiPlace(R, lv) {
    const tries = [6, 12, 16][lv], look = [0, 0, 6][lv], t0 = Date.now(), limitMs = [400, 900, 1600][lv];
    let best = null, bv = -1e9, found = 0;
    for (let t = 0; t < tries * 3 && t < 200; t++) {
      const pl = randomPlacement(R); if (!pl) break;
      const R2 = withPlacement(R, pl), s = solve(R.N, piecesOf(R2), BUD[lv]);
      if (!s.ok) continue;
      // 좋은 수: 판을 빡빡하게(짝 놓기, 남은 빈칸 줄이기) + 상대가 둘 수 있는 안전한 수가 적게
      let v = Math.random() * .5;
      for (const { c } of pl) if (countOf(R, c) === 1) v += 1.2; // 짝을 채우면 경로가 굳어짐
      if (look) { let safe = 0; for (let q = 0; q < look; q++) { const op = randomPlacement({ ...R2, turnNo: R2.turnNo + 1, placedThisTurn: [] }); if (!op) continue; if (solve(R.N, piecesOf(withPlacement(R2, op)), 2500).ok) safe++; } v -= safe / look * 3; }
      if (v > bv) { bv = v; best = pl; }
      if (++found >= tries || (best && Date.now() - t0 > limitMs)) break;
    }
    return best || randomPlacement(R); // 안전한 수가 없으면 아무 데나(그러면 상대가 불가능 선언 가능)
  }
  // 상대가 놓은 뒤 불가능 선언할지. 끝까지 따져 봐서 확실히 불가능할 때만(쉬움은 가끔 놓침)
  function aiShouldDeclare(R, lv) {
    const s = solve(R.N, piecesOf(R), [8000, 60000, 200000][lv]);
    if (s.ok || !s.exhaustive) return false;
    return Math.random() < [.55, .9, 1][lv];
  }

  const ENG = { COLORS, MINLEN, solve, newRound, piecesOf, countOf, need, canPlace, legalAny, aiPlace, aiShouldDeclare, randomPlacement, withPlacement };
  if (typeof module !== 'undefined' && module.exports) { module.exports = ENG; return; }
  if (typeof LAB === 'undefined') return;

  // ---------- 화면 ----------
  const { h, esc, seg } = LAB;
  const PAL = { A: '#e8604a', B: '#f3b641', C: '#7bd88f', D: '#5aa9e6', E: '#b48cf2', F: '#f28cc4', G: '#3fc7c0', H: '#c9a06a', I: '#9fd34a', J: '#ff8f3f', K: '#8f9cff', L: '#e0e070', M: '#d46a8a', N: '#a7bcb2' };
  LAB.add({
    id: 'colorlink', name: '컬러 링크', show: '데블스플랜',
    rules: `<ul>
      <li>14가지 색(A~N) 말이 2개씩. 같은 색 두 말을 잇는 경로들이 <b>서로 겹치거나 교차하지 않도록</b> 번갈아 말을 놓아요.</li>
      <li>라운드 시작 때 선이 말 1개를 놓고, 그다음부터는 차례마다 <b>서로 다른 색 말 2개</b>를 놓아요.</li>
      <li>경로는 상하좌우로 이어진 칸들이고, <b>말이 있는 칸을 포함해 6칸 이상</b>이어야 해요. 다른 말이 있는 칸은 지날 수 없어요. 아직 하나만 놓인 색도 앞으로 놓일 짝과 이어질 수 있어야 해요.</li>
      <li>상대가 놓은 뒤 더는 다 이을 수 없다고 보면 <b>불가능 선언</b>! 직전에 놓은 사람이 모든 경로(혼자인 말은 짝 위치까지)를 그려 증명하면 증명한 쪽이, 못 하면 선언한 쪽이 1점.</li>
      <li>5라운드, <b>먼저 3점</b>을 따면 승리. 다음 라운드 선후는 직전 라운드에 진 쪽이 정해요.</li>
      <li>이 사이트 버전 기준: 판 크기는 설정에서 골라요(기본 7×7). 시간 제한은 없어요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      let pend = { lv: 1, n: 7 }, cfg = { ...pend }, M = null, R = null, pick = null, proof = null, shown = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dp-score"><div><small>나</small><b id="clMe">0</b></div><div class="dp-mid"><span id="clRound"></span><small id="clSub"></small></div><div><small>AI</small><b id="clAi">0</b></div></div>
          <div class="cl-wrap"><div class="cl-board" id="clB"></div><svg class="cl-svg" id="clSvg"></svg></div>
          <p class="g-msg" id="clMsg"></p>
          <div class="cl-pal" id="clPal"></div>
          <div class="row" id="clBtns"></div>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정 (새 게임에 적용)</h3>
            <div class="opt"><span>판 크기</span><div id="clN"></div></div>
            <div class="opt"><span>AI 난이도</span><div id="clLv"></div></div>
            <button type="button" class="primary" id="clNew">새 게임</button></div>
          <div class="card"><h3>진행 기록</h3><div class="log" id="clLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('clN').appendChild(seg([[6, '6×6'], [7, '7×7'], [8, '8×8']], 7, v => pend.n = v));
      $('clLv').appendChild(seg([[0, '쉬움'], [1, '보통'], [2, '어려움']], 1, v => pend.lv = v));
      $('clNew').onclick = start;
      const log = t => M.log.push(t);
      function start() { T.clear(); cfg = { ...pend }; M = { score: [0, 0], roundNo: 0, log: [], over: false }; const f = rnd(2); log(`동전 던지기: ${f === 0 ? '내가' : 'AI가'} 1라운드 선`); newRound(f); }
      function newRound(first) {
        M.roundNo++; R = ENG.newRound(cfg.n, first); pick = null; proof = null; shown = null; M.phase = 'place';
        log(`— ${M.roundNo}라운드 (선 ${first === 0 ? '나' : 'AI'})`); render(); if (first === 1) aiTurn();
      }
      function endTurn() { R.last = R.placedThisTurn.slice(); R.placedThisTurn = []; R.turnNo++; R.turn = 1 - R.turn; }
      function aiTurn() {
        M.phase = 'ai'; render();
        T.set(() => {
          // 먼저 내가 놓은 판이 불가능한지 따져 봄
          if (R.turnNo > 0 && ENG.aiShouldDeclare(R, cfg.lv)) { log('AI: 불가능 선언!'); M.phase = 'prove'; proof = { paths: {}, cur: null }; render(); return; }
          if (!ENG.legalAny(R)) { log('AI가 더 놓을 수 없어요'); return roundWin(0, '더 놓을 자리가 없어 AI 패배'); }
          const pl = ENG.aiPlace(R, cfg.lv);
          pl.forEach(({ c, i }) => { R.cells[i] = c; R.placedThisTurn.push({ c, i }); });
          log(`AI: ${pl.map(({ c, i }) => `${c}→${'abcdefgh'[i % R.N]}${R.N - Math.floor(i / R.N)}`).join(', ')}`);
          endTurn(); M.phase = 'place'; render();
          if (!ENG.legalAny(R)) { log('놓을 자리가 없어요'); roundWin(1, '더 놓을 자리가 없어 내 패배'); }
        }, 700);
      }
      // 내가 불가능 선언 → AI가 증명 시도
      function declare() {
        if (M.phase !== 'place' || R.turn !== 0 || R.placedThisTurn.length || R.turnNo === 0) return;
        log('나: 불가능 선언!'); M.phase = 'ai'; render();
        T.set(() => {
          const s = ENG.solve(R.N, ENG.piecesOf(R), 400000);
          if (s.ok) { shown = s.paths; log('AI가 모든 경로를 증명했어요'); render(); roundWin(1, 'AI가 증명 성공'); }
          else { shown = null; log(s.exhaustive ? 'AI 증명 실패 — 정말 불가능한 판이었어요' : 'AI가 증명하지 못했어요'); render(); roundWin(0, '불가능 선언 성공'); }
        }, 600);
      }
      function roundWin(w, why) {
        M.score[w]++; log(`${M.roundNo}라운드: ${w === 0 ? '내' : 'AI'} 1점 (${why}) · ${M.score[0]}:${M.score[1]}`); M.phase = 'between'; render();
        if (M.score[w] >= 3 || M.roundNo >= 5) { M.over = true; const d = M.score[0] - M.score[1]; T.set(() => LAB.end(d > 0 ? '승리' : d < 0 ? '패배' : '무승부', `최종 ${M.score[0]} : ${M.score[1]}`, start), 1800); return; }
        const loser = 1 - w;
        if (loser === 0) { M.phase = 'choose'; render(); } else T.set(() => newRound(0), 2200); // AI가 지면 AI는 후를 택함 → 내가 선
      }
      // 칸 누르기
      function clickCell(i) {
        if (M.phase === 'place' && R.turn === 0) {
          const mine = R.placedThisTurn.findIndex(x => x.i === i);
          if (mine >= 0) { R.cells[i] = null; R.placedThisTurn.splice(mine, 1); render(); return; } // 이번에 놓은 말 다시 누르면 취소
          if (!pick || R.placedThisTurn.length >= ENG.need(R) || !ENG.canPlace(R, pick, i)) return;
          R.cells[i] = pick; R.placedThisTurn.push({ c: pick, i }); pick = null; render(); return;
        }
        if (M.phase === 'prove') {
          const c = R.cells[i], cur = proof.cur, p = cur ? proof.paths[cur] : null, head = p ? p[p.length - 1] : null;
          const adj = head != null && Math.abs(Math.floor(i / R.N) - Math.floor(head / R.N)) + Math.abs(i % R.N - head % R.N) === 1;
          const finished = p && p.length > 1 && R.cells[head] === cur;
          if (c) {
            // 같은 색 짝에 닿으면 경로 완성, 아니면 그 말에서 새로 그리기 시작
            if (p && c === cur && i !== p[0] && adj && !finished) { p.push(i); render(); return; }
            proof.cur = c; proof.paths[c] = [i]; render(); return;
          }
          if (!p) return;
          const k = p.indexOf(i); if (k >= 0) { p.length = k + 1; render(); return; } // 되돌리기
          if (!adj || finished) return;
          if (Object.entries(proof.paths).some(([cc, pp]) => cc !== cur && pp.includes(i))) return; // 다른 경로와 겹침
          p.push(i); render();
        }
      }
      function submitProof() {
        const pcs = ENG.piecesOf(R), bad = [];
        const usedCells = new Map();
        for (const c of Object.keys(pcs)) {
          const p = proof.paths[c];
          if (!p || p.length < ENG.MINLEN) { bad.push(`${c}: ${p ? p.length : 0}칸 (6칸 이상 필요)`); continue; }
          if (pcs[c].length === 2) { if (!(pcs[c].includes(p[0]) && pcs[c].includes(p[p.length - 1]) && p[0] !== p[p.length - 1])) { bad.push(`${c}: 두 말이 이어지지 않았어요`); continue; } }
          else if (R.cells[p[p.length - 1]]) { bad.push(`${c}: 짝을 놓을 끝 칸이 비어 있지 않아요`); continue; }
          for (const x of p) { if (usedCells.has(x) && usedCells.get(x) !== c) bad.push(`${c}·${usedCells.get(x)} 경로가 겹쳐요`); usedCells.set(x, c); }
        }
        if (bad.length) { $('clMsg').textContent = '아직 증명이 안 됐어요: ' + bad.slice(0, 3).join(' / '); return; }
        shown = proof.paths; proof = null; log('나: 모든 경로를 증명했어요'); roundWin(0, '증명 성공');
      }
      function giveUp() { proof = null; const s = ENG.solve(R.N, ENG.piecesOf(R), 400000); shown = s.ok ? s.paths : null; log(s.ok ? '증명 포기 — 사실은 이렇게 이을 수 있었어요' : '증명 포기 — 정말 불가능한 판이었어요'); roundWin(1, '증명 실패'); }

      $('clB').addEventListener('click', e => { const el = e.target.closest('[data-i]'); if (el) clickCell(+el.dataset.i); });
      $('clPal').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b || b.disabled) return; pick = pick === b.dataset.c ? null : b.dataset.c; render(); });
      $('clBtns').addEventListener('click', e => {
        const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
        const a = b.dataset.a;
        if (a === 'done' && R.placedThisTurn.length === ENG.need(R)) { log(`나: ${R.placedThisTurn.map(({ c, i }) => `${c}→${'abcdefgh'[i % R.N]}${R.N - Math.floor(i / R.N)}`).join(', ')}`); endTurn(); render(); aiTurn(); }
        else if (a === 'declare') declare();
        else if (a === 'submit') submitProof();
        else if (a === 'giveup') giveUp();
        else if (a === 'first' || a === 'second') newRound(a === 'first' ? 0 : 1);
      });

      function render() {
        const N = R.N;
        $('clMe').textContent = M.score[0]; $('clAi').textContent = M.score[1];
        $('clRound').textContent = M.over ? '게임 끝' : `${M.roundNo}라운드 · 3점 선승`;
        $('clSub').textContent = `${R.turnNo + 1}번째 차례 · ${R.turn === 0 ? '내' : 'AI'} 차례`;
        const b = $('clB'); b.style.setProperty('--n', N);
        const lastSet = new Set((R.last || []).map(x => x.i));
        const proofCells = new Map(); if (proof) for (const [c, p] of Object.entries(proof.paths)) p.forEach(x => proofCells.set(x, c));
        let s = '';
        for (let i = 0; i < N * N; i++) { const c = R.cells[i];
          const canPut = M.phase === 'place' && R.turn === 0 && pick && ENG.canPlace(R, pick, i) && R.placedThisTurn.length < ENG.need(R);
          const pc = proofCells.get(i);
          s += `<button type="button" class="clc ${canPut ? 'can' : ''} ${pc && !c ? 'pth' : ''}" style="${pc && !c ? `--pc:${PAL[pc]}` : ''}" data-i="${i}">${c ? `<span class="clp ${lastSet.has(i) ? 'last' : ''} ${R.placedThisTurn.some(x => x.i === i) ? 'new' : ''} ${ENG.countOf(R, c) === 1 ? 'single' : ''}" style="--pc:${PAL[c]}">${c}</span>` : ''}</button>`; }
        b.innerHTML = s;
        // 경로 그림 (증명 결과)
        const svg = $('clSvg'); svg.setAttribute('viewBox', `0 0 ${N} ${N}`);
        const drawn = shown || (proof && proof.paths) || null;
        svg.innerHTML = drawn ? Object.entries(drawn).map(([c, p]) => `<polyline points="${p.map(x => `${x % N + .5},${Math.floor(x / N) + .5}`).join(' ')}" style="stroke:${PAL[c]}"/>${!R.cells[p[p.length - 1]] && p.length >= ENG.MINLEN && shown ? `<circle cx="${p[p.length - 1] % N + .5}" cy="${Math.floor(p[p.length - 1] / N) + .5}" r=".22" style="fill:${PAL[c]}"/>` : ''}`).join('') : '';
        // 팔레트
        const placing = M.phase === 'place' && R.turn === 0;
        $('clPal').hidden = !placing;
        if (placing) $('clPal').innerHTML = ENG.COLORS.map(c => { const n = 2 - ENG.countOf(R, c); const dis = n <= 0 || R.placedThisTurn.some(x => x.c === c) || R.placedThisTurn.length >= ENG.need(R);
          return `<button type="button" class="clk ${pick === c ? 'on' : ''}" style="--pc:${PAL[c]}" data-c="${c}" ${dis ? 'disabled' : ''}>${c}<small>${n}</small></button>`; }).join('');
        // 버튼과 안내
        let btn = '', msg = '';
        if (M.phase === 'place' && R.turn === 0) {
          const k = ENG.need(R), left = k - R.placedThisTurn.length;
          msg = left ? `${k === 2 ? '서로 다른 색 말 2개' : '말 1개'}를 놓으세요 — 색을 고르고 빈칸을 누르세요 (${left}개 남음)` : '"놓기 완료"를 누르세요 (놓은 말을 다시 누르면 취소)';
          btn = `${R.turnNo > 0 && !R.placedThisTurn.length ? '<button type="button" data-a="declare">불가능 선언</button>' : ''}<button type="button" class="primary" data-a="done" ${left ? 'disabled' : ''}>놓기 완료</button>`;
        } else if (M.phase === 'ai') msg = 'AI가 생각하는 중…';
        else if (M.phase === 'prove') {
          msg = '증명하세요: 말을 누르고 이웃 칸을 차례로 눌러 경로를 그려요(6칸 이상). 혼자인 말은 경로 끝 빈칸이 짝 자리예요. 경로 칸을 다시 누르면 거기까지 되돌려요';
          btn = '<button type="button" data-a="giveup">포기</button><button type="button" class="primary" data-a="submit">증명 제출</button>';
        } else if (M.phase === 'choose') { msg = '이번 라운드를 졌어요. 다음 라운드 선후를 고르세요'; btn = '<button type="button" data-a="first">내가 선</button><button type="button" data-a="second">내가 후</button>'; }
        else if (M.phase === 'between') msg = shown ? '경로 증명 결과예요' : '';
        $('clBtns').innerHTML = btn; $('clMsg').textContent = msg;
        $('clLog').innerHTML = M.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
      }
      LAB.ready(root, start);
      return () => T.clear();
    }
  });
})();
