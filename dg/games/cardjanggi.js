// 카드 장기 (데블스 플랜 시즌3 결승 1회전) — 행마 카드 5장의 순서를 미리 정해 두고 그 순서대로 말을 움직여 상대 큰 말을 잡거나 상대 큰 말 자리에 들어가면 승리
(function () {
  const N = 5;
  const CARDS = ['rat', 'horse', 'monkey', 'elephant', 'giraffe'];
  const CN = { rat: '쥐', horse: '말', monkey: '원숭이', elephant: '코끼리', giraffe: '기린' };
  const CE = { rat: '🐭', horse: '🐴', monkey: '🐵', elephant: '🐘', giraffe: '🦒' };
  const CD = { rat: '상하좌우 1칸', horse: '나이트(L자, 뛰어넘기)', monkey: '둘레 8칸 중 1칸', elephant: '대각선으로 막힐 때까지(비숍)', giraffe: '상하좌우 2칸(뛰어넘기)' };
  const rnd = n => Math.floor(Math.random() * n);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const inb = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
  const GOAL = [[0, 2], [4, 2]]; // 플레이어 p의 큰 말이 가야 할 칸 = 상대 큰 말 시작 칸
  const START = [[4, 2], [0, 2]];

  function initBoard() {
    const b = Array.from({ length: N }, () => Array(N).fill(null));
    b[4][2] = { o: 0, big: true }; b[4][1] = { o: 0 }; b[4][3] = { o: 0 }; b[3][2] = { o: 0 };
    b[0][2] = { o: 1, big: true }; b[0][1] = { o: 1 }; b[0][3] = { o: 1 }; b[1][2] = { o: 1 };
    return b;
  }
  const clone = b => b.map(r => r.map(x => x && { ...x }));
  function targets(b, r, c, card) {
    const me = b[r][c].o, out = [];
    const add = (rr, cc) => { if (inb(rr, cc) && (!b[rr][cc] || b[rr][cc].o !== me)) out.push([rr, cc]); };
    if (card === 'rat') [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => add(r + dr, c + dc));
    else if (card === 'horse') [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]].forEach(([dr, dc]) => add(r + dr, c + dc));
    else if (card === 'monkey') { for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) add(r + dr, c + dc); }
    else if (card === 'giraffe') [[2, 0], [-2, 0], [0, 2], [0, -2]].forEach(([dr, dc]) => add(r + dr, c + dc));
    else if (card === 'elephant') for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      let rr = r + dr, cc = c + dc;
      while (inb(rr, cc)) { if (b[rr][cc]) { if (b[rr][cc].o !== me) out.push([rr, cc]); break; } out.push([rr, cc]); rr += dr; cc += dc; }
    }
    return out;
  }
  function moves(b, p, card) {
    const out = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (b[r][c] && b[r][c].o === p) for (const t of targets(b, r, c, card)) out.push({ from: [r, c], to: t });
    return out;
  }
  // 움직이고 승패 판정. 반환: 이긴 사람(0/1) 또는 -1
  function apply(b, m) {
    const [fr, fc] = m.from, [tr, tc] = m.to, pc = b[fr][fc], cap = b[tr][tc];
    b[tr][tc] = pc; b[fr][fc] = null;
    if (cap && cap.big) return pc.o;
    if (pc.big && tr === GOAL[pc.o][0] && tc === GOAL[pc.o][1]) return pc.o;
    return -1;
  }
  function findBig(b, p) { for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (b[r][c] && b[r][c].o === p && b[r][c].big) return [r, c]; return null; }

  // ---------- AI ----------
  const ALLC = CARDS;
  const HARD = { depth: 3, wide: 3, samples: 6, plies: 10 }; // 시뮬레이션: 보통 상대로 약 55~56%
  // p가 card로 상대 큰 말을 잡거나 목표에 들어갈 수 있는가 (큰 말 자리/목표 칸에 닿는 말이 있는지만 확인)
  function canWinWith(b, p, card) {
    const ob = findBig(b, 1 - p), g = GOAL[p], mb = findBig(b, p);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const x = b[r][c]; if (!x || x.o !== p) continue;
      for (const [tr, tc] of targets(b, r, c, card)) { if (ob && tr === ob[0] && tc === ob[1]) return true; if (x.big && tr === g[0] && tc === g[1]) return true; } }
    return false;
  }
  function evalBoard(b, p) { // p 입장 점수
    let s = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const x = b[r][c]; if (!x) continue;
      const sg = x.o === p ? 1 : -1;
      if (x.big) { const g = GOAL[x.o]; s += sg * (8 - (Math.abs(r - g[0]) + Math.abs(c - g[1]))) * .6; }
      else s += sg * 3;
    }
    // 내 큰 말을 위협하는 카드 수 / 상대 큰 말 위협
    const opp = 1 - p;
    let threatMe = 0, threatOpp = 0;
    for (const card of ALLC) { if (canWinWith(b, opp, card)) threatMe++; if (canWinWith(b, p, card)) threatOpp++; }
    return s - threatMe * 1.4 + threatOpp * .8;
  }
  // 알고 있는 카드 순서로 몇 수 앞을 봄. seq: [{p, cards:[가능한 카드들], prob}] 차례 목록
  function search(b, seq, k, root) {
    if (k >= seq.length) return evalBoard(b, root);
    const { p, cards } = seq[k];
    let tot = 0;
    for (const card of cards) {
      const ms = moves(b, p, card);
      if (!ms.length) { tot += search(b, seq, k + 1, root); continue; }
      let best = p === root ? -1e9 : 1e9;
      for (const m of ms) {
        const nb = clone(b), w = apply(nb, m);
        const v = w >= 0 ? (w === root ? 1000 - k : -1000 + k) : search(nb, seq, k + 1, root);
        if (p === root ? v > best : v < best) best = v;
      }
      tot += best;
    }
    return tot / cards.length;
  }
  // 앞으로 둘 차례 순서 만들기: 내 남은 카드(순서 앎), 상대는 다음 카드만 앎 + 나머지는 남은 카드 중 아무거나
  function futureSeq(G, p, depth, wide) {
    const seq = [], myQ = (G.queue[p] || []).slice(G.idx[p]);
    // 상대: 공개된 다음 카드 1장만 알고, 그 뒤는 이번 배치에서 아직 안 나온 카드 중 하나로 봄
    const oq = G.queue[1 - p], oUsed = oq ? oq.slice(0, G.idx[1 - p]) : [], oNext = oq ? oq[G.idx[1 - p]] : null, oLeft = oq ? oq.length - G.idx[1 - p] : 0;
    const oRest = ALLC.filter(c => !oUsed.includes(c) && c !== oNext);
    let turn = G.turn, mi = 0, oi = 0;
    for (let d = 0; d < depth; d++) {
      if (turn === p) { seq.push({ p, cards: mi < myQ.length ? [myQ[mi]] : shuffle(ALLC.slice()).slice(0, 2) }); mi++; }
      else { const pool = oi === 0 && oNext ? [oNext] : oi < oLeft && oRest.length ? oRest : ALLC; seq.push({ p: 1 - p, cards: pool.length > (wide || 2) ? shuffle(pool.slice()).slice(0, wide || 2) : pool }); oi++; }
      turn = 1 - turn;
    }
    return seq;
  }
  function aiMove(G, p, lv) {
    const card = G.queue[p][G.idx[p]], ms = moves(G.board, p, card);
    if (!ms.length) return null;
    if (lv === 0 && Math.random() < .35) return ms[rnd(ms.length)];
    const depth = lv === 2 ? HARD.depth : lv === 1 ? 3 : 1;
    const seq = futureSeq(G, p, depth, lv === 2 ? HARD.wide : 2).slice(1); // 첫 차례(지금 내 수)는 직접 고름
    let best = ms[0], bv = -1e9;
    for (const m of ms) {
      const nb = clone(G.board), w = apply(nb, m);
      const v = (w === p ? 1e4 : search(nb, seq, 0, p)) + Math.random() * (lv === 2 ? .05 : .4);
      if (v > bv) { bv = v; best = m; }
    }
    return best;
  }
  // 카드 순서 정하기: 후보 순서마다 몇 수 앞을 내다봐서 점수가 좋은 순서
  function greedyPlay(G, p, perm, plies) { // 정한 순서대로 몇 수 욕심껏 두어 봄(상대도 욕심껏, 모르는 카드는 무작위)
    const b = clone(G.board), q = [G.queue.slice(), G.idx.slice()]; let turn = G.turn;
    const myQ = perm.slice(), oq = G.queue[1 - p], oi0 = G.idx[1 - p];
    const oLeft = oq ? oq.slice(oi0) : [], oUnknown = shuffle(ALLC.filter(c => !(oq || []).slice(0, oi0).includes(c) && c !== oLeft[0]));
    let mi = 0, oi = 0;
    for (let k = 0; k < plies; k++) {
      const me = turn === p;
      const card = me ? (myQ[mi++] || ALLC[rnd(5)]) : (oi === 0 && oLeft[0] ? (oi++, oLeft[0]) : (oUnknown[(oi++) % Math.max(1, oUnknown.length)] || ALLC[rnd(5)]));
      const ms = moves(b, turn, card);
      if (ms.length) { let best = ms[0], bv = -1e9;
        for (const m of ms) { const nb = clone(b), w = apply(nb, m); const v = w === turn ? 1e4 : evalBoard(nb, turn); if (v > bv) { bv = v; best = m; } }
        const w = apply(b, best); if (w >= 0) return w === p ? 900 - k * 10 : -900 + k * 10; }
      turn = 1 - turn;
    }
    return evalBoard(b, p);
  }
  function aiArrange(G, p, count, lv) {
    const perms = [];
    (function gen(cur, left) { if (cur.length === count) { perms.push(cur.slice()); return; } for (let i = 0; i < left.length; i++) { cur.push(left[i]); gen(cur, left.filter((_, j) => j !== i)); cur.pop(); } })([], ALLC);
    if (lv === 0) return perms[rnd(perms.length)];
    const cand = lv === 2 ? perms : shuffle(perms).slice(0, 30), samples = lv === 2 ? HARD.samples : 2;
    let best = cand[0], bv = -1e9;
    for (const perm of cand) {
      let v = 0; for (let k = 0; k < samples; k++) v += greedyPlay(G, p, perm, lv === 2 ? HARD.plies : 6);
      v = v / samples + Math.random() * .3;
      if (v > bv) { bv = v; best = perm; }
    }
    return best;
  }

  // ---------- 라운드 진행 ----------
  function newRound(first) {
    return { board: initBoard(), first, turn: first, queue: [null, null], idx: [0, 0], cycle: [0, 0], winner: -1, moves: 0, log: [], last: null };
  }
  // p가 다음에 쓸 카드가 없으면 재배치 필요
  const needArrange = (G, p) => !G.queue[p] || G.idx[p] >= G.queue[p].length;
  function setQueue(G, p, order) { G.queue[p] = order.slice(); G.idx[p] = 0; G.cycle[p]++; }
  function doMove(G, m) { // m 없음 = 이동 불가로 넘김
    const p = G.turn, card = G.queue[p][G.idx[p]];
    let w = -1;
    if (m) { w = apply(G.board, m); G.last = { p, card, ...m }; } else G.last = { p, card, pass: true };
    G.idx[p]++; G.moves++; G.turn = 1 - p;
    if (w >= 0) G.winner = w;
    return w;
  }

  const ENG = { HARD, N, CARDS, initBoard, moves, apply, targets, newRound, needArrange, setQueue, doMove, aiMove, aiArrange };
  if (typeof module !== 'undefined' && module.exports) { module.exports = ENG; return; }
  if (typeof LAB === 'undefined') return;

  // ---------- 화면 ----------
  const { h, esc, seg } = LAB;
  const pattern = card => { // 카드에 그리는 작은 이동 그림 (5×5, 가운데가 말)
    const b = Array.from({ length: N }, () => Array(N).fill(null)); b[2][2] = { o: 0 };
    const t = targets(b, 2, 2, card).map(([r, c]) => r * N + c);
    let s = ''; for (let i = 0; i < N * N; i++) s += `<i class="${i === 12 ? 'o' : t.includes(i) ? 'x' : ''}"></i>`;
    return `<span class="cj-pat">${s}</span>`;
  };
  const cardHtml = (card, cls = '', attrs = '') => card ? `<button type="button" class="cjc ${cls}" ${attrs}><span class="e">${CE[card]}</span><b>${CN[card]}</b>${pattern(card)}</button>` : `<span class="cjc back ${cls}"><b>?</b></span>`;

  LAB.add({
    id: 'cardjanggi', name: '카드 장기', show: '데블스플랜',
    rules: `<ul>
      <li>5×5 판. 각자 <b>큰 말 1개, 작은 말 3개</b>와 행마 카드 5장(${CARDS.map(c => `${CE[c]} ${CN[c]}: ${CD[c]}`).join(' · ')})을 가져요.</li>
      <li>쓸 카드의 <b>순서를 몰래 정해</b> 뒤집어 놓아요. <b>선공은 5장 모두, 후공은 5장 중 4장</b>만 골라요. 다음에 쓸 카드 1장은 늘 공개돼요.</li>
      <li>선공부터 번갈아, 공개된 카드의 행마법대로 <b>내 말 아무거나 하나</b>를 움직여요. 상대 말이 있는 칸에 가면 그 말을 잡아요. 움직일 수 없으면 넘어가요.</li>
      <li>카드를 다 쓰면 <b>즉시 5장을 다시 배치</b>하고 첫 카드만 공개해요(첫 판에선 후공이 먼저 다 써서, 선공은 상대 새 배치의 첫 카드를 보고 마지막 카드를 써요).</li>
      <li><b>상대 큰 말을 잡거나, 내 큰 말이 상대 큰 말의 시작 칸에 들어가면</b> 이 판 승리. 3판 2선승이고 선후공은 판마다 번갈아요.</li>
      <li>이 사이트 버전 기준: 판 크기와 시작 위치는 방송 화면을 따라 5×5에 큰 말은 맨 뒷줄 가운데로 정했어요. 한 판에 60수가 넘으면 무승부로 다시 해요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      let pend = { lv: 1 }, cfg = { ...pend }, M = null, G = null, sel = null, arr = [];
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dp-score"><div><small>나 (파랑)</small><b id="cjMe">0</b></div><div class="dp-mid"><span id="cjRound"></span><small id="cjSub"></small></div><div><small>AI (빨강)</small><b id="cjAi">0</b></div></div>
          <div class="cj-q opp"><span class="muted">AI 카드</span><div id="cjOppQ" class="cj-row"></div></div>
          <div class="cj-board" id="cjB"></div>
          <div class="cj-q"><span class="muted">내 카드 순서</span><div id="cjMyQ" class="cj-row"></div></div>
          <p class="g-msg" id="cjMsg"></p>
          <div id="cjArr" class="cj-arr"></div>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정 (새 게임에 적용)</h3>
            <div class="opt"><span>AI 난이도</span><div id="cjLv"></div></div>
            <button type="button" class="primary" id="cjNew">새 게임</button></div>
          <div class="card"><h3>행마 카드</h3><div class="cj-help">${CARDS.map(c => `<div>${cardHtml(c, 'sm', 'disabled')}<span>${CD[c]}</span></div>`).join('')}</div></div>
          <div class="card"><h3>진행 기록</h3><div class="log" id="cjLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('cjLv').appendChild(seg([[0, '쉬움'], [1, '보통'], [2, '어려움']], 1, v => pend.lv = v));
      $('cjNew').onclick = start;
      const log = t => M.log.push(t);
      const sq = (r, c) => `${'abcde'[c]}${N - r}`;
      function start() { T.clear(); cfg = { ...pend }; M = { score: [0, 0], roundNo: 0, log: [], over: false }; const f = rnd(2); log(`동전 던지기: ${f === 0 ? '내가' : 'AI가'} 1판 선공`); nextRound(f); }
      function nextRound(first) {
        M.roundNo++; G = newRound(first); sel = null; arr = [];
        log(`— ${M.roundNo}판 (선공 ${first === 0 ? '나' : 'AI'})`);
        // AI는 바로 배치, 나는 배치 화면
        setQueue(G, 1, aiArrange(G, 1, first === 1 ? 5 : 4, cfg.lv)); G.cycle[1] = 1;
        G.phase = 'arrange'; G.arrCount = first === 0 ? 5 : 4; render();
      }
      function confirmArrange() {
        if (arr.length !== G.arrCount) return;
        setQueue(G, 0, arr); arr = [];
        if (G.phase === 'arrange') { G.phase = 'play'; log('두 사람 모두 카드를 배치했어요. 첫 카드를 공개해요'); }
        else { G.phase = 'play'; log('카드 5장을 다시 배치했어요'); }
        render(); proceed();
      }
      function proceed() {
        if (G.winner >= 0) return endRound(G.winner);
        if (G.moves >= 60) { log('60수가 지나 무승부 — 다시 해요'); render(); T.set(() => nextRound(G.first), 1500); return; }
        // 카드를 다 쓴 사람은 즉시 재배치
        if (needArrange(G, 1)) { setQueue(G, 1, aiArrange(G, 1, 5, cfg.lv)); log('AI가 카드 5장을 다시 배치했어요'); }
        if (needArrange(G, 0)) { G.phase = 'rearrange'; G.arrCount = 5; render(); return; }
        render();
        if (G.turn === 1) T.set(() => { const m = aiMove(G, 1, cfg.lv); const card = G.queue[1][G.idx[1]];
          log(m ? `AI ${CN[card]}: ${sq(...m.from)}→${sq(...m.to)}${G.board[m.to[0]][m.to[1]] ? ' (잡음)' : ''}` : `AI ${CN[card]}: 움직일 수 없어 넘김`);
          doMove(G, m); render(); T.set(proceed, 350); }, 800);
        else if (!moves(G.board, 0, G.queue[0][G.idx[0]]).length) T.set(() => { log(`나 ${CN[G.queue[0][G.idx[0]]]}: 움직일 수 없어 넘김`); doMove(G, null); render(); T.set(proceed, 400); }, 1200);
      }
      function endRound(w) {
        M.score[w]++; log(`${M.roundNo}판: ${w === 0 ? '내가' : 'AI가'} 이겼어요 (${M.score[0]}:${M.score[1]})`); render();
        if (M.score[w] >= 2) { M.over = true; T.set(() => LAB.end(w === 0 ? '승리' : '패배', `최종 ${M.score[0]} : ${M.score[1]}`, start), 1200); return; }
        T.set(() => nextRound(1 - G.first), 1800);
      }
      function clickCell(r, c) {
        if (!G || G.phase !== 'play' || G.turn !== 0 || G.winner >= 0) return;
        const card = G.queue[0][G.idx[0]], x = G.board[r][c];
        if (sel) {
          const t = targets(G.board, sel[0], sel[1], card);
          if (t.some(([a, b]) => a === r && b === c)) {
            const capd = !!G.board[r][c]; log(`나 ${CN[card]}: ${sq(...sel)}→${sq(r, c)}${capd ? ' (잡음)' : ''}`);
            doMove(G, { from: sel, to: [r, c] }); sel = null; render(); T.set(proceed, 300); return;
          }
        }
        sel = x && x.o === 0 ? [r, c] : null; render();
      }
      $('cjB').addEventListener('click', e => { const el = e.target.closest('[data-rc]'); if (el) clickCell(...el.dataset.rc.split(',').map(Number)); });
      $('cjArr').addEventListener('click', e => {
        const b = e.target.closest('[data-c]'); if (b && !b.disabled) { if (arr.length < G.arrCount && !arr.includes(b.dataset.c)) arr.push(b.dataset.c); render(); return; }
        const u = e.target.closest('[data-undo]'); if (u) { arr.pop(); render(); return; }
        const ok = e.target.closest('[data-ok]'); if (ok) confirmArrange();
      });

      function render() {
        $('cjMe').textContent = M.score[0]; $('cjAi').textContent = M.score[1];
        $('cjRound').textContent = M.over ? '게임 끝' : `${M.roundNo}판 · 3판 2선승`;
        $('cjSub').textContent = `${G.first === 0 ? '내가' : 'AI가'} 선공 · ${G.moves}수`;
        const arranging = G.phase !== 'play';
        const myCard = !arranging && G.turn === 0 && G.winner < 0 ? G.queue[0][G.idx[0]] : null;
        const tg = sel && myCard ? targets(G.board, sel[0], sel[1], myCard).map(([r, c]) => r * N + c) : [];
        const movable = myCard ? new Set(moves(G.board, 0, myCard).map(m => m.from[0] * N + m.from[1])) : new Set();
        let s = '';
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const x = G.board[r][c], i = r * N + c, goal = (r === 0 || r === 4) && c === 2;
          const lastHit = G.last && !G.last.pass && ((G.last.to[0] === r && G.last.to[1] === c) || (G.last.from[0] === r && G.last.from[1] === c));
          s += `<button type="button" class="cjs ${goal ? 'goal g' + (r === 0 ? 0 : 1) : ''} ${tg.includes(i) ? 'tg' : ''} ${sel && sel[0] === r && sel[1] === c ? 'sel' : ''} ${movable.has(i) ? 'mv' : ''} ${lastHit ? 'last' : ''}" data-rc="${r},${c}">${x ? `<span class="cjp p${x.o} ${x.big ? 'big' : ''}">${x.big ? '王' : ''}</span>` : ''}</button>`;
        }
        $('cjB').innerHTML = s;
        // 카드 줄
        const myQ = G.queue[0] ? G.queue[0].map((c, k) => cardHtml(c, `${k < G.idx[0] ? 'used' : k === G.idx[0] ? 'now' : ''}`, 'disabled')).join('') : '<span class="muted">배치 전</span>';
        $('cjMyQ').innerHTML = arranging ? '' : myQ;
        const oq = G.queue[1], oi = G.idx[1];
        $('cjOppQ').innerHTML = arranging && G.phase === 'arrange' ? '<span class="muted">배치 중…</span>' : oq.map((c, k) => k < oi ? cardHtml(c, 'used', 'disabled') : k === oi ? cardHtml(c, 'now', 'disabled') : cardHtml(null)).join('');
        // 배치 화면
        if (arranging) {
          $('cjArr').hidden = false;
          $('cjArr').innerHTML = `<div class="cj-slots">${Array.from({ length: G.arrCount }, (_, k) => arr[k] ? cardHtml(arr[k], 'sm', 'disabled') : `<span class="cjc slot">${k + 1}</span>`).join('')}</div>
            <div class="cj-row">${CARDS.map(c => cardHtml(c, arr.includes(c) ? 'used' : '', `data-c="${c}" ${arr.includes(c) || arr.length >= G.arrCount ? 'disabled' : ''}`)).join('')}</div>
            <div class="row"><button type="button" data-undo ${arr.length ? '' : 'disabled'}>하나 빼기</button><button type="button" class="primary" data-ok ${arr.length === G.arrCount ? '' : 'disabled'}>이 순서로 확정</button></div>`;
        } else $('cjArr').hidden = true;
        $('cjMsg').textContent = M.over ? '게임 끝' : G.winner >= 0 ? (G.winner === 0 ? '이번 판 승리!' : '이번 판 패배') :
          G.phase === 'arrange' ? `쓸 카드 ${G.arrCount}장의 순서를 정하세요 (${G.arrCount === 4 ? '후공이라 5장 중 4장' : '선공이라 5장 모두'}). AI의 첫 카드는 확정한 뒤 공개돼요` :
          G.phase === 'rearrange' ? `카드를 다 썼어요. 5장을 다시 배치하세요${G.turn === 1 ? '' : ''} — AI의 다음 카드: ${CN[G.queue[1][G.idx[1]]] || '-'}` :
          G.turn === 0 ? (sel ? `${CN[myCard]}: 갈 칸(초록 점)을 누르세요` : `내 차례 — ${CE[myCard]} ${CN[myCard]}로 움직일 말을 고르세요 (${CD[myCard]})`) : `AI 차례 — ${CN[G.queue[1][G.idx[1]]]}`;
        $('cjLog').innerHTML = M.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
      }
      LAB.ready(root, start);
      return () => T.clear();
    }
  });
})();
