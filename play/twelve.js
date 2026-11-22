// 십이장기 (더 지니어스 시즌3 데스매치·결승) — 3×4 판 미니 장기, 잡은 말을 다시 놓을 수 있음
(function () {
  const { h, esc, rnd, seg } = LAB;
  const W = 3, H = 4;
  // 말: K 왕, R 장(앞뒤좌우 1칸), B 상(대각 1칸), P 자(앞 1칸), Q 후(자가 승격: 대각 뒤 빼고 모두)
  const NAME = { K: '王', R: '將', B: '相', P: '子', Q: '侯' };
  const KNAME = { K: '왕', R: '장', B: '상', P: '자', Q: '후' };
  const DIRS = {
    K: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],
    R: [[-1, 0], [1, 0], [0, -1], [0, 1]],
    B: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
    P: [[-1, 0]],
    Q: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0]]
  };
  // 말 위에 갈 수 있는 방향을 작은 삼각형으로 표시 (말 주인 기준 위쪽이 앞)
  const arrows = t => '<svg class="tw-dir" viewBox="0 0 100 100" aria-hidden="true">' + DIRS[t].map(([dr, dc]) => {
    const L = Math.hypot(dr, dc), ux = dc / L, uy = dr / L, d = (dr && dc) ? 40 : 41;
    const cx = 50 + ux * d, cy = 50 + uy * d, tip = 5.5, half = 5;
    const p = [[cx + ux * tip, cy + uy * tip], [cx - ux * 2 - uy * half, cy - uy * 2 + ux * half], [cx - ux * 2 + uy * half, cy - uy * 2 - ux * half]];
    return `<polygon points="${p.map(q => q.map(v => v.toFixed(1)).join(',')).join(' ')}"/>`;
  }).join('') + '</svg>';
  // 판: 칸마다 null 또는 {o:0|1, t}. 0은 아래쪽(나), 1은 위쪽. 0의 앞은 r-1
  function init() {
    const b = Array(W * H).fill(null);
    const put = (r, c, o, t) => b[r * W + c] = { o, t };
    put(3, 0, 0, 'B'); put(3, 1, 0, 'K'); put(3, 2, 0, 'R'); put(2, 1, 0, 'P');
    put(0, 2, 1, 'B'); put(0, 1, 1, 'K'); put(0, 0, 1, 'R'); put(1, 1, 1, 'P');
    return { b, hand: [[], []], turn: 0, kingIn: [false, false] };
  }
  const clone = s => ({ b: s.b.map(x => x && { ...x }), hand: [s.hand[0].slice(), s.hand[1].slice()], turn: s.turn, kingIn: s.kingIn.slice() });
  const lastRow = o => o === 0 ? 0 : H - 1;
  function moves(s) {
    const p = s.turn, out = [];
    for (let i = 0; i < W * H; i++) {
      const x = s.b[i]; if (!x || x.o !== p) continue;
      const r = Math.floor(i / W), c = i % W;
      for (let [dr, dc] of DIRS[x.t]) {
        if (p === 1) dr = -dr, dc = -dc;
        const nr = r + dr, nc = c + dc; if (nr < 0 || nr >= H || nc < 0 || nc >= W) continue;
        const j = nr * W + nc, y = s.b[j]; if (y && y.o === p) continue;
        out.push({ f: i, t: j });
      }
    }
    // 잡은 말 놓기: 빈 칸, 단 상대 진영(상대 끝줄)에는 못 놓음
    const kinds = [...new Set(s.hand[p])];
    for (const k of kinds) for (let j = 0; j < W * H; j++) {
      if (s.b[j]) continue; const r = Math.floor(j / W); if (r === lastRow(p)) continue;
      out.push({ drop: k, t: j });
    }
    return out;
  }
  // 수 두기. 결과: 승자(0/1) 또는 null
  function apply(s, m) {
    const p = s.turn;
    let win = null;
    if (m.drop) { s.b[m.t] = { o: p, t: m.drop }; s.hand[p].splice(s.hand[p].indexOf(m.drop), 1); }
    else {
      const x = s.b[m.f], y = s.b[m.t];
      if (y) { if (y.t === 'K') win = p; s.hand[p].push(y.t === 'Q' ? 'P' : y.t); }
      s.b[m.t] = x; s.b[m.f] = null;
      if (x.t === 'P' && Math.floor(m.t / W) === lastRow(p)) x.t = 'Q';
    }
    if (win == null) {
      // 상대 끝줄에 들어간 왕이 상대 차례를 버티면 승리
      const q = 1 - p;
      if (s.kingIn[q]) { const ki = s.b.findIndex(x => x && x.o === q && x.t === 'K'); if (ki >= 0 && Math.floor(ki / W) === lastRow(q)) win = q; }
      const ki = s.b.findIndex(x => x && x.o === p && x.t === 'K');
      s.kingIn[p] = ki >= 0 && Math.floor(ki / W) === lastRow(p);
    }
    s.turn = 1 - p;
    return win;
  }
  const VAL = { K: 0, R: 5, B: 5, P: 2, Q: 6 };
  function evalFor(s, p) {
    let v = 0;
    for (let i = 0; i < W * H; i++) { const x = s.b[i]; if (!x) continue; const sg = x.o === p ? 1 : -1; v += sg * VAL[x.t];
      if (x.t === 'K') { const r = Math.floor(i / W); const adv = x.o === 0 ? 3 - r : r; v += sg * adv * .6; } }
    for (const k of s.hand[p]) v += VAL[k] * .9; for (const k of s.hand[1 - p]) v -= VAL[k] * .9;
    if (s.kingIn[p]) v += 3; if (s.kingIn[1 - p]) v -= 3;
    return v;
  }
  let deadline = 0, timeUp = false, nodes = 0;
  function negamax(s, d, a, b) {
    if ((++nodes & 1023) === 0 && performance.now() > deadline) timeUp = true;
    if (timeUp) return 0;
    if (d === 0) return evalFor(s, s.turn);
    const ms = moves(s);
    ms.sort((x, y) => (y.drop ? 0 : (s.b[y.t] ? 10 : 1)) - (x.drop ? 0 : (s.b[x.t] ? 10 : 1)));
    let best = -1e9;
    for (const m of ms) {
      const t = clone(s), w = apply(t, m);
      const v = w != null ? (w === s.turn ? 1000 + d : -1000 - d) : -negamax(t, d - 1, -b, -a);
      if (timeUp) return 0;
      if (v > best) best = v; if (v > a) a = v; if (a >= b) break;
    }
    return ms.length ? best : -999;
  }
  function aiMove(s, lv) {
    const ms = moves(s);
    if (lv === 0 && Math.random() < .3) return ms[rnd(ms.length)];
    deadline = performance.now() + [200, 700, 1800][lv]; timeUp = false;
    let best = ms[0];
    for (let d = 1; d <= 14; d++) {
      let bv = -1e9, cand = null, a = -1e9;
      for (const m of ms) {
        const t = clone(s), w = apply(t, m);
        let v = w != null ? (w === s.turn ? 2000 : -2000) : -negamax(t, d - 1, -1e9, -a);
        if (timeUp) break;
        v += (Math.random() - .5) * (lv === 0 ? 3 : lv === 1 ? .4 : .02);
        if (v > bv) { bv = v; cand = m; } if (v > a) a = v;
      }
      if (timeUp) break; if (cand) best = cand; if (bv > 900) break;
    }
    return best;
  }

  LAB.add({
    id: 'twelve', name: '십이장기', show: '더 지니어스',
    rules: `<ul>
      <li>3×4 판에서 각자 <b>왕(王)·장(將)·상(相)·자(子)</b> 4개로 겨뤄요. 아래가 내 진영이에요.</li>
      <li><b>왕</b>: 8방향 1칸. <b>장</b>: 앞뒤좌우 1칸. <b>상</b>: 대각선 1칸. <b>자</b>: 앞으로 1칸, 상대 끝줄에 닿으면 <b>후(侯)</b>로 바뀌어 대각선 뒤를 뺀 6방향으로 움직여요.</li>
      <li>잡은 상대 말은 내 말이 되고, 내 차례에 이동 대신 빈 칸에 놓을 수 있어요(후는 자로 돌아와요). 단, 상대 진영 끝줄에는 놓을 수 없어요.</li>
      <li>상대 <b>왕을 잡거나</b>, 내 왕이 상대 끝줄에 들어가 <b>상대 차례를 버티면</b> 이겨요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      const cfg = { opp: 'ai', lv: 1 }, pend = { ...cfg };
      let S = null, sel = null, over = false, log = [], busy = false, first = 0, hist = [];
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="tw-hand" id="twH1"></div>
          <div class="tw-board" id="twB"></div>
          <div class="tw-hand" id="twH0"></div>
          <p class="g-msg" id="twMsg"></p>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정 (새 게임에 적용)</h3>
            <div class="opt"><span>상대</span><div id="twOpp"></div></div>
            <div class="opt"><span>AI 난이도</span><div id="twLv"></div></div>
            <div class="row"><button type="button" id="twUndo">↶ 무르기</button><button type="button" class="primary" id="twNew">새 게임</button></div></div>
          <div class="card"><h3>기록</h3><div class="log" id="twLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('twOpp').appendChild(seg([['ai', 'AI'], ['local', '한 화면 2인']], 'ai', v => pend.opp = v));
      $('twLv').appendChild(seg([[0, '쉬움'], [1, '보통'], [2, '어려움']], 1, v => pend.lv = v));
      $('twNew').onclick = start;
      $('twUndo').onclick = () => { if (!hist.length || busy || over) return; do { const x = hist.pop(); S = x.s; log.length = x.l; } while (hist.length && cfg.opp === 'ai' && S.turn !== 0); sel = null; render(); aiMaybe(); };
      const who = p => cfg.opp === 'ai' ? (p === 0 ? '나' : 'AI') : (p === 0 ? '초록' : '주황');
      const human = () => !over && !busy && (cfg.opp === 'local' || S.turn === 0);
      function start() { T.clear(); Object.assign(cfg, pend); S = init(); first = rnd(2); S.turn = first; sel = null; over = false; log = [`${who(first)} 선`]; hist = []; busy = false; render(); aiMaybe(); }
      const cellName = i => 'ABC'[i % W] + (Math.floor(i / W) + 1);
      function play(m) {
        hist.push({ s: clone(S), l: log.length });
        const p = S.turn, x = m.drop ? null : S.b[m.f], xt = x && x.t, cap = m.drop ? null : S.b[m.t];
        const w = apply(S, m);
        log.push(m.drop ? `${who(p)}: ${KNAME[m.drop]} 놓기 → ${cellName(m.t)}` : `${who(p)}: ${KNAME[xt]}${xt === 'P' && x.t === 'Q' ? '(후로 승격)' : ''} ${cellName(m.f)}→${cellName(m.t)}${cap ? ' · ' + KNAME[cap.t] + ' 잡음' : ''}`);
        sel = null;
        if (w != null) { over = true; render(); return T.set(() => LAB.end(cfg.opp === 'ai' ? (w === 0 ? '승리' : '패배') : who(w) + ' 승리', cap && cap.t === 'K' ? '왕을 잡았어요' : '왕이 상대 끝줄에서 버텼어요', start), 500); }
        if (hist.length >= 200) { over = true; render(); return LAB.end('무승부', '200수가 지나도록 승부가 나지 않았어요', start); }
        if (!moves(S).length) { over = true; render(); return LAB.end(cfg.opp === 'ai' ? (S.turn === 0 ? '패배' : '승리') : who(1 - S.turn) + ' 승리', '둘 수 있는 수가 없어요', start); }
        render(); aiMaybe();
      }
      function aiMaybe() {
        if (cfg.opp !== 'ai' || over || S.turn !== 1) return;
        busy = true; render();
        T.set(() => { const t0 = performance.now(); const m = aiMove(clone(S), cfg.lv); T.set(() => { busy = false; play(m); }, Math.max(0, 600 - (performance.now() - t0))); }, 50);
      }
      function render() {
        const ms = human() ? moves(S) : [];
        const targets = sel == null ? [] : ms.filter(m => (sel.drop ? m.drop === sel.drop : m.f === sel.i)).map(m => m.t);
        const flip = cfg.opp === 'local' && S.turn === 1 && false;
        let html = '';
        for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
          const i = r * W + c, x = S.b[i];
          const zone = r === 0 ? 'z1' : r === H - 1 ? 'z0' : '';
          html += `<button type="button" class="tw-c ${zone} ${targets.includes(i) ? 'tg' : ''} ${sel && sel.i === i ? 'sel' : ''}" data-i="${i}">${x ? `<span class="tw-p o${x.o}">${arrows(x.t)}${NAME[x.t]}<small>${KNAME[x.t]}</small></span>` : ''}</button>`;
        }
        $('twB').innerHTML = html;
        const hand = p => `<span class="muted">${who(p)} 잡은 말</span>` + (S.hand[p].length ? S.hand[p].map((k, n) => `<button type="button" class="tw-p o${p} small ${sel && sel.drop === k && sel.p === p ? 'sel' : ''}" data-drop="${k}" data-p="${p}">${arrows(k)}${NAME[k]}</button>`).join('') : '<span class="muted">없음</span>');
        $('twH0').innerHTML = hand(0); $('twH1').innerHTML = hand(1);
        $('twMsg').textContent = over ? '게임 끝' : busy ? 'AI 생각 중…' : `${who(S.turn)} 차례` + (S.kingIn[1 - S.turn] ? ` — ${who(1 - S.turn)} 왕이 끝줄에 있어요! 지금 잡지 못하면 져요` : '');
        $('twLog').innerHTML = log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
        $('twUndo').disabled = !hist.length || busy || over;
      }
      wrap.addEventListener('click', e => {
        if (!human()) return;
        const d = e.target.closest('[data-drop]');
        if (d) { if (+d.dataset.p !== S.turn) return; sel = sel && sel.drop === d.dataset.drop ? null : { drop: d.dataset.drop, p: S.turn }; return render(); }
        const c = e.target.closest('[data-i]'); if (!c) return;
        const i = +c.dataset.i, x = S.b[i];
        if (sel) { const m = moves(S).find(m => m.t === i && (sel.drop ? m.drop === sel.drop : m.f === sel.i)); if (m) return play(m); }
        sel = x && x.o === S.turn ? (sel && sel.i === i ? null : { i }) : null; render();
      });
      LAB.ready(root, start); // 설정을 고르고 "게임 시작"을 눌러야 시작
      return () => T.clear();
    }
  });
})();
