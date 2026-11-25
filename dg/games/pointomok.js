// 포인트 오목 (데블스 플랜 시즌3 유배지 최후 대결) — 선택권자가 연속된 빈 교차점 3개를 고르면, 두 사람이 몰래 포인트를 나눠 걸고, 지점마다 더 많이 건 쪽 돌이 놓임. 정확히 5목을 먼저 만들면 승리
(function () {
  const N = 19, NN = N * N, TIME = 90; // 19×19, 선택·베팅 각 90초
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  const rnd = n => Math.floor(Math.random() * n);
  const rc = i => [Math.floor(i / N), i % N], id = (r, c) => r * N + c, inb = (r, c) => r >= 0 && r < N && c >= 0 && c < N;

  // 한 줄로 붙은 빈 교차점 3개인지 (가로·세로·대각선)
  function validTriple(board, cells) {
    if (!Array.isArray(cells) || cells.length !== 3) return false;
    const t = cells.map(Number); if (t.some(i => !(i >= 0 && i < NN) || board[i] != null) || new Set(t).size !== 3) return false;
    const p = t.map(rc).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const dr = p[1][0] - p[0][0], dc = p[1][1] - p[0][1];
    if (Math.max(Math.abs(dr), Math.abs(dc)) !== 1) return false;
    return p[2][0] - p[1][0] === dr && p[2][1] - p[1][1] === dc;
  }
  function allTriples(board) {
    const out = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) for (const [dr, dc] of DIRS) {
      const a = [r, c], b = [r + dr, c + dc], e = [r + 2 * dr, c + 2 * dc];
      if (!inb(...e) || !inb(...b)) continue;
      const t = [id(...a), id(...b), id(...e)]; if (t.every(i => board[i] == null)) out.push(t);
    }
    return out;
  }
  // 정확히 5개짜리 줄(6개 이상은 인정 안 함) 개수
  function countFives(board, color) {
    let n = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) for (const [dr, dc] of DIRS) {
      if (board[id(r, c)] !== color) continue;
      const pr = r - dr, pc = c - dc; if (inb(pr, pc) && board[id(pr, pc)] === color) continue; // 줄의 시작에서만 셈
      let k = 0, rr = r, cc = c; while (inb(rr, cc) && board[id(rr, cc)] === color) { k++; rr += dr; cc += dc; }
      if (k === 5) n++;
    }
    return n;
  }

  // ---------- AI 평가 ----------
  // 빈 칸 i에 color 돌을 놓았을 때 그 칸의 공격 가치
  function cellValue(board, i, color) {
    const [r, c] = rc(i); let v = 0;
    for (const [dr, dc] of DIRS) {
      let a = 0, b = 0, rr = r + dr, cc = c + dc;
      while (inb(rr, cc) && board[id(rr, cc)] === color) { a++; rr += dr; cc += dc; }
      const openA = inb(rr, cc) && board[id(rr, cc)] == null;
      rr = r - dr; cc = c - dc;
      while (inb(rr, cc) && board[id(rr, cc)] === color) { b++; rr -= dr; cc -= dc; }
      const openB = inb(rr, cc) && board[id(rr, cc)] == null;
      const len = a + b + 1, open = (openA ? 1 : 0) + (openB ? 1 : 0);
      if (len === 5) v += 100000; else if (len > 5) v += 0; // 6목 이상은 승리가 아님
      else if (len === 4) v += open === 2 ? 6000 : open === 1 ? 1500 : 0;
      else if (len === 3) v += open === 2 ? 700 : open === 1 ? 120 : 0;
      else if (len === 2) v += open === 2 ? 70 : open === 1 ? 15 : 0;
      else v += open * 2;
    }
    return v;
  }
  // 나(me 색)에게 이 칸이 얼마나 중요한가: 내가 차지하면 공격, 상대가 차지하면 위협
  const importance = (board, i, me) => cellValue(board, i, me) + cellValue(board, i, 1 - me) * .9;

  function aiChoose(board, me, lv) {
    const T = allTriples(board); if (!T.length) return null;
    if (!board.some(x => x != null)) { const m = Math.floor(N / 2); const d = DIRS[rnd(4)]; return [id(m - d[0], m - d[1]), id(m, m), id(m + d[0], m + d[1])]; }
    // 돌 근처만 후보로
    const near = i => { const [r, c] = rc(i); for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) { const rr = r + dr, cc = c + dc; if (inb(rr, cc) && board[id(rr, cc)] != null) return true; } return false; };
    const cand = T.filter(t => t.some(near));
    const pool = cand.length ? cand : T;
    if (lv === 0 && Math.random() < .3) return pool[rnd(pool.length)];
    let best = pool[0], bv = -1e18;
    for (const t of pool) {
      // 선택권자는 동점이면 지므로, 내게 크게 이롭고 상대에게 덜 급한 지점을 고름
      let v = 0; for (const i of t) v += cellValue(board, i, me) - cellValue(board, i, 1 - me) * (lv === 2 ? .45 : .3);
      v += Math.random() * (lv === 2 ? 10 : 60);
      if (v > bv) { bv = v; best = t; }
    }
    return best;
  }
  // 베팅: 지점마다 최소 1, 합은 가진 포인트 이하. oppMax: 상대가 이번에 걸 수 있는 최대치(추정)
  function aiBet(board, triple, me, pts, lv, oppMax) {
    const v = triple.map(i => importance(board, i, me));
    const mine = triple.map(i => cellValue(board, i, me)), theirs = triple.map(i => cellValue(board, i, 1 - me));
    const b = [1, 1, 1]; let left = pts - 3;
    if (lv === 0 && Math.random() < .4) { while (left > 0 && Math.random() < .6) { b[rnd(3)]++; left--; } return b; }
    // 꼭 가져와야 하는 칸(내 5목 완성 / 상대 5목 막기)은 상대가 낼 수 있는 최대보다 1 많이
    const critical = [0, 1, 2].filter(k => mine[k] >= 100000 || theirs[k] >= 100000).sort((x, y) => v[y] - v[x]);
    for (const k of critical) { const want = Math.min(left + 1, (lv === 2 ? oppMax : Math.ceil(oppMax * .8)) + 1) - 1; const add = Math.max(0, Math.min(left, want)); b[k] += add; left -= add; }
    const top = Math.max(...v);
    // 별것 없는 판이면 아껴서 다음 라운드로 넘김(남은 포인트 절반 이월)
    const frac = top >= 6000 ? 1 : top >= 1500 ? .8 : top >= 600 ? .55 : top >= 100 ? .3 : .08;
    let spend = Math.round(left * frac);
    const w = v.map(x => Math.pow(Math.max(1, x), lv === 2 ? 1.3 : 1)); const tw = w.reduce((a, x) => a + x, 0);
    const add = w.map(x => Math.floor(spend * x / tw)); add.forEach((x, k) => { b[k] += x; spend -= x; left -= x; });
    if (spend > 0) { const k = v.indexOf(top); b[k] += spend; left -= spend; }
    return b;
  }

  // 어려움: 상대가 '보통 AI처럼' 건다고 보고 여러 경우를 뽑아, 그에 맞서 기대 이득이 가장 큰 배분을 찾음
  const PV = 100; // 다음 라운드로 넘기는 포인트 1의 가치(평가 점수 단위)
  function oppSamples(board, triple, me, oppMax, myPts) {
    const out = [];
    for (let k = 0; k < 10; k++) { const p = Math.max(3, oppMax - rnd(Math.min(8, oppMax - 2))); out.push(aiBet(board, triple, 1 - me, p, 1, myPts)); }
    return out;
  }
  function bestReply(board, triple, me, pts, oppMax, iChoose) {
    const mine = triple.map(i => cellValue(board, i, me)), theirs = triple.map(i => cellValue(board, i, 1 - me));
    const S = oppSamples(board, triple, me, oppMax, pts);
    let best = [1, 1, 1], bv = -1e18;
    for (let a = 1; a <= pts - 2; a++) for (let b = 1; a + b <= pts - 1; b++) for (let c = 1; a + b + c <= pts; c++) {
      const x = [a, b, c]; let sc = 0;
      for (const o of S) for (let k = 0; k < 3; k++) sc += (x[k] > o[k] || (x[k] === o[k] && !iChoose)) ? mine[k] : -theirs[k];
      sc = sc / S.length + PV * Math.floor((pts - a - b - c) / 2);
      if (sc > bv) { bv = sc; best = x; }
    }
    return { b: best, v: bv };
  }
  function hardChoose(board, me, pts, oppMax) {
    const T = allTriples(board);
    const near = i => { const [r, c] = rc(i); for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) { const rr = r + dr, cc = c + dc; if (inb(rr, cc) && board[id(rr, cc)] != null) return true; } return false; };
    const pool = T.filter(t => t.some(near)).map(t => ({ t, h: t.reduce((a, i) => a + cellValue(board, i, me) + cellValue(board, i, 1 - me) * .5, 0) })).sort((a, b) => b.h - a.h).slice(0, 14);
    if (!pool.length) return aiChoose(board, me, 1);
    let best = pool[0].t, bv = -1e18;
    for (const { t } of pool) { const r = bestReply(board, t, me, Math.min(pts, 24), oppMax, true); if (r.v > bv) { bv = r.v; best = t; } }
    return best;
  }

  // ---------- 1:1 대결 규칙 (AI 대전·온라인 대전 공용, 서버도 불러 씀) ----------
  const fail = m => { throw Object.assign(new Error(m), { duel: true }); };
  const DUEL = {
    TIME,
    init(prev) {
      const starter = prev ? 1 - prev.starter : rnd(2);
      const s = { mid: Math.random().toString(36).slice(2, 9), board: Array(NN).fill(null), starter, color: [starter === 0 ? 0 : 1, starter === 0 ? 1 : 0], // 0 흑 1 백 (첫 선택권자가 흑)
        round: 0, pts: [10, 10], log: [], winner: -1, fives: [0, 0] };
      DUEL.newRound(s); return s;
    },
    newRound(s) {
      s.round++; s.chooser = s.round % 2 === 1 ? s.starter : 1 - s.starter;
      s.phase = 'choose'; s.triple = null; s.bets = [null, null]; s.deadline = Date.now() + TIME * 1000;
      if (!allTriples(s.board).length) { s.phase = 'over'; s.winner = 2; s.endWhy = '더 고를 지점이 없어 무승부'; }
    },
    act(s, seat, a) {
      if (a.type === 'choose') {
        if (s.phase !== 'choose' || seat !== s.chooser) fail('지금은 지점을 고를 차례가 아니에요.');
        const t = (a.cells || []).map(Number); if (!validTriple(s.board, t)) fail('가로·세로·대각선 한 줄로 붙은 빈 교차점 3개를 골라 주세요.');
        s.triple = t; s.phase = 'bet'; s.deadline = Date.now() + TIME * 1000; return;
      }
      if (a.type === 'bet') {
        if (s.phase !== 'bet' || s.bets[seat]) fail('지금은 베팅할 수 없어요.');
        const b = (a.b || []).map(Number);
        if (b.length !== 3 || b.some(x => !Number.isInteger(x) || x < 1)) fail('지점마다 1포인트 이상, 정수로 걸어 주세요.');
        if (b[0] + b[1] + b[2] > s.pts[seat]) fail(`가진 포인트(${s.pts[seat]})보다 많이 걸 수 없어요.`);
        s.bets[seat] = b;
        if (s.bets[0] && s.bets[1]) DUEL.resolve(s);
        return;
      }
      fail('알 수 없는 행동이에요.');
    },
    resolve(s) {
      const own = s.triple.map((i, k) => { const x = s.bets[0][k], y = s.bets[1][k]; return x > y ? 0 : y > x ? 1 : 1 - s.chooser; }); // 같으면 선택권 없는 사람
      s.triple.forEach((i, k) => { s.board[i] = s.color[own[k]]; });
      s.last = { cells: s.triple.slice(), own };
      s.log.push({ round: s.round, chooser: s.chooser, own }); (s.hist = s.hist || []).push({ chooser: s.chooser, own, bets: [s.bets[0].slice(), s.bets[1].slice()] });
      for (const p of [0, 1]) { const used = s.bets[p][0] + s.bets[p][1] + s.bets[p][2]; s.pts[p] = 10 + Math.floor((s.pts[p] - used) / 2); }
      const f = [countFives(s.board, s.color[0]), countFives(s.board, s.color[1])]; s.fives = f;
      if (f[0] || f[1]) { s.phase = 'over'; s.winner = f[0] > f[1] ? 0 : f[1] > f[0] ? 1 : 1 - s.chooser; s.endWhy = f[0] && f[1] ? (f[0] === f[1] ? '같은 라운드에 같은 수의 오목 → 선택권 없는 쪽 승리' : '같은 라운드에 오목을 더 많이 완성') : '오목 완성'; return; }
      DUEL.newRound(s);
    },
    // 시간이 지나면: 선택은 무작위, 베팅은 1·1·1
    tick(s, now = Date.now()) {
      if (s.phase === 'over' || !s.deadline || now < s.deadline) return false;
      if (s.phase === 'choose') { const T = allTriples(s.board); DUEL.act(s, s.chooser, { type: 'choose', cells: T[rnd(T.length)] }); s.log.push({ timeout: 'choose', p: s.chooser }); return true; }
      if (s.phase === 'bet') { const miss = [0, 1].filter(p => !s.bets[p]); for (const p of miss) s.log.push({ timeout: 'bet', p }); for (const p of miss) DUEL.act(s, p, { type: 'bet', b: [1, 1, 1] }); return true; }
      return false;
    },
    view(s, seat) {
      const o = 1 - seat, rel = x => x == null || x < 0 ? -1 : x === 2 ? 2 : x === seat ? 0 : 1;
      return { mid: s.mid, starter: rel(s.starter), phase: s.phase, round: s.round, board: s.board, myColor: s.color[seat], chooser: rel(s.chooser), triple: s.triple,
        myPts: s.pts[seat], myBet: s.bets[seat], oppBet: !!s.bets[o], left: s.deadline ? Math.max(0, s.deadline - Date.now()) : 0,
        hist: (s.hist || []).map(x => ({ chooser: rel(x.chooser), own: x.own.map(rel), bet: x.bets[seat] })), // 내 베팅만
        last: s.last ? { cells: s.last.cells, own: s.last.own.map(rel) } : null, winner: rel(s.winner), fives: [s.fives[seat], s.fives[o]], endWhy: s.endWhy || '',
        log: s.log.slice(-30).map(x => ({ ...x, chooser: rel(x.chooser), own: x.own ? x.own.map(rel) : undefined, p: x.p != null ? rel(x.p) : undefined })) };
    },
    // 상대가 이번 라운드에 가질 수 있는 최대 포인트(자기 화면만으로 추정). 어려움은 상대가 이긴 지점에서 최소 얼마를 썼는지까지 따짐
    oppMax(v, lv) {
      let om = 10;
      for (const x of v.hist || []) {
        let spent = 3;
        if (lv === 2) { spent = 0; x.own.forEach((o, k) => { spent += o === 1 ? (x.chooser === 0 ? x.bet[k] : x.bet[k] + 1) : 1; }); }
        om = 10 + Math.floor(Math.max(0, om - spent) / 2);
      }
      return om;
    },
    // AI 행동 (자기 화면만 보고). lv 0 쉬움 1 보통 2 어려움
    ai(v, lv) {
      const om = DUEL.oppMax(v, lv);
      if (v.phase === 'choose' && v.chooser === 0) return { type: 'choose', cells: lv === 2 && v.board.some(x => x != null) ? hardChoose(v.board, v.myColor, v.myPts, om) : aiChoose(v.board, v.myColor, lv) };
      if (v.phase === 'bet' && !v.myBet && v.triple) return { type: 'bet', b: lv === 2 ? bestReply(v.board, v.triple, v.myColor, v.myPts, om, v.chooser === 0).b : aiBet(v.board, v.triple, v.myColor, v.myPts, lv, om) };
      return null;
    },
  };

  const ENG = { N, validTriple, allTriples, countFives, cellValue, aiChoose, aiBet, DUEL };
  if (typeof module !== 'undefined' && module.exports) { module.exports = ENG; return; }
  if (typeof LAB === 'undefined') return;

  // ---------- 화면 ----------
  const { h, esc, seg } = LAB;
  const STAR = [3, 9, 15];
  LAB.add({
    id: 'pointomok', name: '포인트 오목', show: '데블스플랜',
    rules: `<ul>
      <li>19×19 바둑판. 라운드마다 <b>선택 → 베팅 → 착수</b> 순서로 진행해요. 선택권은 두 사람이 번갈아 가져요(첫 선택권자는 흑).</li>
      <li><b>선택</b>: 선택권자가 가로·세로·대각선 한 줄로 붙은 <b>빈 교차점 3개</b>를 골라요.</li>
      <li><b>베팅</b>: 매 라운드 각자 <b>10포인트</b>를 받아 세 지점에 몰래 나눠 걸어요. 지점마다 <b>최소 1</b>, 정수만. 쓰고 남은 포인트는 <b>절반만(소수점 버림)</b> 다음 라운드로 넘어가요.</li>
      <li><b>착수</b>: 지점마다 <b>더 많이 건 사람의 돌</b>이 놓여요. 같으면 그 라운드 <b>선택권이 없는 사람</b>의 돌이에요. 건 포인트와 남은 포인트는 상대에게 공개되지 않아요.</li>
      <li><b>정확히 5개</b>를 이으면 승리(6목 이상은 인정 안 해요, 33 같은 금수는 없어요). 같은 라운드에 둘 다 완성하면 오목을 더 많이 만든 쪽, 그것도 같으면 선택권이 없는 쪽이 이겨요.</li>
      <li>선택·베팅은 각각 <b>${TIME}초</b>. 시간이 지나면 선택은 무작위, 베팅은 1·1·1로 처리해요.</li>
      <li>상대는 <b>AI</b> 또는 <b>사람</b>(각자 자기 기기로 같은 방에 들어와 1:1)이에요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      const roomLink = LAB.roomParam();
      let shownMid = null, pend = { lv: 1, opp: roomLink ? 'net' : 'ai' }, cfg = { ...pend }, st = null, net = null, busy = false, lastArgs = null;
      let pickA = null, triple = null, bet = [1, 1, 1], betRound = 0, recvAt = 0;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dn-lobby" id="poLobby" hidden></div>
          <div id="poGame">
          <div class="po-top"><div class="po-p me"><span class="po-st" id="poMyStone"></span><b id="poMyN">나</b><span class="po-pt">POINT <b id="poMyPt">10</b></span></div>
            <div class="po-mid"><div class="po-ph" id="poPh"></div><small id="poRound"></small><b class="po-time" id="poTime"></b></div>
            <div class="po-p opp"><span class="po-st" id="poOpStone"></span><b id="poOpN">상대</b><span class="po-pt">POINT <b>?</b></span></div></div>
          <div class="po-wrap"><svg class="po-board" id="poB" viewBox="0 0 ${N * 20} ${N * 20}"></svg></div>
          <p class="g-msg" id="poMsg"></p>
          <div class="po-bet" id="poBet"></div>
          <div class="row" id="poBtns"></div>
          <div id="poAgain"></div>
          </div>
        </div>
        <aside class="g-side">
          <div class="card"><h3>진행 기록</h3><div class="log" id="poLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      // 시작 화면·대기실은 모든 대결 게임 공통 (무거운13·슬리더링크와 같은 흐름)
      const front = LAB.duelFront({ el: $('poLobby'), gameEl: $('poGame'), soloOpts: [{ key: 'lv', label: 'AI 실력', opts: [[0, '쉬움'], [1, '보통'], [2, '어려움']], def: 1 }], roomOpts: [],
        onStart: (mode, c) => { Object.assign(pend, c, { opp: mode }); start(); }, onLeave: () => { T.clear(); if (net) { net.close(); net = null; } } });
      function start() {
        T.clear(); aiPending = false; cfg = { ...pend }; pickA = null; triple = null; bet = [1, 1, 1]; betRound = 0; lastArgs = null;
        if (net) { net.close(); net = null; }
        if (cfg.opp === 'net') {
          $('poGame').hidden = true;
          net = LAB.duel('pointomok', { front, el: $('poLobby'), onView: v => { if (!v.st) { $('poGame').hidden = true; return; } net.hideLobby(); $('poGame').hidden = false; recvAt = Date.now(); show(v.st, v.opp || '상대', v); }, onError: m => { $('poMsg').textContent = m; } });
          net.start(); T.every(() => lastArgs && paintTime(), 500); return;
        }
        $('poLobby').hidden = true; $('poGame').hidden = false;
        st = DUEL.init(null); local(); aiStep();
        T.every(() => { if (st && DUEL.tick(st)) { local(); aiStep(); afterLocal(); } else if (lastArgs) paintTime(); }, 500);
      }
      const local = () => { recvAt = Date.now(); show(DUEL.view(st, 0), 'AI', null); };
      let aiPending = false;
      function aiStep() {
        if (!st || aiPending || !((st.phase === 'choose' && st.chooser === 1) || (st.phase === 'bet' && !st.bets[1]))) return;
        aiPending = true; const ph = st.phase, me = st;
        T.set(() => { aiPending = false; if (st !== me) return; const a = DUEL.ai(DUEL.view(st, 1), cfg.lv); if (a) { try { DUEL.act(st, 1, a); } catch (e) { console.error(e); } } local(); aiStep(); afterLocal(); }, ph === 'choose' ? 1100 : 900);
      }
      function afterLocal() { if (st.phase === 'over' && !st.ended) { st.ended = true; const w = st.winner; T.set(() => LAB.end(w === 0 ? '승리' : w === 1 ? '패배' : '무승부', `${st.endWhy} · ${st.round}라운드`, start), 1600); } }
      async function send(a) {
        if (busy) return '';
        if (net) { busy = true; const e = await net.act(a); busy = false; return e; }
        try { DUEL.act(st, 0, a); } catch (e) { $('poMsg').textContent = e.message; return e.message; }
        local(); aiStep(); afterLocal(); return '';
      }
      // 판 누르기: 첫 칸 → 같은 줄로 두 칸 떨어진 끝 칸
      const ends = (board, a) => { const [r, c] = rc(a), out = []; for (const [dr, dc] of [...DIRS, ...DIRS.map(([x, y]) => [-x, -y])]) { const m = [r + dr, c + dc], e = [r + 2 * dr, c + 2 * dc]; if (inb(...e) && board[id(...m)] == null && board[id(...e)] == null) out.push({ end: id(...e), mid: id(...m) }); } return out; };
      $('poB').addEventListener('click', e => {
        const v = lastArgs && lastArgs[0]; if (!v || v.phase !== 'choose' || v.chooser !== 0) return;
        const pt = e.target.closest('[data-i]'); if (!pt) return; const i = +pt.dataset.i; if (v.board[i] != null) return;
        if (pickA != null) { const m = ends(v.board, pickA).find(x => x.end === i); if (m) { triple = [pickA, m.mid, i]; pickA = null; show(...lastArgs); return; } }
        pickA = i; triple = null; show(...lastArgs);
      });
      wrap.addEventListener('click', async e => {
        const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
        const v = lastArgs && lastArgs[0]; if (!v) return;
        const a = b.dataset.a;
        if (a === 'pick') { if (triple) { const t = triple; triple = null; const err = await send({ type: 'choose', cells: t }); if (err) triple = t; } }
        else if (a === 'cancel') { triple = null; pickA = null; show(...lastArgs); }
        else if (a.startsWith('p') || a.startsWith('m')) { const k = +a.slice(1), tot = bet[0] + bet[1] + bet[2]; if (a[0] === 'p' && tot < v.myPts) bet[k]++; if (a[0] === 'm' && bet[k] > 1) bet[k]--; show(...lastArgs); }
        else if (a === 'bet') { const err = await send({ type: 'bet', b: bet.slice() }); if (!err) bet = [1, 1, 1]; }
        else if (a === 'again') send({ type: 'again' });
      });
      function paintTime() { const v = lastArgs[0]; if (v.phase === 'over') { $('poTime').textContent = ''; return; } const s = Math.max(0, Math.ceil((v.left - (Date.now() - recvAt)) / 1000)); $('poTime').textContent = s + '초'; $('poTime').classList.toggle('warn', s <= 10); }
      const PH = { choose: ['선택', 'c'], bet: ['베팅', 'b'], over: ['결과', 'o'] };
      function show(v, oppName, room) {
        lastArgs = [v, oppName, room];
        if (v.mid && v.mid !== shownMid) { shownMid = v.mid; LAB.coin(['나', oppName], v.starter, { title: '첫 선택권 정하기', suffix: '먼저 골라요 (흑)' }); }
        if (v.round !== betRound) { betRound = v.round; bet = [1, 1, 1]; triple = null; pickA = null; }
        const me = v.myColor, op = 1 - me;
        $('poMyStone').className = 'po-st c' + me; $('poOpStone').className = 'po-st c' + op;
        $('poOpN').textContent = oppName; $('poMyPt').textContent = v.myPts;
        const ph = PH[v.phase]; $('poPh').textContent = ph[0]; $('poPh').className = 'po-ph ' + ph[1];
        $('poRound').textContent = `${v.round}라운드 · 선택권 ${v.chooser === 0 ? '나' : oppName}`;
        paintTime();
        // 판
        const S = 20, H = S / 2;
        let g = `<rect x="0" y="0" width="${N * S}" height="${N * S}" rx="6" class="po-wood"/>`;
        for (let k = 0; k < N; k++) g += `<line x1="${H}" y1="${H + k * S}" x2="${H + (N - 1) * S}" y2="${H + k * S}" class="po-ln"/><line x1="${H + k * S}" y1="${H}" x2="${H + k * S}" y2="${H + (N - 1) * S}" class="po-ln"/>`;
        for (const r of STAR) for (const c of STAR) g += `<circle cx="${H + c * S}" cy="${H + r * S}" r="2.2" class="po-star"/>`;
        const lastSet = new Map(); if (v.last) v.last.cells.forEach((i, k) => lastSet.set(i, v.last.own[k]));
        const choosing = v.phase === 'choose' && v.chooser === 0;
        const endSet = choosing && pickA != null ? new Set(ends(v.board, pickA).map(x => x.end)) : new Set();
        const tri = v.phase === 'over' ? null : v.triple || triple; // 끝난 뒤엔 마지막 착수 결과(돌)를 보여 줌
        for (let i = 0; i < NN; i++) { const [r, c] = rc(i), x = H + c * S, y = H + r * S, s = v.board[i];
          if (s != null) g += `<circle cx="${x}" cy="${y}" r="8.6" class="po-s c${s} ${lastSet.has(i) ? 'last' : ''}"/>`;
          else if (choosing) g += `<circle cx="${x}" cy="${y}" r="9.5" class="po-hit ${pickA === i ? 'a' : ''} ${endSet.has(i) ? 'end' : ''}" data-i="${i}"/>`;
        }
        if (tri) tri.forEach((i, k) => { const [r, c] = rc(i); g += `<circle cx="${H + c * S}" cy="${H + r * S}" r="8.2" class="po-pick"/><text x="${H + c * S}" y="${H + r * S + 3.6}" class="po-pn">${k + 1}</text>`; });
        $('poB').innerHTML = g;
        // 베팅판
        let betHtml = '', btn = '', msg = '';
        const betting = v.phase === 'bet' && !v.myBet;
        if (betting) {
          const tot = bet[0] + bet[1] + bet[2];
          betHtml = `<div class="po-bets">${[0, 1, 2].map(k => `<div class="po-b"><span class="po-n">${k + 1}</span><div class="po-ctl"><button type="button" data-a="m${k}" aria-label="${k + 1}번 지점 1 빼기" ${bet[k] <= 1 ? 'disabled' : ''}>−</button><b>${bet[k]}</b><button type="button" data-a="p${k}" aria-label="${k + 1}번 지점 1 더하기" ${tot >= v.myPts ? 'disabled' : ''}>+</button></div></div>`).join('')}</div>
            <p class="po-left">건 포인트 ${tot} / 가진 포인트 ${v.myPts} · 남는 ${v.myPts - tot}의 절반(${Math.floor((v.myPts - tot) / 2)})이 다음 라운드로 넘어가요</p>`;
          btn = `<button type="button" class="primary" data-a="bet">베팅 확정</button>`;
          msg = `지점마다 포인트를 나눠 거세요 (지점당 1 이상). 같으면 ${v.chooser === 0 ? oppName : '내'} 돌이에요${v.oppBet ? ` · ${oppName}는 이미 걸었어요` : ''}`;
        } else if (v.phase === 'bet') { betHtml = `<p class="po-left">내 베팅: ${v.myBet.join(' · ')}</p>`; msg = `${oppName}의 베팅을 기다리는 중…`; }
        else if (choosing) { msg = triple ? '이 세 지점으로 할까요?' : pickA != null ? '같은 줄로 두 칸 떨어진 끝 점(초록)을 누르세요' : '연속된 빈 교차점 3개를 고르세요: 한쪽 끝 점을 누르고 반대쪽 끝 점을 누르면 돼요'; if (triple) btn = '<button type="button" data-a="cancel">다시 고르기</button><button type="button" class="primary" data-a="pick">이 지점으로 선택</button>'; }
        else if (v.phase === 'choose') msg = `${oppName}가 세 지점을 고르는 중…`;
        else if (v.phase === 'over') msg = (v.winner === 0 ? '승리! ' : v.winner === 1 ? '패배 — ' : '무승부 — ') + v.endWhy + (v.last ? ` · 마지막 라운드: ${v.last.own.map(o => o === 0 ? '나' : oppName).join(' · ')} 돌` : '');
        if (v.last && v.phase !== 'over' && !betting && !choosing) msg = `지난 라운드: ${v.last.own.map(o => o === 0 ? '나' : oppName).join(' · ')} 돌이 놓였어요 · ` + msg;
        $('poBet').innerHTML = betHtml; $('poBtns').innerHTML = btn; $('poMsg').textContent = msg;
        $('poAgain').innerHTML = room && v.phase === 'over' ? LAB.duelAgain(room) : room && !room.oppOnline ? '<p class="muted">상대 연결이 끊겼어요. 다시 들어오면 이어서 해요.</p>' : '';
        $('poLog').innerHTML = v.log.slice().reverse().map(x => `<span>${x.timeout ? `${x.p === 0 ? '나' : esc(oppName)}: 시간 초과 (${x.timeout === 'choose' ? '무작위 선택' : '1·1·1 베팅'})` : `${x.round}라운드 (선택 ${x.chooser === 0 ? '나' : esc(oppName)}): ${x.own.map(o => o === 0 ? '나' : esc(oppName)).join(' · ')}`}</span>`).join('');
      }
      if (roomLink) { pend.opp = 'net'; start(); } else front.menu();
      return () => { T.clear(); if (net) net.close(); };
    }
  });
})();
