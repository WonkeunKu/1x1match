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

  // ---------- 1:1 대결 규칙 (AI 대전·온라인 대전 공용, 서버도 불러 씀) ----------
  // 판은 자리 0이 아래쪽(엔진 플레이어 0). 자리 1에게는 180도 돌려서 보여 주고, 받은 좌표도 돌려서 처리
  const fail = m => { throw Object.assign(new Error(m), { duel: true }); };
  const rot = ([r, c]) => [N - 1 - r, N - 1 - c];
  const DUEL = {
    init(prev) { const s = { mid: Math.random().toString(36).slice(2, 9), score: [0, 0], roundNo: 0, log: [], winner: -1, lastRoundWinner: -1 }; return DUEL.newRound(s, prev ? 1 - prev.matchFirst : rnd(2), true); },
    newRound(s, first, isMatchStart) {
      s.R = newRound(first); s.roundFirst = first; s.phase = 'arrange'; s.need = [first === 0 ? 5 : 4, first === 1 ? 5 : 4]; s.roundNo++;
      if (isMatchStart) s.matchFirst = first;
      return s;
    },
    act(s, seat, a) {
      const R = s.R;
      if (a.type === 'arrange') {
        const n = s.need[seat]; if (!n || s.phase === 'over') fail('지금은 카드를 배치할 때가 아니에요.');
        const ord = (a.order || []).map(String);
        if (ord.length !== n || new Set(ord).size !== n || ord.some(c => !CARDS.includes(c))) fail(`서로 다른 카드 ${n}장의 순서를 정해 주세요.`);
        setQueue(R, seat, ord); s.need[seat] = 0;
        if (s.phase === 'arrange' && !s.need[0] && !s.need[1]) s.phase = 'play';
        return;
      }
      if (a.type === 'move' || a.type === 'pass') {
        if (s.phase !== 'play') fail('지금은 움직일 수 없어요.');
        if (s.need[0] || s.need[1]) fail('카드 배치를 기다리는 중이에요.');
        if (R.turn !== seat) fail('내 차례가 아니에요.');
        const card = R.queue[seat][R.idx[seat]], legal = moves(R.board, seat, card);
        let m = null;
        if (a.type === 'move') {
          let from = a.from, to = a.to; if (seat === 1) { from = rot(from); to = rot(to); }
          m = legal.find(x => x.from[0] === from[0] && x.from[1] === from[1] && x.to[0] === to[0] && x.to[1] === to[1]);
          if (!m) fail('그 카드로는 그렇게 움직일 수 없어요.');
        } else if (legal.length) fail('움직일 수 있는 말이 있어요.');
        const capd = m && !!R.board[m.to[0]][m.to[1]];
        doMove(R, m);
        s.log.push({ p: seat, card, kind: m ? (capd ? 'cap' : 'move') : 'pass' });
        if (R.winner >= 0) {
          s.score[R.winner]++; s.lastRoundWinner = R.winner; s.log.push({ round: s.roundNo, w: R.winner });
          if (s.score[R.winner] >= 2) { s.phase = 'over'; s.winner = R.winner; } else DUEL.newRound(s, 1 - s.roundFirst);
          return;
        }
        if (R.moves >= 60) { s.log.push({ draw: true }); s.roundNo--; DUEL.newRound(s, s.roundFirst); return; }
        if (needArrange(R, seat)) s.need[seat] = 5; // 카드를 다 쓰면 바로 다시 배치
        return;
      }
      fail('알 수 없는 행동이에요.');
    },
    view(s, seat) {
      const R = s.R, o = 1 - seat;
      let B = R.board.map(r => r.map(x => x && { o: x.o === seat ? 0 : 1, big: !!x.big }));
      if (seat === 1) B = B.slice().reverse().map(r => r.slice().reverse());
      const L = R.last && (R.last.pass ? { pass: true, mine: R.last.p === seat } : { from: seat === 1 ? rot(R.last.from) : R.last.from, to: seat === 1 ? rot(R.last.to) : R.last.to, mine: R.last.p === seat });
      const oq = R.queue[o] || [], oi = R.idx[o];
      const rel = x => x < 0 ? -1 : x === seat ? 0 : 1;
      return { mid: s.mid, starter: rel(s.matchFirst), phase: s.phase, score: [s.score[seat], s.score[o]], roundNo: s.roundNo, first: rel(R.first), turn: rel(R.turn), moves: R.moves,
        board: B, myQueue: R.queue[seat], myIdx: R.idx[seat], myNeed: s.need[seat], oppNeed: s.need[o], oppLen: oq.length,
        oppQueue: oq.map((c, k) => k < oi || (k === oi && !s.need[o]) ? c : null), oppIdx: oi, winner: rel(s.winner), lastRoundWinner: rel(s.lastRoundWinner), last: L,
        log: s.log.slice(-24).map(x => x.p != null ? { ...x, p: rel(x.p) } : x.w != null ? { ...x, w: rel(x.w) } : x) };
    },
    // 자기 화면에서 보이는 것만으로 AI 행동 고르기 (자기 시점: 나=0, 아래쪽)
    ai(v, lv) {
      if (v.phase === 'over') return null;
      const G = { board: v.board.map(r => r.map(x => x && { ...x })), queue: [v.myQueue, v.oppQueue], idx: [v.myIdx, v.oppIdx], turn: v.turn };
      if (v.myNeed) return { type: 'arrange', order: aiArrange(G, 0, v.myNeed, lv) };
      if (v.phase !== 'play' || v.turn !== 0 || v.oppNeed) return null;
      const m = aiMove(G, 0, lv);
      return m ? { type: 'move', from: m.from, to: m.to } : { type: 'pass' };
    },
  };

  const ENG = { HARD, N, CARDS, initBoard, moves, apply, targets, newRound, needArrange, setQueue, doMove, aiMove, aiArrange, DUEL };
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
  const sq = (r, c) => `${'abcde'[c]}${N - r}`;

  LAB.add({
    id: 'cardjanggi', name: '카드 장기', show: '데블스플랜',
    rules: `<ul>
      <li>5×5 판. 각자 <b>큰 말 1개, 작은 말 3개</b>와 행마 카드 5장(${CARDS.map(c => `${CE[c]} ${CN[c]}: ${CD[c]}`).join(' · ')})을 가져요.</li>
      <li>쓸 카드의 <b>순서를 몰래 정해</b> 뒤집어 놓아요. <b>선공은 5장 모두, 후공은 5장 중 4장</b>만 골라요. 다음에 쓸 카드 1장은 늘 공개돼요.</li>
      <li>선공부터 번갈아, 공개된 카드의 행마법대로 <b>내 말 아무거나 하나</b>를 움직여요. 상대 말이 있는 칸에 가면 그 말을 잡아요. 움직일 수 없으면 넘어가요.</li>
      <li>카드를 다 쓰면 <b>즉시 5장을 다시 배치</b>하고 첫 카드만 공개해요(첫 판에선 후공이 먼저 다 써서, 선공은 상대 새 배치의 첫 카드를 보고 마지막 카드를 써요).</li>
      <li><b>상대 큰 말을 잡거나, 내 큰 말이 상대 큰 말의 시작 칸에 들어가면</b> 이 판 승리. 3판 2선승이고 선후공은 판마다 번갈아요.</li>
      <li>상대는 <b>AI</b> 또는 <b>사람</b>(각자 자기 기기로 같은 방에 들어와 1:1)이에요.</li>
      <li>이 사이트 버전 기준: 판 크기와 시작 위치는 5×5에 큰 말을 맨 뒷줄 가운데로 정했어요. 한 판에 60수가 넘으면 무승부로 다시 해요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      const roomLink = LAB.roomParam();
      let shownMid = null; let pend = { lv: 1, opp: roomLink ? 'net' : 'ai' }, cfg = { ...pend }, st = null, net = null, sel = null, arr = [], busy = false, lastArgs = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dn-lobby" id="cjLobby" hidden></div>
          <div id="cjGame">
          <div class="dp-score"><div><small>나 (파랑)</small><b id="cjMe">0</b></div><div class="dp-mid"><span id="cjRound"></span><small id="cjSub"></small></div><div><small id="cjOpN">상대 (빨강)</small><b id="cjAi">0</b></div></div>
          <div class="cj-q opp"><span class="muted" id="cjOpLab">상대 카드</span><div id="cjOppQ" class="cj-row"></div></div>
          <div class="cj-board" id="cjB"></div>
          <div class="cj-q"><span class="muted">내 카드 순서</span><div id="cjMyQ" class="cj-row"></div></div>
          <p class="g-msg" id="cjMsg"></p>
          <div id="cjArr" class="cj-arr"></div>
          <div id="cjAgain"></div>
          </div>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정 (새 게임에 적용)</h3>
            <div class="opt"><span>상대</span><div id="cjOpp2"></div></div>
            <div class="opt" id="cjLvOpt"><span>AI 난이도</span><div id="cjLv"></div></div>
            <button type="button" class="primary" id="cjNew">새 게임</button></div>
          <div class="card"><h3>행마 카드</h3><div class="cj-help">${CARDS.map(c => `<div>${cardHtml(c, 'sm', 'disabled')}<span>${CD[c]}</span></div>`).join('')}</div></div>
          <div class="card"><h3>진행 기록</h3><div class="log" id="cjLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('cjOpp2').appendChild(seg([['ai', 'AI'], ['net', '사람 (온라인)']], pend.opp, v => { pend.opp = v; $('cjLvOpt').hidden = v !== 'ai'; }));
      $('cjLvOpt').hidden = pend.opp !== 'ai';
      $('cjLv').appendChild(seg([[0, '쉬움'], [1, '보통'], [2, '어려움']], 1, v => pend.lv = v));
      $('cjNew').onclick = start;
      function start() {
        T.clear(); cfg = { ...pend }; sel = null; arr = []; lastArgs = null;
        if (net) { net.close(); net = null; }
        if (cfg.opp === 'net') {
          $('cjGame').hidden = true;
          net = LAB.duel('cardjanggi', { el: $('cjLobby'), onView: v => { if (!v.st) { $('cjGame').hidden = true; return; } net.hideLobby(); $('cjGame').hidden = false; show(v.st, v.opp || '상대', v); }, onError: m => { $('cjMsg').textContent = m; } });
          net.start(); return;
        }
        $('cjLobby').hidden = true; $('cjGame').hidden = false;
        st = DUEL.init(null); local(); aiStep();
      }
      const local = () => show(DUEL.view(st, 0), 'AI', null);
      function aiStep() {
        if (!st || st.phase === 'over') return;
        const v1 = DUEL.view(st, 1), a = DUEL.ai(v1, cfg.lv);
        if (a) T.set(() => { try { DUEL.act(st, 1, a); } catch (e) { console.error(e); } local(); aiStep(); afterLocal(); }, a.type === 'arrange' ? 300 : 800);
      }
      function afterLocal() { if (st.phase === 'over' && !st.ended) { st.ended = true; T.set(() => LAB.end(st.winner === 0 ? '승리' : '패배', `최종 ${st.score[0]} : ${st.score[1]}`, start), 1200); } }
      async function send(a) {
        if (busy) return;
        if (net) { busy = true; await net.act(a); busy = false; return; }
        try { DUEL.act(st, 0, a); } catch (e) { $('cjMsg').textContent = e.message; return; }
        local(); aiStep(); afterLocal();
      }
      wrap.addEventListener('click', e => {
        const v = lastArgs && lastArgs[0]; if (!v) return;
        const c = e.target.closest('[data-rc]');
        if (c) { // 말 고르기 → 갈 칸
          const [r, cc] = c.dataset.rc.split(',').map(Number);
          if (v.phase !== 'play' || v.turn !== 0 || v.myNeed || v.oppNeed) return;
          const card = v.myQueue[v.myIdx];
          if (sel) { const t = targets(v.board, sel[0], sel[1], card); if (t.some(([a, b]) => a === r && b === cc)) { const from = sel; sel = null; send({ type: 'move', from, to: [r, cc] }); return; } }
          const x = v.board[r][cc]; sel = x && x.o === 0 ? [r, cc] : null; show(...lastArgs); return;
        }
        const b = e.target.closest('[data-c]'); if (b && !b.disabled) { if (arr.length < v.myNeed && !arr.includes(b.dataset.c)) arr.push(b.dataset.c); show(...lastArgs); return; }
        if (e.target.closest('[data-undo]')) { arr.pop(); show(...lastArgs); return; }
        if (e.target.closest('[data-ok]')) { if (arr.length === v.myNeed) { const order = arr.slice(); arr = []; send({ type: 'arrange', order }); } return; }
        if (e.target.closest('[data-pass]')) { send({ type: 'pass' }); return; }
        if (e.target.closest('[data-again]')) send({ type: 'again' });
      });

      function show(v, oppName, room) {
        lastArgs = [v, oppName, room];
        if (v.mid && v.mid !== shownMid) { shownMid = v.mid; LAB.coin(['나', oppName], v.starter); } // 대결이 새로 시작될 때 선후공 연출
        $('cjOpN').textContent = `${oppName} (빨강)`; $('cjOpLab').textContent = `${oppName} 카드`;
        $('cjMe').textContent = v.score[0]; $('cjAi').textContent = v.score[1];
        $('cjRound').textContent = v.phase === 'over' ? '게임 끝' : `${v.roundNo}판 · 3판 2선승`;
        $('cjSub').textContent = `${v.first === 0 ? '내가' : oppName + '가'} 선공 · ${v.moves}수`;
        const arranging = !!v.myNeed;
        const canMove = v.phase === 'play' && v.turn === 0 && !v.myNeed && !v.oppNeed;
        const myCard = canMove ? v.myQueue[v.myIdx] : null;
        const tg = sel && myCard ? targets(v.board, sel[0], sel[1], myCard).map(([r, c]) => r * N + c) : [];
        const movable = myCard ? new Set(moves(v.board, 0, myCard).map(m => m.from[0] * N + m.from[1])) : new Set();
        let s = '';
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const x = v.board[r][c], i = r * N + c, goal = (r === 0 || r === N - 1) && c === 2;
          const lastHit = v.last && !v.last.pass && ((v.last.to[0] === r && v.last.to[1] === c) || (v.last.from[0] === r && v.last.from[1] === c));
          s += `<button type="button" class="cjs ${goal ? 'goal g' + (r === 0 ? 0 : 1) : ''} ${tg.includes(i) ? 'tg' : ''} ${sel && sel[0] === r && sel[1] === c ? 'sel' : ''} ${movable.has(i) ? 'mv' : ''} ${lastHit ? 'last' : ''}" data-rc="${r},${c}">${x ? `<span class="cjp p${x.o} ${x.big ? 'big' : ''}">${x.big ? '王' : ''}</span>` : ''}</button>`;
        }
        $('cjB').innerHTML = s;
        $('cjMyQ').innerHTML = v.myQueue && !arranging ? v.myQueue.map((c, k) => cardHtml(c, k < v.myIdx ? 'used' : k === v.myIdx ? 'now' : '', 'disabled')).join('') : '<span class="muted">배치 중</span>';
        $('cjOppQ').innerHTML = v.oppNeed ? '<span class="muted">배치 중…</span>' : v.oppQueue.map((c, k) => k < v.oppIdx ? cardHtml(c, 'used', 'disabled') : k === v.oppIdx ? cardHtml(c, 'now', 'disabled') : cardHtml(null)).join('');
        if (arranging) {
          $('cjArr').hidden = false;
          $('cjArr').innerHTML = `<div class="cj-slots">${Array.from({ length: v.myNeed }, (_, k) => arr[k] ? cardHtml(arr[k], 'sm', 'disabled') : `<span class="cjc slot">${k + 1}</span>`).join('')}</div>
            <div class="cj-row">${CARDS.map(c => cardHtml(c, arr.includes(c) ? 'used' : '', `data-c="${c}" ${arr.includes(c) || arr.length >= v.myNeed ? 'disabled' : ''}`)).join('')}</div>
            <div class="row"><button type="button" data-undo ${arr.length ? '' : 'disabled'}>하나 빼기</button><button type="button" class="primary" data-ok ${arr.length === v.myNeed ? '' : 'disabled'}>이 순서로 확정</button></div>`;
        } else $('cjArr').hidden = true;
        const oppNext = v.oppQueue && v.oppQueue[v.oppIdx];
        const noMove = canMove && !movable.size;
        $('cjMsg').innerHTML = v.phase === 'over' ? (v.winner === 0 ? `승리! ${v.score[0]} : ${v.score[1]}` : `패배 ${v.score[0]} : ${v.score[1]}`)
          : arranging ? esc(v.phase === 'arrange' ? `쓸 카드 ${v.myNeed}장의 순서를 정하세요 (${v.myNeed === 4 ? '후공이라 5장 중 4장' : '선공이라 5장 모두'}). 상대 첫 카드는 둘 다 확정한 뒤 공개돼요` : `카드를 다 썼어요. 5장을 다시 배치하세요${oppNext ? ` — ${oppName}의 다음 카드: ${CN[oppNext]}` : ''}`)
          : v.oppNeed ? esc(`${oppName}가 카드를 배치하는 중…`)
          : canMove ? (noMove ? `${CE[myCard]} ${CN[myCard]}로 움직일 수 있는 말이 없어요 <button type="button" data-pass>넘기기</button>` : esc(sel ? `${CN[myCard]}: 갈 칸(초록 점)을 누르세요` : `내 차례 — ${CE[myCard]} ${CN[myCard]}로 움직일 말을 고르세요 (${CD[myCard]})`))
          : esc(`${oppName} 차례${oppNext ? ` — ${CN[oppNext]}` : ''}`);
        $('cjAgain').innerHTML = room && v.phase === 'over' ? LAB.duelAgain(room) : room && !room.oppOnline ? '<p class="muted">상대 연결이 끊겼어요. 다시 들어오면 이어서 해요.</p>' : '';
        $('cjLog').innerHTML = v.log.slice().reverse().map(x => `<span>${x.draw ? '60수 → 무승부, 다시' : x.w != null ? `${x.round}판: ${x.w === 0 ? '내가' : esc(oppName) + '가'} 이겼어요` : `${x.p === 0 ? '나' : esc(oppName)} ${CN[x.card]}${x.kind === 'cap' ? ' · 잡음' : x.kind === 'pass' ? ' · 넘김' : ''}`}</span>`).join('');
      }
      if (roomLink) start(); else LAB.ready(root, start);
      return () => { T.clear(); if (net) net.close(); };
    }
  });
})();
