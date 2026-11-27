// 수식 하이 로우 (데블스플랜) — 숫자·기호 카드로 20(하이) 또는 1(로우)에 가까운 수식을 만들고 베팅
// 숫자 카드 0~10 × 금·은·동·흑(가치 순) 44장 + 루트 4장 + 곱하기 4장. 각자 +, −, ÷ 카드를 한 장씩 가짐
(function () {
  const rnd = n => Math.floor(Math.random() * n);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const fail = m => { const e = new Error(m); e.duel = true; throw e; };
  const COL = ['흑', '동', '은', '금']; // 0이 가장 낮음
  const T_BET = 45000, T_BUILD = 90000, T_RES = 9000;
  // 카드: {k:'n', v, c} 숫자 / {k:'r'} 루트 / {k:'x'} 곱하기
  const newDeck = () => { const d = []; for (let v = 0; v <= 10; v++) for (let c = 0; c < 4; c++) d.push({ k: 'n', v, c }); for (let i = 0; i < 4; i++) { d.push({ k: 'r' }); d.push({ k: 'x' }); } return shuffle(d); };
  const OPS = { '+': (a, b) => a + b, '-': (a, b) => a - b, '×': (a, b) => a * b, '÷': (a, b) => b === 0 ? NaN : a / b };
  // 수식 값: nums 4개(루트 표시 r), ops 3개, 곱셈·나눗셈 먼저. 0으로 나누면 무한(NaN 처리)
  function evalF(nums, ops) {
    const v = nums.map(x => x.r ? Math.sqrt(x.v) : x.v), o = ops.slice();
    for (let i = 0; i < o.length;) { if (o[i] === '×' || o[i] === '÷') { const r = OPS[o[i]](v[i], v[i + 1]); if (Number.isNaN(r)) return Infinity; v.splice(i, 2, r); o.splice(i, 1); } else i++; }
    let r = v[0]; for (let i = 0; i < o.length; i++) r = OPS[o[i]](r, v[i + 1]); return r;
  }
  const perms = a => a.length <= 1 ? [a] : a.flatMap((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).map(p => [x, ...p]));
  // 가진 카드로 만들 수 있는 모든 수식 중 하이·로우 가장 가까운 것
  function bestForms(hand) {
    const nums = hand.nums, ops = hand.ops, root = hand.root; let hi = null, lo = null;
    const ip = perms(nums.map((_, i) => i)), op = [...new Set(perms(ops).map(x => x.join('|')))].map(x => x.split('|'));
    for (const p of ip) for (const o of op) for (let r = root ? 0 : -1; r < (root ? 4 : 0); r++) {
      const ns = p.map((i, k) => ({ v: nums[i].v, r: k === r })), val = evalF(ns, o);
      const f = { order: p, ops: o, root: r, val };
      if (Number.isFinite(val)) { if (!hi || Math.abs(val - 20) < Math.abs(hi.val - 20)) hi = f; if (!lo || Math.abs(val - 1) < Math.abs(lo.val - 1)) lo = f; }
    }
    return { hi, lo };
  }
  const AI_SKILL = [.5, .8, 1];

  const MULTI = {
    seats: o => Math.max(4, Math.min(8, Number(o && o.n) || 5)),
    init(prev, o, seats) {
      const lv = [0, 1, 2].includes(Number(o && o.lv)) ? Number(o.lv) : 1, chips = [10, 20, 30].includes(Number(o && o.chips)) ? Number(o.chips) : 20;
      const S = { mid: Math.random().toString(36).slice(2, 9), lv, round: 0, first: rnd(seats.length), phase: 'gap', at: Date.now() + 3500, deadline: 0, outOrder: [], winner: -1,
        players: seats.map((x, i) => ({ id: i, name: x.name, bot: !!x.bot, chips, out: false, put: 0, open: [], ops: ['+', '-', '÷'], root: false, hidden: null })), log: [] };
      S.log.push(`추첨으로 선: ${S.players[S.first].name}`);
      return S;
    },
    alive: S => S.players.filter(p => !p.out),
    inHand: S => S.players.filter(p => !p.out && !p.folded),
    draw(S, numOnly) { for (;;) { if (!S.deck.length) S.deck = newDeck(); const c = S.deck.pop(); if (!numOnly || c.k === 'n') return c; } },
    // 오픈 카드 한 장 받기: 기호면 처리 후 숫자 한 장 더 (기호는 한 사람당 한 번만)
    deal(S, p) {
      const c = MULTI.draw(S, p.sym); // 이미 기호를 받았으면 숫자가 나올 때까지
      if (c.k === 'n') { p.open.push(c); return; }
      p.sym = c.k;
      if (c.k === 'r') { p.root = true; S.log.push(`${p.name}: 루트 카드! 숫자 한 장 더`); }
      else { const drop = p.bot || !p.dropPref ? (rnd(2) ? '+' : '-') : p.dropPref; p.ops = p.ops.filter(x => x !== drop).concat('×'); S.log.push(`${p.name}: 곱하기 카드! ${drop === '+' ? '더하기' : '빼기'}를 버림`); }
      p.open.push(MULTI.draw(S, true));
    },
    startRound(S, now) {
      S.round++; S.deck = newDeck(); S.pot = 0;
      if (S.round > 1) { let f = S.first; do { f = (f + 1) % S.players.length; } while (S.players[f].out); S.first = f; }
      for (const p of S.players) { p.folded = p.out; p.put = 0; p.hidden = null; p.open = []; p.ops = ['+', '-', '÷']; p.root = false; p.sym = null; p.form = null; p.side = null; p.ready = false; p.res = null; }
      for (const p of MULTI.alive(S)) { const a = Math.min(1, p.chips); p.chips -= a; p.put += a; S.pot += a; p.hidden = MULTI.draw(S, true); }
      for (let k = 0; k < 2; k++) for (const p of MULTI.alive(S)) MULTI.deal(S, p);
      S.cap = Math.min(...MULTI.alive(S).map(p => p.chips + p.put));
      S.log.push(`— ${S.round}라운드 · 선 ${S.players[S.first].name}`);
      MULTI.startBet(S, 'bet1', now);
    },
    startBet(S, ph, now) {
      S.phase = ph; const order = []; for (let k = 0; k < S.players.length; k++) { const p = S.players[(S.first + k) % S.players.length]; if (!p.out && !p.folded) order.push(p.id); }
      S.bet = { high: Math.max(...MULTI.inHand(S).map(p => p.put)), queue: order.slice(), opened: false }; S.deadline = now + T_BET; S.at = now + 500;
    },
    betDone: S => !S.bet.queue.length || MULTI.inHand(S).length <= 1,
    act(S, seat, a, now = Date.now()) {
      const p = S.players[seat]; if (!p || p.out) fail('탈락해서 행동할 수 없어요.');
      if (a.type === 'bet') {
        if (!(S.phase === 'bet1' || S.phase === 'bet2') || S.bet.queue[0] !== seat) fail('내 베팅 차례가 아니에요.');
        const call = S.bet.high - p.put;
        if (a.act === 'pass') { if (call > 0 || S.bet.opened) fail('이미 베팅이 시작돼서 넘길 수 없어요.'); S.log.push(`${p.name}: 패스`); }
        else if (a.act === 'call') { const x = Math.min(call, p.chips); p.chips -= x; p.put += x; S.pot += x; S.bet.opened = S.bet.opened || x > 0; S.log.push(`${p.name}: 콜${x ? ' ' + x : ''}`); }
        else if (a.act === 'raise') { const to = Math.round(Number(a.to)); if (!(to > S.bet.high && to <= Math.min(S.cap, p.put + p.chips))) fail('올릴 수 있는 칩 수가 아니에요.'); const x = to - p.put; p.chips -= x; p.put = to; S.pot += x; S.bet.high = to; S.bet.opened = true;
          S.log.push(`${p.name}: 레이즈 → ${to}`); S.bet.queue = []; for (let k = 1; k < S.players.length; k++) { const q = S.players[(seat + k) % S.players.length]; if (!q.out && !q.folded && q.chips > 0) S.bet.queue.push(q.id); } S.bet.queue.unshift(seat); }
        else if (a.act === 'die') { p.folded = true; S.log.push(`${p.name}: 다이`); }
        else fail('알 수 없는 베팅이에요.');
        S.bet.queue.shift(); S.deadline = now + T_BET; S.at = now + 300; return;
      }
      if (a.type === 'drop') { p.dropPref = a.op === '-' ? '-' : '+'; return; }
      if (a.type === 'build') {
        if (S.phase !== 'build' || p.folded) fail('지금은 수식을 낼 수 없어요.');
        const side = ['hi', 'lo', 'swing'].includes(a.side) ? a.side : fail('하이·로우·스윙 중 고르세요.');
        const chk = f => { if (!f || !Array.isArray(f.order) || !Array.isArray(f.ops)) fail('수식을 완성하세요.');
          const ord = f.order.map(Number); if (ord.length !== 4 || new Set(ord).size !== 4 || ord.some(i => !(i >= 0 && i < 4))) fail('숫자 카드 4장을 모두 쓰세요.');
          const want = p.ops.slice().sort().join(), got = f.ops.slice().sort().join(); if (f.ops.length !== 3 || want !== got) fail('기호 카드 3장을 모두 쓰세요.');
          const r = f.root == null || f.root < 0 ? -1 : Number(f.root); if (r >= 0 && !p.root) fail('루트 카드가 없어요.'); if (p.root && !(r >= 0 && r < 4)) fail('루트를 씌울 숫자를 고르세요.');
          const nums = MULTI.nums(p); return { order: ord, ops: f.ops.slice(), root: r, val: evalF(ord.map((i, k) => ({ v: nums[i].v, r: k === r })), f.ops) }; };
        p.form = side === 'swing' ? [chk(a.f1), chk(a.f2)] : [chk(a.f1)]; p.side = side; p.ready = true; return;
      }
      fail('알 수 없는 행동이에요.');
    },
    nums: p => [p.hidden, ...p.open],
    aiBet(S, p) {
      const hand = { nums: MULTI.nums(p).slice(0, 4), ops: p.ops, root: p.root };
      let q = 0.5;
      if (hand.nums.length === 4) { const b = bestForms(hand); const d = Math.min(Math.abs((b.hi ? b.hi.val : 99) - 20), Math.abs((b.lo ? b.lo.val : 99) - 1)); q = d < .3 ? .95 : d < 1 ? .75 : d < 2.5 ? .5 : .25; }
      else q = .5 + (Math.random() - .5) * .3;
      q = q * AI_SKILL[S.lv] + Math.random() * (1 - AI_SKILL[S.lv]);
      const call = S.bet.high - p.put, canRaise = Math.min(S.cap, p.put + p.chips) > S.bet.high;
      if (q > .8 && canRaise && Math.random() < .6) return { type: 'bet', act: 'raise', to: Math.min(Math.min(S.cap, p.put + p.chips), S.bet.high + 1 + rnd(3)) };
      if (call === 0) return { type: 'bet', act: S.bet.opened ? 'call' : 'pass' };
      if (q < .3 && call > 1 && Math.random() < .7) return { type: 'bet', act: 'die' };
      return { type: 'bet', act: 'call' };
    },
    aiBuild(S, p) {
      const hand = { nums: MULTI.nums(p), ops: p.ops, root: p.root }, b = bestForms(hand);
      const dh = b.hi ? Math.abs(b.hi.val - 20) : 99, dl = b.lo ? Math.abs(b.lo.val - 1) : 99;
      const f = x => ({ order: x.order, ops: x.ops, root: x.root });
      if (dh < .01 && dl < .01 && S.lv >= 1) return { type: 'build', side: 'swing', f1: f(b.hi), f2: f(b.lo) };
      return dh / 20 < dl ? { type: 'build', side: 'hi', f1: f(b.hi) } : { type: 'build', side: 'lo', f1: f(b.lo) };
    },
    showdown(S, now) {
      const live = MULTI.inHand(S), pot = S.pot; let got = {};
      const maxCard = p => MULTI.nums(p).reduce((m, c) => !m || c.v > m.v || (c.v === m.v && c.c > m.c) ? c : m, null);
      const minCard = p => MULTI.nums(p).reduce((m, c) => !m || c.v < m.v || (c.v === m.v && c.c < m.c) ? c : m, null);
      const dist = (f, t) => Number.isFinite(f.val) ? Math.abs(f.val - t) : Infinity;
      const pick = (cands, t, tie) => { let best = null; for (const [p, f] of cands) { const d = dist(f, t); if (!best || d < best.d - 1e-9 || (Math.abs(d - best.d) < 1e-9 && tie(p, best.p) > 0)) best = { p, d }; } return best ? best.p : null; };
      const hiTie = (a, b) => { const x = maxCard(a), y = maxCard(b); return x.v - y.v || x.c - y.c; }, loTie = (a, b) => { const x = minCard(a), y = minCard(b); return y.v - x.v || y.c - x.c; };
      let hiW = null, loW = null;
      if (live.length === 1) { got[live[0].id] = pot; S.res = { single: live[0].id, pot }; }
      else {
        const hiC = live.filter(p => p.side === 'hi' || p.side === 'swing').map(p => [p, p.form[0]]), loC = live.filter(p => p.side === 'lo' || p.side === 'swing').map(p => [p, p.side === 'swing' ? p.form[1] : p.form[0]]);
        hiW = pick(hiC, 20, hiTie); loW = pick(loC, 1, loTie);
        // 스윙은 양쪽 모두 이겨야 함. 하나라도 지면 실패 → 그 사람을 빼고 다시 가림
        const swingFail = p => p && p.side === 'swing' && !(hiW === p && loW === p);
        if (swingFail(hiW) || swingFail(loW)) { const bad = new Set([hiW, loW].filter(swingFail)); hiW = pick(hiC.filter(([p]) => !bad.has(p)), 20, hiTie); loW = pick(loC.filter(([p]) => !bad.has(p)), 1, loTie); }
        if (hiW && loW) { const half = Math.floor(pot / 2); got[hiW.id] = (got[hiW.id] || 0) + half; got[loW.id] = (got[loW.id] || 0) + half; }
        else if (hiW || loW) got[(hiW || loW).id] = pot;
        S.res = { hi: hiW ? hiW.id : null, lo: loW ? loW.id : null, pot };
      }
      for (const [id, x] of Object.entries(got)) S.players[id].chips += x;
      S.log.push(S.res.single != null ? `${S.players[S.res.single].name}: 혼자 남아 ${pot}개` : `하이 ${hiW ? hiW.name : '없음'} · 로우 ${loW ? loW.name : '없음'} · 판돈 ${pot}`);
      for (const p of S.players) if (!p.out && p.chips <= 0) { p.out = true; S.outOrder.push(p.id); S.log.push(`${p.name} 탈락`); }
      S.phase = 'result'; S.at = now + T_RES; S.deadline = 0;
      const n = S.players.length, end = MULTI.alive(S).length <= Math.min(3, n - 1);
      if (end) { S.phase = 'over'; const a = MULTI.alive(S).sort((x, y) => y.chips - x.chips); S.winner = a[0].id; S.log.push(`게임 끝 · 남은 사람: ${a.map(p => p.name).join(', ')}`); }
    },
    tick(S, now = Date.now()) {
      if (S.phase === 'over') return false;
      if (S.at && now < S.at) return false;
      if (S.phase === 'gap' || S.phase === 'result') { MULTI.startRound(S, now); return true; }
      if (S.phase === 'bet1' || S.phase === 'bet2') {
        if (MULTI.betDone(S)) {
          if (MULTI.inHand(S).length <= 1) { MULTI.showdown(S, now); return true; }
          if (S.phase === 'bet1') { for (const p of MULTI.inHand(S)) MULTI.deal(S, p); MULTI.startBet(S, 'bet2', now); return true; }
          S.phase = 'build'; S.deadline = now + T_BUILD; S.at = now + 300; for (const p of MULTI.inHand(S)) if (p.bot) MULTI.act(S, p.id, MULTI.aiBuild(S, p), now); return true;
        }
        const p = S.players[S.bet.queue[0]];
        if (p.folded || p.out || p.chips <= 0) { S.bet.queue.shift(); return true; }
        if (p.bot) { MULTI.act(S, p.id, MULTI.aiBet(S, p), now); S.at = now + 700; return true; }
        if (now >= S.deadline) { const call = S.bet.high - p.put; MULTI.act(S, p.id, { type: 'bet', act: call > 0 ? 'die' : S.bet.opened ? 'call' : 'pass' }, now); S.log.push(`${p.name}: 시간 초과`); return true; }
        return false;
      }
      if (S.phase === 'build') {
        if (MULTI.inHand(S).every(p => p.ready) || now >= S.deadline) {
          for (const p of MULTI.inHand(S)) if (!p.ready) { MULTI.act(S, p.id, MULTI.aiBuild(S, p), now); S.log.push(`${p.name}: 시간 초과 → 자동으로 수식을 냄`); }
          MULTI.showdown(S, now); return true;
        }
        return false;
      }
      return false;
    },
    view(S, seat) {
      const now = Date.now(), me = S.players[seat], open = S.phase === 'result' || S.phase === 'over';
      return { mid: S.mid, me: seat, phase: S.phase, round: S.round, first: S.first, pot: S.pot, cap: S.cap, left: Math.max(0, (S.deadline || 0) - now), res: open ? S.res : null, winner: S.winner,
        bettor: (S.phase === 'bet1' || S.phase === 'bet2') && S.bet && S.bet.queue.length ? S.bet.queue[0] : -1, high: S.bet ? S.bet.high : 0, opened: S.bet ? S.bet.opened : false,
        players: S.players.map(p => ({ id: p.id, name: p.name, bot: p.bot, chips: p.chips, put: p.put, out: p.out, folded: p.folded, ready: !!p.ready, open: p.open || [], ops: p.ops, root: p.root,
          hidden: p.id === seat || open ? p.hidden : null, side: open ? p.side : null, form: open ? p.form : null })), log: S.log.slice(-60) };
    },
  };
  const ENG = { MULTI, evalF, bestForms };
  if (typeof module !== 'undefined' && module.exports) { module.exports = ENG; return; }
  if (typeof LAB === 'undefined') return;

  const { h, esc } = LAB;
  const ncard = (c, cls = '', attrs = '') => c == null ? `<span class="hl-c back ${cls}" ${attrs}></span>` : `<span class="hl-c c${c.c} ${cls}" ${attrs}><b>${c.v}</b></span>`;
  const fmtV = v => !Number.isFinite(v) ? '∞' : Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(3).replace(/0+$/, '');
  const formStr = (nums, f) => f.order.map((i, k) => (k === f.root ? '√' : '') + nums[i].v + (k < 3 ? ' ' + f.ops[k] + ' ' : '')).join('');
  LAB.add({
    id: 'hilo', name: '수식 하이 로우', show: '데블스플랜',
    rules: `<ul>
      <li>숫자 카드와 기호 카드로 <b>20(하이)</b> 또는 <b>1(로우)</b>에 가까운 수식을 만들고, 결과에 따라 하이·로우를 골라 베팅하는 게임이에요. 4~8인.</li>
      <li>모두 <b>+, −, ÷</b> 카드를 한 장씩 가져요. 숫자 카드는 0~10이 <b>금·은·동·흑</b> 4색 한 벌씩(44장), 여기에 <b>√</b> 4장과 <b>×</b> 4장을 섞어요.</li>
      <li>기본 베팅 1개 → <b>히든 카드</b> 1장(나만 봐요, 숫자만) → <b>오픈 카드</b> 2장. 오픈으로 √가 나오면 숫자 한 장을 더 받고, ×가 나오면 +나 − 중 하나를 버리고 숫자 한 장을 더 받아요. 그 뒤로 나오는 기호는 버리고 숫자를 다시 받아요.</li>
      <li><b>1차 베팅</b>: 콜·레이즈·다이. 아무도 걸지 않았으면 패스도 돼요. 한 사람이 걸 수 있는 최대 칩은 <b>칩이 가장 적은 사람</b>의 칩 수까지.</li>
      <li>오픈 카드 1장을 더 받고 <b>최종 베팅</b>. 그다음 <b>90초</b> 동안 숫자 4장·기호 3장을 모두 써서 수식을 만들어요(×·÷ 먼저 계산, √는 숫자 하나에만). 0으로 나누면 무한이라 가장 멀어요.</li>
      <li><b>하이</b>(20에 가장 가까운 사람)와 <b>로우</b>(1에 가장 가까운 사람)가 판돈을 반씩 나눠요(홀수 칩은 버려요). <b>스윙</b>은 수식 2개로 양쪽 모두 이겨야 해요. 하나라도 지면 실패.</li>
      <li>동점이면 하이는 가장 높은 숫자 카드, 로우는 가장 낮은 숫자 카드로 가리고, 같으면 금›은›동›흑 색으로 가려요(로우는 낮은 색이 이겨요).</li>
      <li>칩을 모두 잃으면 탈락. <b>3명</b>이 남을 때까지 해요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers(); LAB.paused = false;
      let lastRoom = null, pend = { n: 5, lv: 1, chips: 20, opp: 'ai' }, S = null, net = null, V = null, recvAt = 0, busy = false, ended = false, shownMid = null, raiseTo = 0, B = null, fxKey = '';
      // 수식 만들기 상태: f1·f2 = { order: [숫자 순서], ops: [기호 순서], root }
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap"><div class="g-main card">
        <div class="dn-lobby" id="hlLobby" hidden></div>
        <div id="hlGame" hidden>
          <div class="qz-top"><span id="hlR"></span><b class="qz-time" id="hlTime"></b><span id="hlPot"></span></div>
          <div class="hl-seats" id="hlSeats"></div>
          <div class="hl-mine" id="hlMine"></div>
          <div class="hl-act" id="hlAct"></div>
          <p class="g-msg" id="hlMsg"></p>
          <div id="hlAgain"></div>
        </div></div>
        <aside class="g-side"><div class="card"><h3>진행 기록</h3><div class="log" id="hlLog"></div></div></aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      const N_OPTS = { key: 'n', label: '인원', opts: [[4, '4인'], [5, '5인'], [6, '6인'], [8, '8인']], def: 5 }, C_OPTS = { key: 'chips', label: '시작 칩', opts: [[10, '10개'], [20, '20개'], [30, '30개']], def: 20 }, L_OPTS = { key: 'lv', label: 'AI 실력', opts: [[0, '쉬움'], [1, '보통'], [2, '어려움']], def: 1 };
      const front = LAB.duelFront({ el: $('hlLobby'), gameEl: $('hlGame'), friendLabel: '친구와 하기 (4~8인, 빈자리는 AI)', soloLabel: 'AI와 하기',
        soloOpts: [{ ...N_OPTS, label: '인원 (나 + AI)' }, C_OPTS, L_OPTS], roomOpts: [N_OPTS, C_OPTS, L_OPTS], onStart: (mode, c) => { Object.assign(pend, c, { opp: mode }); start(); }, onLeave: () => reset() });
      function reset() { T.clear(); if (net) { net.close(); net = null; } S = null; V = null; ended = false; shownMid = null; B = null; fxKey = ''; $('hlLog').innerHTML = ''; }
      function start() {
        reset();
        if (pend.opp === 'net') { net = LAB.duel('hilo', { front, el: $('hlLobby'), opts: () => ({ n: pend.n, lv: pend.lv, chips: pend.chips }), onView: v => { lastRoom = v; if (!v.st) return; recvAt = Date.now(); show(v.st); }, onError: m => { $('hlMsg').textContent = m; } }); net.start(); }
        else {
          const seats = [{ name: '나' }, ...Array.from({ length: pend.n - 1 }, (_, k) => ({ name: 'AI ' + (k + 1), bot: true }))];
          S = MULTI.init(null, { lv: pend.lv, chips: pend.chips }, seats); S.at = Date.now() + 600;
          front.solo(`AI와 하기 · ${pend.n}인`);
          local(); T.every(() => { if (S && MULTI.tick(S, Date.now())) local(); }, 150);
        }
        T.every(paint, 300);
      }
      function local() { recvAt = Date.now(); show(MULTI.view(S, 0)); }
      async function send(a) { if (busy) return; if (net) { busy = true; const er = await net.act(a); busy = false; if (er) $('hlMsg').textContent = er; return; } try { MULTI.act(S, 0, a); } catch (e) { $('hlMsg').textContent = e.message; } local(); }
      const me = () => V.players[V.me], myNums = () => [me().hidden, ...me().open];
      const blank = () => ({ order: [], ops: [], root: -1 });
      wrap.addEventListener('click', e => {
        if (e.target.closest('[data-again]')) return send({ type: 'again' });
        const b = e.target.closest('[data-a]'); if (!b || b.disabled || !V) return; const a = b.dataset.a, x = b.dataset.v;
        if (a === 'pass' || a === 'call' || a === 'die') send({ type: 'bet', act: a });
        else if (a === 'raise') send({ type: 'bet', act: 'raise', to: raiseTo });
        else if (a === 'r+' || a === 'r-') { raiseTo = Math.max(V.high + 1, Math.min(Math.min(V.cap, me().put + me().chips), raiseTo + (a === 'r+' ? 1 : -1))); drawAct(); }
        else if (a === 'side') { B.side = x; drawAct(); }
        else if (a === 'tab') { B.tab = +x; drawAct(); }
        else if (a === 'n') { const f = B.f[B.tab], i = +x; if (f.order.includes(i)) { const k = f.order.indexOf(i); f.order.splice(k); f.ops.splice(Math.max(0, k - 1)); if (f.root >= f.order.length) f.root = -1; } else if (f.order.length === f.ops.length && f.order.length < 4) f.order.push(i); drawAct(); }
        else if (a === 'o') { const f = B.f[B.tab]; if (f.ops.length === f.order.length - 1 && f.ops.length < 3) { const used = f.ops.filter(o => o === x).length, have = me().ops.filter(o => o === x).length; if (used < have) f.ops.push(x); } drawAct(); }
        else if (a === 'rt') { const f = B.f[B.tab]; f.root = f.root === +x ? -1 : +x; drawAct(); }
        else if (a === 'clr') { B.f[B.tab] = blank(); drawAct(); }
        else if (a === 'auto') { const r = bestForms({ nums: myNums(), ops: me().ops, root: me().root }); const pick = (B.side === 'lo' || (B.side === 'swing' && B.tab === 1)) ? r.lo : r.hi; if (pick) B.f[B.tab] = { order: pick.order.slice(), ops: pick.ops.slice(), root: pick.root }; drawAct(); }
        else if (a === 'submit') { const f = B.f.map(z => ({ order: z.order, ops: z.ops, root: z.root })); send({ type: 'build', side: B.side, f1: f[0], f2: f[1] }); }
      });
      function paint() { if (!V) return; const s = Math.ceil(Math.max(0, V.left - (Date.now() - recvAt)) / 1000); $('hlTime').textContent = V.phase === 'build' ? `수식 ${s}초` : (V.phase === 'bet1' || V.phase === 'bet2') ? `${V.bettor === V.me ? '내 차례' : esc(V.players[V.bettor] ? V.players[V.bettor].name : '')} ${s}초` : ''; }
      function formView(f) {
        const nums = myNums(); if (!f.order.length) return '<span class="muted">숫자부터 눌러 수식을 만드세요</span>';
        let o = ''; f.order.forEach((i, k) => { o += `<button type="button" class="hl-fn ${f.root === k ? 'rt' : ''}" data-a="${me().root ? 'rt' : 'noop'}" data-v="${k}">${f.root === k ? '√' : ''}${nums[i].v}</button>`; if (k < f.ops.length) o += `<b class="hl-fo">${f.ops[k]}</b>`; });
        const done = f.order.length === 4 && f.ops.length === 3 && (!me().root || f.root >= 0);
        return o + (done ? `<span class="hl-eq">= ${fmtV(evalF(f.order.map((i, k) => ({ v: nums[i].v, r: k === f.root })), f.ops))}</span>` : '');
      }
      function drawAct() {
        const v = V; if (!v) return; const m = me();
        if ((v.phase === 'bet1' || v.phase === 'bet2') && v.bettor === v.me) {
          const call = v.high - m.put, max = Math.min(v.cap, m.put + m.chips); if (raiseTo <= v.high || raiseTo > max) raiseTo = Math.min(max, v.high + 1);
          $('hlAct').innerHTML = `<div class="hl-bet">${!v.opened && call === 0 ? '<button type="button" data-a="pass">패스</button>' : `<button type="button" data-a="call">${call > 0 ? `콜 ${Math.min(call, m.chips)}` : '콜'}</button>`}
            ${max > v.high ? `<span class="hl-raise"><button type="button" data-a="r-">−</button><b>${raiseTo}</b><button type="button" data-a="r+">+</button><button type="button" class="primary" data-a="raise">레이즈</button></span>` : ''}
            <button type="button" data-a="die">다이</button></div><p class="muted">최대 ${max}개까지 (칩이 가장 적은 사람 기준)</p>`;
          return;
        }
        if (v.phase === 'build' && !m.folded && !m.ready) {
          if (!B || B.round !== v.round) B = { round: v.round, side: 'hi', tab: 0, f: [blank(), blank()] };
          const nums = myNums(), f = B.f[B.tab];
          $('hlAct').innerHTML = `<div class="hl-build">
            <div class="hl-side">${[['hi', '하이 (20)'], ['lo', '로우 (1)'], ['swing', '스윙']].map(([k, l]) => `<button type="button" class="${B.side === k ? 'on' : ''}" data-a="side" data-v="${k}">${l}</button>`).join('')}</div>
            ${B.side === 'swing' ? `<div class="hl-side">${['하이 수식', '로우 수식'].map((l, k) => `<button type="button" class="${B.tab === k ? 'on' : ''}" data-a="tab" data-v="${k}">${l}</button>`).join('')}</div>` : ''}
            <div class="hl-form">${formView(f)}</div>
            <div class="hl-pool">${nums.map((c, i) => `<button type="button" class="hl-pb ${f.order.includes(i) ? 'used' : ''}" data-a="n" data-v="${i}">${ncard(c)}</button>`).join('')}</div>
            <div class="hl-pool ops">${[...new Set(m.ops)].map(o => `<button type="button" data-a="o" data-v="${o}" ${f.ops.filter(x => x === o).length >= m.ops.filter(x => x === o).length ? 'disabled' : ''}>${o}</button>`).join('')}</div>
            ${m.root ? '<p class="muted">√: 수식 속 숫자를 누르면 루트를 씌우거나 벗겨요</p>' : ''}
            <div class="row"><button type="button" data-a="clr">지우기</button><button type="button" class="primary" data-a="submit">내기</button></div></div>`;
          return;
        }
        $('hlAct').innerHTML = v.phase === 'build' ? `<span class="muted">${m.folded ? '이번 라운드는 다이했어요' : '수식을 냈어요. 다른 사람을 기다리는 중…'}</span>` : '';
      }
      function show(v) {
        V = v; const m = v.players[v.me], open = v.phase === 'result' || v.phase === 'over';
        if (v.mid !== shownMid) { shownMid = v.mid; fxKey = ''; }
        const key = v.round + ':' + v.phase;
        if (key !== fxKey && window.GameFX) { const was = fxKey; fxKey = key;
          if (v.phase === 'bet1' && v.round > 1) GameFX.banner(`ROUND ${v.round}`, `선: ${v.players[v.first].id === v.me ? '나' : v.players[v.first].name}`);
          if (open && was && v.res && v.res.single == null) { const inn = v.players.filter(p => !p.out && !p.folded && p.form);
            GameFX.reveal({ seats: inn.map(p => ({ name: p.name, me: p.id === v.me, items: p.form.map((f, k) => ({ html: `<span style="font:700 12px/1.2 'Noto Sans KR',sans-serif;padding:0 4px">${p.side === 'swing' ? (k ? '로우' : '하이') : p.side === 'hi' ? '하이' : '로우'}<br><span style="font-size:20px">${fmtV(f.val)}</span></span>`, style: 'min-width:64px' })) })),
              steps: [{ title: '수식 공개', ms: 400 }, { flip: 'all', ms: 900 }, { win: [v.res.hi, v.res.lo].filter(x => x != null).map(id => inn.findIndex(p => p.id === id)).filter(k => k >= 0), res: `하이 ${v.res.hi != null ? v.players[v.res.hi].name : '없음'} · 로우 ${v.res.lo != null ? v.players[v.res.lo].name : '없음'}`, ms: 800 }] }); }
        }
        $('hlR').textContent = v.round ? `${v.round}라운드` : '곧 시작해요'; $('hlPot').textContent = `판돈 ${v.pot ?? 0}`;
        $('hlSeats').innerHTML = v.players.filter(p => p.id !== v.me).map(p => `<div class="hl-seat ${p.out ? 'out' : p.folded ? 'fold' : ''} ${v.bettor === p.id ? 'turn' : ''}">
          <div class="hl-nm">${esc(p.name)}${p.id === v.first ? '<small>선</small>' : ''}<b>${p.chips}</b></div>
          <div class="hl-cards">${ncard(p.hidden)}${p.open.map(c => ncard(c)).join('')}</div>
          <div class="hl-st">${p.out ? '탈락' : p.folded ? '다이' : `낸 칩 ${p.put}${p.root ? ' · √' : ''}${p.ops.includes('×') ? ' · ×' : ''}`}${open && p.form ? ` · ${p.side === 'swing' ? '스윙' : p.side === 'hi' ? '하이' : '로우'} ${p.form.map(f => fmtV(f.val)).join(' / ')}` : v.phase === 'build' && !p.folded && !p.out ? (p.ready ? ' · 제출' : ' · 만드는 중') : ''}</div></div>`).join('');
        $('hlMine').innerHTML = m.out ? '<div class="muted">탈락했어요</div>' : `<div class="hl-nm">내 카드<b>칩 ${m.chips}</b><small>낸 칩 ${m.put}</small></div><div class="hl-cards big">${ncard(m.hidden, 'hid')}${m.open.map(c => ncard(c)).join('')}</div><div class="hl-ops">${m.ops.map(o => `<span>${o}</span>`).join('')}${m.root ? '<span>√</span>' : ''}</div>`;
        drawAct();
        $('hlMsg').textContent = v.phase === 'bet1' ? '1차 베팅' : v.phase === 'bet2' ? '최종 베팅' : v.phase === 'build' ? '숫자 4장과 기호 3장을 모두 써서 수식을 만드세요 (점선 테두리가 히든 카드)' : open && v.res ? (v.res.single != null ? `${v.players[v.res.single].name} 혼자 남아 판돈 ${v.res.pot}개` : `하이 ${v.res.hi != null ? v.players[v.res.hi].name : '없음'} · 로우 ${v.res.lo != null ? v.players[v.res.lo].name : '없음'} · 판돈 ${v.res.pot}`) : '';
        $('hlLog').innerHTML = v.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
        $('hlAgain').innerHTML = v.phase === 'over' && net ? LAB.againHtml(lastRoom, v.me) : '';
        if (v.phase === 'over' && !ended) { ended = true; T.set(() => LAB.end(m.out ? '탈락' : '생존', m.out ? `칩을 모두 잃었어요 · ${v.round}라운드` : `마지막까지 남았어요 · 칩 ${m.chips}개`, net ? null : start), 5000); }
      }
      if (LAB.roomParam()) { pend.opp = 'net'; start(); } else front.menu();
    },
  });
})();
