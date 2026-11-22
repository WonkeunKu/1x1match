// 컬러턴 (피의 게임2 데스매치) — 숨은 지뢰를 밟으면 칩 색이 바뀌는 6×6 사목
(function () {
  const { h, esc, rnd, shuffle, seg } = LAB;
  const N = 6, COLS = 'ABCDEF';
  const nm = i => COLS[i % N] + (Math.floor(i / N) + 1);
  const NB = i => { const r = Math.floor(i / N), c = i % N, o = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < N && nc >= 0 && nc < N) o.push(nr * N + nc); } return o; };
  const WIN = []; // 4칸 줄 전부
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const cells = [0, 1, 2, 3].map(k => [r + dr * k, c + dc * k]); if (cells.every(([a, b]) => a >= 0 && a < N && b >= 0 && b < N)) WIN.push(cells.map(([a, b]) => a * N + b));
  }
  const FRONT = [5, 0]; // 나(0)는 6행, AI(1)는 1행에만 새 칩을 놓음
  // 칩: board[i] = {id, col:0|1} 또는 null
  function fours(board, col) { return WIN.some(w => w.every(i => board[i] && board[i].col === col)); }
  function lineScore(board, col) {
    let v = 0; for (const w of WIN) { let a = 0, b = 0; for (const i of w) { const x = board[i]; if (!x) continue; if (x.col === col) a++; else b++; } if (!b && a) v += [0, 1, 4, 22][a] || 0; if (!a && b) v -= ([0, 1, 4, 26][b] || 0); } return v;
  }

  LAB.add({
    id: 'colorturn', name: '컬러턴', show: '피의 게임',
    rules: `<ul>
      <li>6×6 판, 각자 칩 7개. 판에는 <b>가로 한 줄에 3개씩, 모두 18개의 지뢰</b>가 숨어 있어요.</li>
      <li>내 차례에 둘 중 하나를 해요. <b>놓기</b>: 손에 남은 칩 하나를 내 앞 첫 줄(6행)의 빈 칸에 놓아요. <b>옮기기</b>: 판 위의 칩 하나(내 것·상대 것 상관없이)를 주변 8칸의 빈 칸으로 옮겨요. 상대가 바로 전에 옮긴 칩은 못 옮겨요.</li>
      <li>지뢰 칸에 칩이 들어가면 <b>칩 색이 바뀌어요</b>. 지뢰는 사라지지 않아서 위치를 외워 두면 유리해요.</li>
      <li>내 색 칩 4개를 가로·세로·대각선으로 먼저 이으면 이겨요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      const cfg = { lv: 1, show: false }, pend = { ...cfg };
      let G = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dp-score"><div><small>나 (흑)</small><b id="ctH0">7</b></div><div class="dp-mid"><span id="ctTurn"></span><small>손에 남은 칩</small></div><div><small>AI (백)</small><b id="ctH1">7</b></div></div>
          <div class="ct-board" id="ctB"></div>
          <p class="g-msg" id="ctMsg"></p>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정 (새 게임에 적용)</h3>
            <div class="opt"><span>AI 난이도</span><div id="ctLv"></div></div>
            <div class="opt"><span>찾은 지뢰 표시</span><div id="ctShow"></div></div>
            <button type="button" class="primary" id="ctNew">새 게임</button></div>
          <div class="card"><h3>기록</h3><div class="log" id="ctLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('ctLv').appendChild(seg([[0, '쉬움'], [1, '보통'], [2, '어려움']], 1, v => pend.lv = v));
      $('ctShow').appendChild(seg([[false, '가림 (방송 규칙)'], [true, '보임 (연습)']], false, v => pend.show = v));
      $('ctNew').onclick = start;
      function start() {
        T.clear(); Object.assign(cfg, pend);
        const mines = new Set(); for (let r = 0; r < N; r++) shuffle([0, 1, 2, 3, 4, 5]).slice(0, 3).forEach(c => mines.add(r * N + c));
        G = { board: Array(N * N).fill(null), hand: [7, 7], turn: rnd(2), mines, known: new Set(), aiMem: new Set(), lastMoved: [null, null], sel: null, log: [], over: false, nid: 0, ply: 0, flash: null };
        G.log.push(`선: ${G.turn === 0 ? '나 (흑)' : 'AI (백)'}`);
        render(); aiMaybe();
      }
      // 행동: {k:'p', to} 놓기 / {k:'m', from, to} 옮기기
      function actions(st, p) {
        const out = [];
        if (st.hand[p] > 0) for (let c = 0; c < N; c++) { const i = FRONT[p] * N + c; if (!st.board[i]) out.push({ k: 'p', to: i }); }
        for (let i = 0; i < N * N; i++) { const x = st.board[i]; if (!x || x.id === st.lastMoved[1 - p]) continue; for (const j of NB(i)) if (!st.board[j]) out.push({ k: 'm', from: i, to: j }); }
        return out;
      }
      function doAct(a) {
        const p = G.turn; let chip, flipped = false;
        if (a.k === 'p') { chip = { id: ++G.nid, col: p }; G.hand[p]--; }
        else { chip = G.board[a.from]; G.board[a.from] = null; G.lastMoved[p] = chip.id; }
        if (G.mines.has(a.to)) { chip.col = 1 - chip.col; flipped = true; G.known.add(a.to); if (Math.random() < [0.7, 0.92, 1][cfg.lv]) G.aiMem.add(a.to); }
        G.board[a.to] = chip; if (a.k === 'p') G.lastMoved[p] = null;
        G.flash = flipped ? a.to : null;
        const who = p ? 'AI' : '나';
        G.log.push(`${who}: ${a.k === 'p' ? '놓기 ' + nm(a.to) : '옮기기 ' + nm(a.from) + '→' + nm(a.to)}${flipped ? ' · 지뢰! 색이 바뀜' : ''}`);
        G.ply++;
        const me = fours(G.board, p), op = fours(G.board, 1 - p);
        if (me || op) { G.over = true; render(); const w = me ? p : 1 - p; return T.set(() => LAB.end(w === 0 ? '승리' : '패배', `${w === 0 ? '내' : 'AI'} 색으로 4목 완성`, start), 600); }
        if (G.ply >= 150) { G.over = true; render(); return LAB.end('무승부', '150수가 지나도록 승부가 나지 않았어요', start); }
        G.turn = 1 - p; G.sel = null;
        if (!actions(G, G.turn).length) { G.log.push(`${G.turn ? 'AI' : '나'}: 할 수 있는 행동이 없어 넘어가요`); G.turn = 1 - G.turn; }
        render(); aiMaybe();
      }
      function mineProb(cell) {
        if (G.aiMem.has(cell)) return 1;
        const r = Math.floor(cell / N); let known = 0, unknown = 0;
        for (let c = 0; c < N; c++) { const i = r * N + c; if (G.aiMem.has(i)) known++; else unknown++; }
        return unknown ? Math.max(0, 3 - known) / unknown : 0;
      }
      function aiMaybe() {
        if (G.over || G.turn !== 1) return;
        G.busy = true; render();
        T.set(() => {
          const acts = actions(G, 1); let best = acts[0], bv = -1e9;
          for (const a of acts) {
            const pm = mineProb(a.to);
            let v = 0;
            for (const flip of [false, true]) {
              const pr = flip ? pm : 1 - pm; if (pr <= 0) continue;
              const b = G.board.slice(); let chip = a.k === 'p' ? { id: -1, col: 1 } : { ...b[a.from] }; if (a.k === 'm') b[a.from] = null;
              if (flip) chip.col = 1 - chip.col; b[a.to] = chip;
              let s;
              if (fours(b, 1)) s = 5000; else if (fours(b, 0)) s = -5000;
              else {
                s = lineScore(b, 1) + (a.k === 'p' ? 6 : 0);
                // 상대가 바로 이길 수 있는 자리가 있으면 크게 감점 (놓기만 확인)
                for (let c = 0; c < N; c++) { const i = FRONT[0] * N + c; if (!b[i] && G.hand[0] > 0) { const bb = b.slice(); bb[i] = { col: 0 }; if (fours(bb, 0)) { s -= 3000; break; } } }
                for (let i = 0; i < N * N; i++) { const x = b[i]; if (!x || x.col !== 0) continue; for (const j of NB(i)) if (!b[j] && !G.aiMem.has(j)) { const bb = b.slice(); bb[j] = x; bb[i] = null; if (fours(bb, 0)) { s -= 2500; i = N * N; break; } } }
              }
              v += pr * s;
            }
            v += (Math.random() - .5) * (cfg.lv === 0 ? 40 : cfg.lv === 1 ? 6 : 1);
            if (v > bv) { bv = v; best = a; }
          }
          G.busy = false; doAct(best);
        }, 800);
      }
      function render() {
        $('ctH0').textContent = G.hand[0]; $('ctH1').textContent = G.hand[1];
        $('ctTurn').textContent = G.over ? '게임 끝' : `${G.turn === 0 ? '내' : 'AI'} 차례`;
        const myTurn = !G.over && !G.busy && G.turn === 0;
        const acts = myTurn ? actions(G, 0) : [];
        const tg = new Set(G.sel == null ? acts.filter(a => a.k === 'p').map(a => a.to) : acts.filter(a => a.k === 'm' && a.from === G.sel).map(a => a.to));
        const movable = new Set(acts.filter(a => a.k === 'm').map(a => a.from));
        let s = `<span></span>${[...COLS].map(c => `<span class="ct-h">${c}</span>`).join('')}`;
        for (let r = 0; r < N; r++) {
          s += `<span class="ct-h">${r + 1}</span>`;
          for (let c = 0; c < N; c++) {
            const i = r * N + c, x = G.board[i];
            const showMine = (cfg.show || G.over) && (G.over ? G.mines.has(i) : G.known.has(i));
            s += `<button type="button" class="ct-c ${r === FRONT[0] ? 'front0' : r === FRONT[1] ? 'front1' : ''} ${tg.has(i) ? 'tg' : ''} ${G.sel === i ? 'sel' : ''} ${showMine ? 'mine' : ''} ${G.flash === i ? 'flash' : ''}" data-i="${i}">${x ? `<span class="ct-chip c${x.col} ${x.id === G.lastMoved[1] && G.turn === 0 ? 'locked' : ''}"></span>` : ''}</button>`;
          }
        }
        $('ctB').innerHTML = s;
        $('ctMsg').textContent = G.over ? (cfg.show ? '게임 끝' : '게임 끝 — 지뢰 위치가 모두 공개됐어요') : G.busy ? 'AI 생각 중…' : !myTurn ? '' : G.sel == null ? (G.hand[0] ? '6행 빈 칸(점선)에 칩을 놓거나, 옮길 칩을 고르세요' : '옮길 칩을 고르세요') : '옮길 칸을 고르세요 (다시 누르면 취소)';
        $('ctLog').innerHTML = G.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
      }
      $('ctB').addEventListener('click', e => {
        const el = e.target.closest('[data-i]'); if (!el || G.over || G.busy || G.turn !== 0) return;
        const i = +el.dataset.i, acts = actions(G, 0);
        if (G.sel != null) { const a = acts.find(a => a.k === 'm' && a.from === G.sel && a.to === i); if (a) return doAct(a); if (i === G.sel) { G.sel = null; return render(); } }
        if (G.board[i] && acts.some(a => a.k === 'm' && a.from === i)) { G.sel = i; return render(); }
        const pa = acts.find(a => a.k === 'p' && a.to === i); if (pa) return doAct(pa);
        G.sel = null; render();
      });
      start();
      return () => T.clear();
    }
  });
})();
