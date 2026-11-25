// HIT, STAY (데블스 플랜 시즌3 메인 매치) — 한계 숫자(8면체 주사위 5~12)에 가장 가깝게 카드 합을 맞추는 베팅 게임. 2~5인, 칩이 0이 되면 탈락
(function () {
  const DECK = [[7, 1], [6, 2], [5, 3], [4, 4], [3, 5], [2, 6], [1, 7], [-1, 7]].flatMap(([v, n]) => Array(n).fill(v)); // 35장
  const rnd = n => Math.floor(Math.random() * n);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sum = a => a.reduce((x, y) => x + y, 0);

  // ---------- 엔진 ----------
  function newGame(names, chips, aiFlags, lv) {
    return { players: names.map((n, i) => ({ id: i, name: n, ai: aiFlags[i], chips, out: false, cards: [], shown: -1, folded: false, stayed: false, put: 0, rank: 0 })),
      round: 0, first: rnd(names.length), lv, log: [], phase: 'idle', outOrder: [] };
  }
  const alive = S => S.players.filter(p => !p.out);
  const inHand = S => S.players.filter(p => !p.out && !p.folded);
  const baseBet = S => 1 + Math.floor((S.round - 1) / 10);
  function nextSeat(S, i, pred) { const n = S.players.length; for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (pred(S.players[j])) return j; } return -1; }

  function startRound(S) {
    S.round++;
    if (S.round > 1) S.first = nextSeat(S, S.first, p => !p.out);
    else if (S.players[S.first].out) S.first = nextSeat(S, S.first, p => !p.out);
    S.deck = shuffle(DECK.slice()); S.pot = 0; S.base = baseBet(S);
    S.cap = Math.min(...alive(S).map(p => p.chips)); // 이번 라운드 한 사람이 걸 수 있는 최대 칩(기본 베팅 포함)
    for (const p of S.players) { p.cards = []; p.shown = -1; p.folded = p.out; p.stayed = false; p.put = 0; p.hits = 0; }
    for (const p of alive(S)) { const a = Math.min(S.base, p.chips); p.chips -= a; p.put += a; S.pot += a; }
    S.limit = 5 + rnd(8);
    for (let k = 0; k < 3; k++) for (const p of alive(S)) p.cards.push(S.deck.pop());
    S.phase = 'reveal'; S.log.push(`— ${S.round}라운드 · 선 ${S.players[S.first].name} · 기본 베팅 ${S.base} · 한계 숫자 ${S.limit}`);
  }
  function reveal(S, pid, idx) { const p = S.players[pid]; if (p.shown < 0 && idx >= 0 && idx < 3) p.shown = idx; }
  function allRevealed(S) { return alive(S).every(p => p.shown >= 0); }

  // 베팅 단계: S.bet = {high, toAct: [순서], last}
  function startBetting(S, which) {
    S.phase = which; const order = []; let i = S.first;
    for (let k = 0; k < S.players.length; k++) { const p = S.players[(i + k) % S.players.length]; if (!p.out && !p.folded) order.push(p.id); }
    S.bet = { high: Math.max(...inHand(S).map(p => p.put)), queue: order.slice(), order };
  }
  const toCall = (S, p) => Math.max(0, S.bet.high - p.put);
  const maxRaiseTo = (S, p) => Math.min(S.cap, p.put + p.chips); // 걸 수 있는 최대 누적액
  function betAction(S, pid, act, raiseTo) {
    const p = S.players[pid];
    if (S.bet.queue[0] !== pid) return false;
    S.bet.queue.shift();
    if (act === 'fold') { p.folded = true; S.log.push(`${p.name}: 포기`); }
    else if (act === 'raise' && raiseTo > S.bet.high && raiseTo <= maxRaiseTo(S, p)) {
      const add = raiseTo - p.put; p.chips -= add; p.put += add; S.pot += add; S.bet.high = raiseTo;
      S.log.push(`${p.name}: 레이즈 → ${raiseTo}개 (${add}개 냄)`);
      // 나 말고 아직 남은 사람들이 다시 응답해야 함
      const ord = S.bet.order, i = ord.indexOf(pid); S.bet.queue = [];
      for (let k = 1; k < ord.length; k++) { const q = S.players[ord[(i + k) % ord.length]]; if (!q.folded && !q.out) S.bet.queue.push(q.id); }
    } else { // 콜(또는 체크)
      const need = Math.min(toCall(S, p), p.chips); p.chips -= need; p.put += need; S.pot += need;
      S.log.push(`${p.name}: ${need ? `콜 (${need}개)` : '체크'}`);
    }
    S.bet.queue = S.bet.queue.filter(id => !S.players[id].folded);
    return true;
  }
  const bettingDone = S => inHand(S).length <= 1 || S.bet.queue.length === 0;
  const currentBettor = S => S.bet.queue[0];

  // 히트/스테이: 선부터 돌아가며, 스테이한 사람은 끝
  function startHits(S) { S.phase = 'hit'; S.hitTurn = nextSeat(S, (S.first - 1 + S.players.length) % S.players.length, p => !p.out && !p.folded && !p.stayed); }
  function hitAction(S, pid, hit) {
    const p = S.players[pid]; if (S.hitTurn !== pid) return false;
    if (hit && S.deck.length) { const c = S.deck.pop(); p.cards.push(c); p.hits++; S.log.push(`${p.name}: HIT → ${c > 0 ? c : c}`); }
    else { p.stayed = true; S.log.push(`${p.name}: STAY`); }
    S.hitTurn = S.deck.length ? nextSeat(S, pid, q => !q.out && !q.folded && !q.stayed) : -1;
    return true;
  }
  const hitsDone = S => S.hitTurn < 0 || inHand(S).every(p => p.stayed) || !S.deck.length;

  // 승부: 한계 이하에서 가장 가까운 쪽, 같으면 카드 수 많은 쪽. 초과는 최하위
  function scoreOf(S, p) { const s = sum(p.cards); return s > S.limit ? [1, s - S.limit, 0] : [0, S.limit - s, -p.cards.length]; }
  const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  function showdown(S) {
    const live = inHand(S); let winners;
    if (live.length === 1) winners = live;
    else {
      const sc = live.map(p => ({ p, s: scoreOf(S, p) })); sc.sort((a, b) => cmp(a.s, b.s));
      winners = sc.filter(x => cmp(x.s, sc[0].s) === 0).map(x => x.p);
    }
    // 나누고 남은 칩은 선에 가까운 사람부터
    const share = Math.floor(S.pot / winners.length); let rem = S.pot - share * winners.length;
    const ordered = []; for (let k = 0; k < S.players.length; k++) { const q = S.players[(S.first + k) % S.players.length]; if (winners.includes(q)) ordered.push(q); }
    const got = {};
    for (const q of ordered) { q.chips += share + (rem > 0 ? 1 : 0); got[q.id] = share + (rem > 0 ? 1 : 0); rem--; }
    S.lastResult = { winners: winners.map(p => p.id), got, pot: S.pot, single: live.length === 1 };
    S.log.push(live.length === 1 ? `${winners[0].name}: 혼자 남아 ${S.pot}개 획득` : winners.length === 1 ? `승리 ${winners[0].name} (합 ${sum(winners[0].cards)}) · ${S.pot}개 획득` : `무승부 ${winners.map(w => w.name).join('·')} · ${S.pot}개 나눔`);
    S.pot = 0;
    // 탈락
    for (const p of S.players) if (!p.out && p.chips <= 0) { p.out = true; S.outOrder.push(p.id); S.log.push(`${p.name} 탈락`); }
    S.phase = 'result';
  }
  const gameOver = S => alive(S).length <= 1;

  // ---------- AI ----------
  // AI가 아는 것: 자기 카드 전부, 다른 사람의 공개 카드(공개 1장 + 히트 카드)
  function visible(S, viewer) {
    return S.players.map(p => p.id === viewer ? p.cards.slice() : p.cards.filter((c, i) => i === p.shown || i >= 3));
  }
  function unknownPool(S, viewer) {
    const pool = DECK.slice(); const rm = c => { const k = pool.indexOf(c); if (k >= 0) pool.splice(k, 1); };
    visible(S, viewer).forEach(cs => cs.forEach(rm)); return pool;
  }
  // 다른 사람들이 앞으로 대략 이렇게 히트한다고 보고 이길 확률 추정. myExtra: 내가 지금 더 뽑을 장수
  function equity(S, me, myPlan, N) {
    const vis = visible(S, me), pool0 = unknownPool(S, me);
    const live = inHand(S); if (live.length <= 1) return 1;
    let win = 0;
    for (let t = 0; t < N; t++) {
      const pool = shuffle(pool0.slice()); const hands = {};
      for (const p of live) {
        if (p.id === me) continue;
        const hidden = 3 - (p.shown >= 0 ? 1 : 0); const h = vis[p.id].slice();
        for (let k = 0; k < hidden; k++) h.push(pool.pop());
        if (!p.stayed && S.phase !== 'bet2') while (sum(h) <= S.limit - 2 && pool.length && Math.random() < .9) h.push(pool.pop());
        hands[p.id] = h;
      }
      const mine = S.players[me].cards.slice();
      if (myPlan === 'hit1') { mine.push(pool.pop()); while (sum(mine) <= S.limit - 2 && pool.length) mine.push(pool.pop()); } // 한 장 받고, 이후엔 보통 사람처럼 더 받음
      else if (myPlan === 'auto') while (sum(mine) <= S.limit - 2 && pool.length) mine.push(pool.pop());
      const ms = sc(S.limit, mine); let best = true, ties = 1;
      for (const id in hands) { const o = sc(S.limit, hands[id]); const c = cmp(o, ms); if (c < 0) { best = false; break; } if (c === 0) ties++; }
      if (best) win += 1 / ties;
    }
    return win / N;
  }
  const sc = (L, cards) => { const s = sum(cards); return s > L ? [1, s - L, 0] : [0, L - s, -cards.length]; };

  function aiReveal(S, pid) { const p = S.players[pid]; // 중간값 카드를 공개(정보를 적게)
    const idx = [0, 1, 2].sort((a, b) => p.cards[a] - p.cards[b])[S.lv === 0 ? rnd(3) : 1]; reveal(S, pid, idx); }
  // 난이도별 성향: fold(포기 기준), raise(레이즈 기준 배수), rp(레이즈 확률), size(레이즈 크기), noise
  const PROF = [ // 시뮬레이션으로 맞춘 값: 한계에 바짝 붙일수록(카드도 많을수록) 유리
    { fold: .55, raise: 1.7, rp: .35, size: .6, noise: .45, N: 80, simple: 3 },
    { fold: .8, raise: 1.5, rp: .7, size: .8, noise: .2, N: 120, simple: 2 },
    { fold: .8, raise: 1.35, rp: .8, size: 2, noise: .08, N: 220, thr: .35 },
  ];
  function aiBet(S, pid) {
    const p = S.players[pid], P = S.prof || PROF[S.lv], call = Math.min(toCall(S, p), p.chips);
    const e = equity(S, pid, S.phase === 'bet1' ? 'auto' : 'stay', P.N);
    const n = inHand(S).length, fair = 1 / n, v = e + (Math.random() - .5) * P.noise;
    const maxTo = maxRaiseTo(S, p);
    // 포기: 이길 확률 × (판돈+낼 칩) 이 낼 칩보다 작을 때
    if (call > 0 && v * (S.pot + call) < call * P.fold) return betAction(S, pid, 'fold');
    if (v > fair * P.raise && maxTo > S.bet.high && Math.random() < P.rp) {
      const want = Math.max(1, Math.round((v - fair) * (S.pot + 2) * P.size));
      return betAction(S, pid, 'raise', Math.min(maxTo, S.bet.high + want));
    }
    return betAction(S, pid, 'call');
  }
  function aiHit(S, pid) {
    const p = S.players[pid], s = sum(p.cards), L = S.limit;
    const P = S.prof || PROF[S.lv];
    if (P.simple != null) return hitAction(S, pid, s <= L - P.simple || (s <= L - 1 && Math.random() < .3));
    if (s > L) return hitAction(S, pid, s - L <= 1 && unknownPool(S, pid).includes(-1) && Math.random() < .5); // 초과면 -1을 노려볼 수도
    if (P.thr != null) { // 카드 세기: 아직 안 보인 카드 중 받아도 안 넘치는 비율로 판단
      const pool = unknownPool(S, pid), ok = pool.filter(c => s + c <= L).length / Math.max(1, pool.length);
      return hitAction(S, pid, ok >= P.thr);
    }
    const N = P.N;
    const stay = equity(S, pid, 'stay', N), hit = equity(S, pid, 'hit1', N);
    return hitAction(S, pid, hit > stay + (S.lv === 2 ? .01 : .03));
  }

  const ENG = { PROF, DECK, newGame, startRound, reveal, allRevealed, startBetting, betAction, bettingDone, currentBettor, startHits, hitAction, hitsDone, showdown, gameOver, aiReveal, aiBet, aiHit, inHand, alive, toCall, maxRaiseTo, sum };
  if (typeof module !== 'undefined' && module.exports) { module.exports = ENG; return; }
  if (typeof LAB === 'undefined') return;

  // ---------- 화면 ----------
  const { h, esc, seg } = LAB;
  LAB.add({
    id: 'hitstay', name: 'HIT, STAY', show: '데블스플랜',
    rules: `<ul>
      <li>숫자 카드 35장: <b>7×1, 6×2, 5×3, 4×4, 3×5, 2×6, 1×7, -1×7</b>. 각자 칩을 들고 시작해요(설정에서 정해요).</li>
      <li>라운드마다 모두 <b>기본 베팅</b>(1개, 10라운드마다 1개씩 늘어요)을 내고, 8면체 주사위로 <b>한계 숫자(5~12)</b>를 정해요.</li>
      <li>카드 3장씩 받고 그중 <b>1장을 골라 공개</b>해요. 나머지 2장은 나만 봐요.</li>
      <li><b>1차 베팅</b>: 선부터 콜·레이즈·포기. 한 사람이 걸 수 있는 칩은 <b>칩이 가장 적은 사람의 칩 수</b>까지예요.</li>
      <li>선부터 돌아가며 카드를 더 받으면 <b>HIT</b>(공개), 그만 받으면 <b>STAY</b>. 모두 스테이하거나 카드가 떨어지면 <b>2차 베팅</b>.</li>
      <li>카드 합이 <b>한계 숫자 이하에서 가장 가까운</b> 사람이 판돈을 가져가요. 합이 같으면 카드가 많은 쪽, 한계를 넘으면 최하위. 그래도 같으면 나눠 갖고 남는 칩은 선에 가까운 사람이 가져요.</li>
      <li>칩이 0개가 되면 탈락. 마지막 1명이 남을 때까지 해요. 선은 매 라운드 왼쪽(다음 사람)으로 넘어가요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      let pend = { n: 4, chips: 30, lv: 1 }, cfg = { ...pend }, S = null, raiseTo = 0;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="hs-top"><div class="hs-die"><small>한계 숫자</small><b id="hsLimit">?</b></div><div class="hs-pot"><small>판돈</small><b id="hsPot">0</b></div><div class="hs-info"><span id="hsRound"></span><small id="hsBase"></small></div></div>
          <div class="hs-seats" id="hsSeats"></div>
          <p class="g-msg" id="hsMsg"></p>
          <div class="hs-act" id="hsAct"></div>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정 (새 게임에 적용)</h3>
            <div class="opt"><span>인원 (나 + AI)</span><div id="hsN"></div></div>
            <div class="opt"><span>시작 칩</span><div id="hsChips"></div></div>
            <div class="opt"><span>AI 난이도</span><div id="hsLv"></div></div>
            <button type="button" class="primary" id="hsNew">새 게임</button></div>
          <div class="card"><h3>진행 기록</h3><div class="log" id="hsLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('hsN').appendChild(seg([[2, '2인'], [3, '3인'], [4, '4인'], [5, '5인']], 4, v => pend.n = v));
      $('hsChips').appendChild(seg([[10, '10'], [20, '20'], [30, '30'], [50, '50']], 30, v => pend.chips = v));
      $('hsLv').appendChild(seg([[0, '쉬움'], [1, '보통'], [2, '어려움']], 1, v => pend.lv = v));
      $('hsNew').onclick = start;
      const ME = 0;
      function start() {
        T.clear(); cfg = { ...pend };
        const names = ['나', ...['AI 1', 'AI 2', 'AI 3', 'AI 4'].slice(0, cfg.n - 1)];
        S = ENG.newGame(names, cfg.chips, names.map((_, i) => i !== ME), cfg.lv);
        S.log.push(`추첨으로 첫 선: ${S.players[S.first].name}`);
        round();
      }
      function round() {
        ENG.startRound(S);
        for (const p of ENG.alive(S)) if (p.ai) ENG.aiReveal(S, p.id);
        if (!S.players[ME].out) step(); else render();
      }
      function step() { // AI 차례를 하나씩 진행
        render();
        if (S.phase === 'reveal') { if (ENG.allRevealed(S)) { ENG.startBetting(S, 'bet1'); T.set(step, 500); } return; }
        if (S.phase === 'bet1' || S.phase === 'bet2') {
          if (ENG.bettingDone(S)) {
            if (ENG.inHand(S).length <= 1 || S.phase === 'bet2') { ENG.showdown(S); render(); return afterRound(); }
            ENG.startHits(S); T.set(step, 600); return;
          }
          const id = ENG.currentBettor(S);
          if (S.players[id].ai) { T.set(() => { ENG.aiBet(S, id); step(); }, 750); }
          else { raiseTo = Math.min(ENG.maxRaiseTo(S, S.players[ME]), S.bet.high + 1); render(); }
          return;
        }
        if (S.phase === 'hit') {
          if (ENG.hitsDone(S)) { ENG.startBetting(S, 'bet2'); T.set(step, 600); return; }
          if (S.players[S.hitTurn].ai) T.set(() => { ENG.aiHit(S, S.hitTurn); step(); }, 750);
          return;
        }
      }
      function afterRound() {
        const me = S.players[ME];
        if (me.out) { const rank = ENG.alive(S).length + 1; T.set(() => LAB.end('탈락', `칩을 모두 잃어 ${rank}위 (${S.players.length}명 중) · ${S.round}라운드`, start), 1800); return; }
        if (ENG.gameOver(S)) { T.set(() => LAB.end('1위 · 최종 생존', `${S.round}라운드 만에 마지막 1명으로 남았어요 · 칩 ${me.chips}개`, start), 1800); return; }
        T.set(() => { round(); }, 3200);
      }
      // 사람 조작
      function act(a) {
        if (!S) return;
        if (S.phase === 'reveal' && a.startsWith('show')) { ENG.reveal(S, ME, +a.slice(4)); step(); return; }
        if ((S.phase === 'bet1' || S.phase === 'bet2') && ENG.currentBettor(S) === ME) {
          if (a === 'fold') ENG.betAction(S, ME, 'fold'); else if (a === 'raise') ENG.betAction(S, ME, 'raise', raiseTo); else if (a === 'call') ENG.betAction(S, ME, 'call'); else return;
          step(); return;
        }
        if (S.phase === 'hit' && S.hitTurn === ME && (a === 'hit' || a === 'stay')) { ENG.hitAction(S, ME, a === 'hit'); step(); return; }
        if (a === 'rp') { raiseTo = Math.min(ENG.maxRaiseTo(S, S.players[ME]), raiseTo + 1); render(); }
        if (a === 'rm') { raiseTo = Math.max(S.bet.high + 1, raiseTo - 1); render(); }
      }
      wrap.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b && !b.disabled && wrap.contains(b)) act(b.dataset.a); }); // 공개할 카드(자리 안)와 조작 버튼

      const card = (v, cls = '', attrs = '') => `<span class="hsc ${v < 0 ? 'neg' : ''} ${cls}" ${attrs}>${v == null ? '' : v}</span>`;
      function render() {
        const showAll = S.phase === 'result';
        $('hsLimit').textContent = S.limit ?? '?'; $('hsPot').textContent = S.phase === 'result' ? S.lastResult.pot : S.pot;
        $('hsRound').textContent = `${S.round}라운드`; $('hsBase').textContent = `기본 베팅 ${S.base} · 최대 ${S.cap}개 · 남은 카드 ${S.deck.length}장`;
        $('hsSeats').innerHTML = S.players.map(p => {
          const isMe = p.id === ME, sumTxt = isMe || showAll ? `합 ${ENG.sum(p.cards)}` : `보이는 합 ${ENG.sum(p.cards.filter((c, i) => i === p.shown || i >= 3))}`;
          const cards = p.cards.map((c, i) => {
            const open = isMe || showAll || i === p.shown || i >= 3;
            const pick = isMe && S.phase === 'reveal' && p.shown < 0 && i < 3;
            if (pick) return `<button type="button" class="hsc pick ${c < 0 ? 'neg' : ''}" data-a="show${i}">${c}</button>`;
            return open ? card(c, `${isMe && i < 3 && i !== p.shown ? 'secret' : ''} ${i >= 3 ? 'hit' : ''}`) : card(null, 'back');
          }).join('');
          const st = p.out ? '탈락' : p.folded ? '포기' : p.stayed ? 'STAY' : '';
          const turn = !p.out && ((S.phase === 'hit' && S.hitTurn === p.id) || ((S.phase === 'bet1' || S.phase === 'bet2') && S.bet && S.bet.queue[0] === p.id));
          const won = showAll && S.lastResult.winners.includes(p.id);
          const over = (isMe || showAll) && ENG.sum(p.cards) > S.limit && p.cards.length;
          return `<div class="hs-seat ${isMe ? 'me' : ''} ${p.out ? 'out' : ''} ${p.folded && !p.out ? 'fold' : ''} ${turn ? 'turn' : ''} ${won ? 'won' : ''}">
            <div class="hs-name"><b>${esc(p.name)}</b>${S.first === p.id ? '<span class="tag">선</span>' : ''}${st ? `<span class="st">${st}</span>` : ''}</div>
            <div class="hs-chips">칩 <b>${p.chips}</b>${p.put ? ` · 건 칩 ${p.put}` : ''}${won ? ` · <b class="plus">+${S.lastResult.got[p.id]}</b>` : ''}</div>
            <div class="hs-cards">${cards}</div>
            <div class="hs-sum ${over ? 'bust' : ''}">${p.out ? '' : sumTxt}${over ? ' · 초과' : ''}</div></div>`;
        }).join('');
        // 조작판
        const me = S.players[ME]; let a = '', msg = '';
        if (me.out) msg = '탈락했어요';
        else if (S.phase === 'reveal') { msg = me.shown < 0 ? '세 장 중 모두에게 공개할 카드 1장을 누르세요' : '공개 중…'; }
        else if ((S.phase === 'bet1' || S.phase === 'bet2') && !ENG.bettingDone(S) && ENG.currentBettor(S) === ME) {
          const need = Math.min(ENG.toCall(S, me), me.chips), maxTo = ENG.maxRaiseTo(S, me);
          msg = `${S.phase === 'bet1' ? '1차' : '2차'} 베팅 — 내 차례`;
          a = `<button type="button" data-a="fold">포기</button><button type="button" class="primary" data-a="call">${need ? `콜 (${need}개)` : '체크'}</button>` +
            (maxTo > S.bet.high ? `<span class="hs-raise"><button type="button" data-a="rm" ${raiseTo <= S.bet.high + 1 ? 'disabled' : ''}>−</button><button type="button" data-a="raise">레이즈 → 총 ${raiseTo}개</button><button type="button" data-a="rp" ${raiseTo >= maxTo ? 'disabled' : ''}>+</button></span>` : '<span class="muted">더 올릴 수 없어요 (최대 칩)</span>');
        }
        else if (S.phase === 'hit' && S.hitTurn === ME && !ENG.hitsDone(S)) { msg = `카드를 더 받을까요? 내 합 ${ENG.sum(me.cards)} / 한계 ${S.limit}`; a = `<button type="button" class="primary" data-a="hit">HIT (한 장 더)</button><button type="button" data-a="stay">STAY (그만)</button>`; }
        else if (S.phase === 'result') { const r = S.lastResult; msg = r.winners.includes(ME) ? (r.winners.length > 1 ? `무승부 — 판돈을 나눠 ${r.got[ME]}개 받았어요` : `이겼어요! 판돈 ${r.pot}개를 가져왔어요`) : r.single ? `${S.players[r.winners[0]].name}만 남아 판돈을 가져갔어요` : `${r.winners.map(i => S.players[i].name).join('·')} 승리`; }
        else if (me.folded) msg = '이번 라운드는 포기했어요';
        else msg = S.phase === 'hit' ? `${S.players[S.hitTurn]?.name || ''} 고르는 중…` : S.bet ? `${S.players[ENG.currentBettor(S)]?.name || ''} 베팅 중…` : '';
        $('hsMsg').textContent = msg; $('hsAct').innerHTML = a;
        $('hsLog').innerHTML = S.log.slice(-80).reverse().map(x => `<span>${esc(x)}</span>`).join('');
      }
      LAB.ready(root, start);
      return () => T.clear();
    }
  });
})();
