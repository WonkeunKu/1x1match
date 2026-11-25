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

  // ---------- 여럿이 하는 판 (AI 대전·온라인 공용, 서버도 이 코드를 불러 씀) ----------
  // 시간이 흐르며 저절로 진행(AI 행동·단계 넘김·시간 초과)하는 부분은 tick(s, now)이 맡음
  const TURN = 60; // 사람 한 번 행동 제한(초). 넘기면: 공개는 무작위, 베팅은 체크(낼 칩이 있으면 포기), 히트는 STAY
  const fail = m => { throw Object.assign(new Error(m), { duel: true }); };
  const MULTI = {
    TURN,
    seats: o => Math.max(2, Math.min(5, Number(o && o.n) || 4)),
    init(prev, o, seats) { // seats: [{name, bot}]
      const chips = [10, 20, 30, 50].includes(Number(o && o.chips)) ? Number(o.chips) : 30, lv = [0, 1, 2].includes(Number(o && o.lv)) ? Number(o.lv) : 1;
      const S = newGame(seats.map(x => x.name), chips, seats.map(x => !!x.bot), lv);
      S.mid = Math.random().toString(36).slice(2, 9); S.noTimeout = !!(o && o.noTimeout); S.winner = -1;
      S.log.push(`추첨으로 첫 선: ${S.players[S.first].name}`);
      MULTI.newRound(S, Date.now() + 3000); // 선 추첨 연출이 끝날 시간
      return S;
    },
    newRound(S, at) {
      startRound(S); for (const p of alive(S)) if (p.ai) aiReveal(S, p.id);
      S.at = at; S.waitKey = null;
    },
    actor(S) { // 지금 행동해야 하는 사람(사람만, 공개 단계는 여럿)
      if (S.phase === 'reveal') return alive(S).filter(p => p.shown < 0).map(p => p.id);
      if ((S.phase === 'bet1' || S.phase === 'bet2') && !bettingDone(S)) return [currentBettor(S)];
      if (S.phase === 'hit' && !hitsDone(S)) return [S.hitTurn];
      return [];
    },
    act(S, seat, a, now = Date.now()) {
      const p = S.players[seat]; if (!p || p.out) fail('탈락해서 행동할 수 없어요.');
      if (a.type === 'reveal') { if (S.phase !== 'reveal' || p.shown >= 0) fail('지금은 공개할 수 없어요.'); const i = Number(a.i); if (!(i >= 0 && i < 3)) fail('카드를 골라 주세요.'); reveal(S, seat, i); }
      else if (a.type === 'bet') {
        if (!(S.phase === 'bet1' || S.phase === 'bet2') || bettingDone(S) || currentBettor(S) !== seat) fail('지금은 내 베팅 차례가 아니에요.');
        if (a.act === 'raise') { const to = Number(a.to); if (!Number.isInteger(to) || to <= S.bet.high || to > maxRaiseTo(S, p)) fail('올릴 수 있는 칩 수가 아니에요.'); betAction(S, seat, 'raise', to); }
        else betAction(S, seat, a.act === 'fold' ? 'fold' : 'call');
      }
      else if (a.type === 'hit') { if (S.phase !== 'hit' || hitsDone(S) || S.hitTurn !== seat) fail('지금은 내 차례가 아니에요.'); hitAction(S, seat, !!a.hit); }
      else fail('알 수 없는 행동이에요.');
      S.at = Math.max(S.at || 0, now + 250);
    },
    tick(S, now = Date.now()) {
      if (S.phase === 'over' || (S.at && now < S.at)) return false;
      const who = MULTI.actor(S), key = S.phase + ':' + S.round + ':' + who.join(',') + ':' + (S.bet ? S.bet.queue.length : '') + ':' + S.deck.length;
      if (key !== S.waitKey) { S.waitKey = key; S.deadline = S.noTimeout ? 0 : now + TURN * 1000; }
      const timeUp = S.deadline && now >= S.deadline;
      if (S.phase === 'reveal') {
        if (allRevealed(S)) { startBetting(S, 'bet1'); S.at = now + 600; return true; }
        if (timeUp) { for (const id of who) reveal(S, id, rnd(3)); S.log.push('시간 초과 → 무작위로 공개'); return true; }
        return false;
      }
      if (S.phase === 'bet1' || S.phase === 'bet2') {
        if (bettingDone(S)) {
          if (inHand(S).length <= 1 || S.phase === 'bet2') { showdown(S); S.at = now + 4500; return true; }
          startHits(S); S.at = now + 600; return true;
        }
        const id = currentBettor(S), p = S.players[id];
        if (p.ai) { aiBet(S, id); S.at = now + 800; return true; }
        if (timeUp) { S.log.push(`${p.name}: 시간 초과`); betAction(S, id, toCall(S, p) > 0 ? 'fold' : 'call'); return true; }
        return false;
      }
      if (S.phase === 'hit') {
        if (hitsDone(S)) { startBetting(S, 'bet2'); S.at = now + 600; return true; }
        const p = S.players[S.hitTurn];
        if (p.ai) { aiHit(S, p.id); S.at = now + 800; return true; }
        if (timeUp) { S.log.push(`${p.name}: 시간 초과`); hitAction(S, p.id, false); return true; }
        return false;
      }
      if (S.phase === 'result') {
        if (gameOver(S)) { const w = alive(S)[0]; S.phase = 'over'; S.winner = w ? w.id : -1; S.log.push(w ? `최종 생존: ${w.name}` : '게임 끝'); return true; }
        MULTI.newRound(S, now + 400); return true;
      }
      return false;
    },
    view(S, seat) {
      const showAll = S.phase === 'result' || S.phase === 'over', me = S.players[seat];
      const bet = (S.phase === 'bet1' || S.phase === 'bet2') && S.bet && !bettingDone(S);
      return { mid: S.mid, me: seat, phase: S.phase, round: S.round, limit: S.limit, pot: S.phase === 'result' ? S.lastResult.pot : S.pot, base: S.base, cap: S.cap, deckLeft: S.deck ? S.deck.length : 0, first: S.first,
        players: S.players.map(p => { const own = p.id === seat; // 공개 단계에서는 모두가 고를 때까지 다른 사람이 고른 카드를 숨김 (다 고르면 동시에 공개)
          const hideShown = S.phase === 'reveal' && !own;
          const cards = p.cards.map((c, i) => own || showAll || (!hideShown && i === p.shown) || i >= 3 ? c : null);
          return { id: p.id, name: p.name, ai: p.ai, chips: p.chips, put: p.put, out: p.out, folded: p.folded, stayed: p.stayed, shown: hideShown ? -1 : p.shown, picked: p.shown >= 0, cards }; }),
        bettor: bet ? currentBettor(S) : -1, high: S.bet ? S.bet.high : 0, toCall: me && S.bet ? Math.min(toCall(S, me), me.chips) : 0, maxTo: me && S.bet ? maxRaiseTo(S, me) : 0,
        hitTurn: S.phase === 'hit' && !hitsDone(S) ? S.hitTurn : -1, lastResult: showAll ? S.lastResult : null, winner: S.winner,
        left: S.deadline && MULTI.actor(S).includes(seat) ? Math.max(0, S.deadline - Date.now()) : 0, log: S.log.slice(-80) };
    },
  };

  const ENG = { MULTI, PROF, DECK, newGame, startRound, reveal, allRevealed, startBetting, betAction, bettingDone, currentBettor, startHits, hitAction, hitsDone, showdown, gameOver, aiReveal, aiBet, aiHit, inHand, alive, toCall, maxRaiseTo, sum };
  if (typeof module !== 'undefined' && module.exports) { module.exports = ENG; return; }
  if (typeof LAB === 'undefined') return;

  // ---------- 화면 ----------
  const { h, esc, seg } = LAB;
  LAB.add({
    id: 'hitstay', name: 'HIT, STAY', show: '데블스플랜',
    rules: `<ul>
      <li>숫자 카드 35장: <b>7×1, 6×2, 5×3, 4×4, 3×5, 2×6, 1×7, -1×7</b>. 각자 칩을 들고 시작해요(설정에서 정해요).</li>
      <li>라운드마다 모두 <b>기본 베팅</b>(1개, 10라운드마다 1개씩 늘어요)을 내고, 8면체 주사위로 <b>한계 숫자(5~12)</b>를 정해요.</li>
      <li>카드 3장씩 받고 그중 <b>공개할 1장</b>을 각자 몰래 골라요. 모두 고르면 <b>동시에 공개</b>돼요. 나머지 2장은 나만 봐요.</li>
      <li><b>1차 베팅</b>: 선부터 콜·레이즈·포기. 한 사람이 걸 수 있는 칩은 <b>칩이 가장 적은 사람의 칩 수</b>까지예요.</li>
      <li>선부터 돌아가며 카드를 더 받으면 <b>HIT</b>(공개), 그만 받으면 <b>STAY</b>. 모두 스테이하거나 카드가 떨어지면 <b>2차 베팅</b>.</li>
      <li>카드 합이 <b>한계 숫자 이하에서 가장 가까운</b> 사람이 판돈을 가져가요. 합이 같으면 카드가 많은 쪽, 한계를 넘으면 최하위. 그래도 같으면 나눠 갖고 남는 칩은 선에 가까운 사람이 가져요.</li>
      <li>칩이 0개가 되면 탈락. 마지막 1명이 남을 때까지 해요. 선은 매 라운드 왼쪽(다음 사람)으로 넘어가요.</li>
      <li>상대는 <b>AI</b> 또는 <b>사람</b>(각자 자기 기기로 같은 방에 들어와요, 2~5인). 온라인에서 빈자리는 AI가 채우고, 내 차례는 60초 안에 정해야 해요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      const roomLink = LAB.roomParam();
      LAB.paused = false;
      // 시작 화면·대기실은 모든 대결 게임 공통 (LAB.duelFront, 무거운13·슬리더링크와 같은 흐름)
      let pend = { n: 4, chips: 30, lv: 1, opp: 'ai' }, S = null, net = null, V = null, room = null, raiseTo = 0, shownMid = null, recvAt = 0, busy = false, ended = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dn-lobby" id="hsLobby" hidden></div>
          <div id="hsGame" hidden>
          <div class="hs-top"><div class="hs-die"><small>한계 숫자</small><b id="hsLimit">?</b></div><div class="hs-pot"><small>판돈</small><b id="hsPot">0</b></div><div class="hs-pot mine"><small>내 칩</small><b id="hsMine">0</b></div><div class="hs-info"><span id="hsRound"></span><small id="hsBase"></small><b class="hs-time" id="hsTime"></b></div></div>
          <div class="hs-seats" id="hsSeats"></div>
          <p class="g-msg" id="hsMsg"></p>
          <div class="hs-act" id="hsAct"></div>
          <div id="hsAgain"></div>
          </div>
        </div>
        <aside class="g-side">
          <div class="card"><h3>진행 기록</h3><div class="log" id="hsLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      const N_OPTS = { key: 'n', label: '인원', opts: [[2, '2인'], [3, '3인'], [4, '4인'], [5, '5인']], def: 4 }, C_OPTS = { key: 'chips', label: '시작 칩', opts: [[10, '10개'], [20, '20개'], [30, '30개'], [50, '50개']], def: 30 }, L_OPTS = { key: 'lv', label: 'AI 실력', opts: [[0, '쉬움'], [1, '보통'], [2, '어려움']], def: 1 };
      const front = LAB.duelFront({ el: $('hsLobby'), gameEl: $('hsGame'), friendLabel: '친구와 하기 (2~5인, 빈자리는 AI)', soloOpts: [{ ...N_OPTS, label: '인원 (나 + AI)' }, C_OPTS, L_OPTS], roomOpts: [N_OPTS, C_OPTS, L_OPTS],
        onStart: (mode, c) => { Object.assign(pend, c, { opp: mode }); start(); }, onLeave: () => reset() });
      function reset() { T.clear(); if (net) { net.close(); net = null; } S = null; V = null; room = null; ended = null; shownMid = null; $('hsLog').innerHTML = ''; }
      function start() {
        reset();
        if (pend.opp === 'net') {
          net = LAB.duel('hitstay', { front, el: $('hsLobby'), opts: () => ({ n: pend.n, chips: pend.chips, lv: pend.lv }),
            onView: v => { room = v; if (!v.st) return; recvAt = Date.now(); show(v.st); }, onError: m => { $('hsMsg').textContent = m; } });
          net.start(); T.every(() => V && paintTime(), 500); return;
        }
        const seats = [{ name: '나' }, ...['AI 1', 'AI 2', 'AI 3', 'AI 4'].slice(0, pend.n - 1).map(name => ({ name, bot: true }))];
        S = MULTI.init(null, { chips: pend.chips, lv: pend.lv, noTimeout: true }, seats);
        front.solo(`AI와 연습 · ${pend.n}인`);
        local(); T.every(() => { if (S && MULTI.tick(S, Date.now())) local(); }, 150);
      }
      function local() {
        show(MULTI.view(S, 0));
        if ((S.phase === 'over' || (S.players[0].out && S.phase === 'result')) && !ended) { ended = true; const me = S.players[0], rank = S.outOrder.includes(0) ? S.players.length - S.outOrder.indexOf(0) : 1;
          T.set(() => LAB.end(rank === 1 ? '1위 · 최종 생존' : '탈락', rank === 1 ? `${S.round}라운드 만에 마지막 1명으로 남았어요 · 칩 ${me.chips}개` : `칩을 모두 잃어 ${rank}위 (${S.players.length}명 중) · ${S.round}라운드`, start), 1200); }
      }
      async function send(a) {
        if (busy) return;
        if (net) { busy = true; await net.act(a); busy = false; return; }
        try { MULTI.act(S, 0, a); } catch (e) { $('hsMsg').textContent = e.message; return; }
        local();
      }
      function act(a) {
        const v = V; if (!v) return;
        if (a.startsWith('show')) return send({ type: 'reveal', i: +a.slice(4) });
        if (a === 'fold' || a === 'call') return send({ type: 'bet', act: a });
        if (a === 'raise') return send({ type: 'bet', act: 'raise', to: raiseTo });
        if (a === 'hit' || a === 'stay') return send({ type: 'hit', hit: a === 'hit' });
        if (a === 'rp') { raiseTo = Math.min(v.maxTo, raiseTo + 1); show(v); }
        if (a === 'rm') { raiseTo = Math.max(v.high + 1, raiseTo - 1); show(v); }
        if (a === 'rmax') { raiseTo = v.maxTo; show(v); }
        if (a === 'again') send({ type: 'again' });
      }
      wrap.addEventListener('change', e => { if (e.target.id !== 'hsRaiseIn' || !V) return; const n = Math.round(Number(e.target.value)); raiseTo = Math.max(V.high + 1, Math.min(V.maxTo, Number.isFinite(n) ? n : raiseTo)); show(V); });
      wrap.addEventListener('keydown', e => { if (e.target.id === 'hsRaiseIn' && e.key === 'Enter') e.target.blur(); });
      wrap.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b && !b.disabled && wrap.contains(b)) act(b.dataset.a); });
      function paintTime() { const s = V.left ? Math.max(0, Math.ceil((V.left - (Date.now() - recvAt)) / 1000)) : 0; $('hsTime').textContent = s ? `내 차례 ${s}초` : ''; $('hsTime').classList.toggle('warn', s > 0 && s <= 10); }

      const card = (v, cls = '', attrs = '') => `<span class="hsc ${v < 0 ? 'neg' : ''} ${cls}" ${attrs}>${v == null ? '' : v}</span>`;
      let lastBetKey = '';
      function show(v) {
        V = v; const ME = v.me, P = v.players, me = P[ME], name = id => id === ME ? '나' : P[id].name;
        if (v.mid && v.mid !== shownMid) { shownMid = v.mid; LAB.coin(P.map(p => p.id === ME ? '나' : p.name), v.first, { title: '선 플레이어 추첨', suffix: '선' }); }
        const betKey = v.round + ':' + v.phase + ':' + v.high; if (v.bettor === ME && betKey !== lastBetKey) { lastBetKey = betKey; raiseTo = Math.min(v.maxTo, v.high + 1); }
        const showAll = v.phase === 'result' || v.phase === 'over', R = v.lastResult;
        $('hsLimit').textContent = v.limit ?? '?'; $('hsPot').textContent = v.pot; $('hsMine').textContent = me.chips;
        $('hsRound').textContent = v.phase === 'over' ? '게임 끝' : `${v.round}라운드`; $('hsBase').textContent = `기본 베팅 ${v.base} · 최대 ${v.cap}개 · 남은 카드 ${v.deckLeft}장`;
        paintTime();
        $('hsSeats').innerHTML = P.map(p => {
          const isMe = p.id === ME, vis = p.cards.filter(c => c != null);
          const sumTxt = isMe || showAll ? `합 ${ENG.sum(p.cards)}` : ''; // 다른 사람은 공개된 카드만 보여 주고 합은 계산해 주지 않음
          const cards = p.cards.map((c, i) => {
            const pick = isMe && v.phase === 'reveal' && p.shown < 0 && i < 3;
            if (pick) return `<button type="button" class="hsc pick ${c < 0 ? 'neg' : ''}" data-a="show${i}">${c}</button>`;
            return c != null ? card(c, `${isMe && i < 3 && i !== p.shown ? 'secret' : ''} ${i >= 3 ? 'hit' : ''}`) : card(null, 'back');
          }).join('');
          const st = p.out ? '탈락' : p.folded ? '포기' : p.stayed ? 'STAY' : v.phase === 'reveal' ? (p.picked ? '선택 완료' : '고르는 중') : '';
          const turn = !p.out && (v.hitTurn === p.id || v.bettor === p.id || (v.phase === 'reveal' && !p.picked));
          const won = R && v.phase === 'result' && R.winners.includes(p.id);
          const over = (isMe || showAll) && p.cards.length && ENG.sum(p.cards) > v.limit;
          const off = room && room.players && room.players[p.id] && !room.players[p.id].online;
          return `<div class="hs-seat ${isMe ? 'me' : ''} ${p.out ? 'out' : ''} ${p.folded && !p.out ? 'fold' : ''} ${turn ? 'turn' : ''} ${won ? 'won' : ''}">
            <div class="hs-name"><b>${esc(isMe ? (net ? p.name + ' (나)' : '나') : p.name)}</b>${v.first === p.id ? '<span class="tag">선</span>' : ''}${off ? '<span class="st">연결 끊김</span>' : st ? `<span class="st">${st}</span>` : ''}</div>
            <div class="hs-chips">칩 <b>${p.chips}</b>${p.put ? ` · 건 칩 ${p.put}` : ''}${won ? ` · <b class="plus">+${R.got[p.id]}</b>` : ''}</div>
            <div class="hs-cards">${cards}</div>
            <div class="hs-sum ${over ? 'bust' : ''}">${p.out ? '' : sumTxt}${over ? ' · 초과' : ''}</div></div>`;
        }).join('');
        let a = '', msg = '';
        if (v.phase === 'over') msg = v.winner === ME ? '최종 생존! 1위예요' : v.winner >= 0 ? `${P[v.winner].name} 최종 생존` : '게임 끝';
        else if (me.out) msg = '탈락했어요 · 남은 사람들의 게임을 지켜보는 중';
        else if (v.phase === 'reveal') msg = me.shown < 0 ? '세 장 중 모두에게 공개할 카드 1장을 누르세요 (모두 고르면 동시에 공개)' : '다른 사람들이 고르는 중… 모두 고르면 동시에 공개돼요';
        else if (v.bettor === ME) {
          const maxTo = v.maxTo;
          msg = `${v.phase === 'bet1' ? '1차' : '2차'} 베팅 — 내 차례`;
          a = `<button type="button" data-a="fold">포기</button><button type="button" class="primary" data-a="call">${v.toCall ? `콜 (${v.toCall}개)` : '체크'}</button>` +
            (maxTo > v.high ? `<span class="hs-raise"><button type="button" data-a="rm" aria-label="1개 빼기" ${raiseTo <= v.high + 1 ? 'disabled' : ''}>−</button><input type="number" id="hsRaiseIn" inputmode="numeric" min="${v.high + 1}" max="${maxTo}" value="${raiseTo}" aria-label="레이즈 후 총 칩 수"><button type="button" data-a="rp" aria-label="1개 더하기" ${raiseTo >= maxTo ? 'disabled' : ''}>+</button><button type="button" data-a="rmax" ${raiseTo >= maxTo ? 'disabled' : ''}>최대 ${maxTo}</button><button type="button" class="primary" data-a="raise">레이즈 → 총 ${raiseTo}개</button></span>
              <p class="hs-cap">이번 라운드에 한 사람이 걸 수 있는 칩은 총 ${v.cap}개까지예요 (라운드 시작 때 칩이 가장 적은 사람 기준)${maxTo < v.cap ? ` · 내 남은 칩으로는 총 ${maxTo}개까지` : ''}</p>` : `<span class="muted">더 올릴 수 없어요 (이번 라운드 최대 ${v.cap}개)</span>`);
        }
        else if (v.hitTurn === ME) { msg = `카드를 더 받을까요? 내 합 ${ENG.sum(me.cards)} / 한계 ${v.limit}`; a = `<button type="button" class="primary" data-a="hit">HIT (한 장 더)</button><button type="button" data-a="stay">STAY (그만)</button>`; }
        else if (v.phase === 'result' && R) msg = R.winners.includes(ME) ? (R.winners.length > 1 ? `무승부 — 판돈을 나눠 ${R.got[ME]}개 받았어요` : `이겼어요! 판돈 ${R.pot}개를 가져왔어요`) : R.single ? `${name(R.winners[0])}만 남아 판돈을 가져갔어요` : `${R.winners.map(name).join('·')} 승리`;
        else if (me.folded) msg = '이번 라운드는 포기했어요';
        else msg = v.hitTurn >= 0 ? `${P[v.hitTurn].name} 고르는 중…` : v.bettor >= 0 ? `${P[v.bettor].name} 베팅 중…` : '';
        $('hsMsg').textContent = msg; $('hsAct').innerHTML = a;
        // 온라인: 끝나면 다시 하기 (사람 모두 눌러야 새 판)
        let ag = '';
        if (room && v.phase === 'over') { const mine = room.players[ME].again, wait = room.players.filter(p => p && !p.bot && !p.again).map(p => p.name);
          ag = `<div class="dn-again">${mine ? `<span class="muted">${esc(wait.join(', '))} 기다리는 중…</span>` : '<button type="button" class="primary" data-a="again">다시 하기</button>'}</div>`; }
        $('hsAgain').innerHTML = ag;
        $('hsLog').innerHTML = v.log.slice(-80).reverse().map(x => `<span>${esc(x)}</span>`).join('');
      }
      if (roomLink) { pend.opp = 'net'; start(); } else front.menu();
      return () => { T.clear(); if (net) net.close(); };
    }
  });
})();
